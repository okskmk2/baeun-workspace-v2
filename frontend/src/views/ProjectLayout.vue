<template>
  <div class="ProjectLayout">
    <header :style="gnbStyle">
      <div class="left">
        <span class="projectName">{{
          projectName || t("layout.project.projectNameFallback")
        }}</span>
        <template v-if="projectId">
          <nav class="mainnav">
            <router-link class="mainnav-link" :to="`/project/${projectId}/wiki`">
              <MaterialSymbol name="menu_book" :size="20" alt="" />
              <span>{{ t("layout.project.nav.wiki") }}</span>
            </router-link>
            <router-link class="mainnav-link" :to="`/project/${projectId}/board`">
              <MaterialSymbol name="view_kanban" :size="20" alt="" />
              <span>{{ t("layout.project.nav.board") }}</span>
            </router-link>
            <router-link class="mainnav-link" :to="`/project/${projectId}/messenger`">
              <MaterialSymbol name="chat_bubble" :size="20" alt="" />
              <span>{{ t("layout.project.nav.messenger") }}</span>
            </router-link>
          </nav>
        </template>
      </div>

      <nav class="utilnav">
        <div class="project-search">
          <SearchInput
            v-model="searchQuery"
            :placeholder="t('layout.project.search.placeholder')"
            @focus="onSearchFocus"
            @blur="onSearchBlur"
          />
          <div v-if="showSearchPanel" class="search-results">
            <button
              v-for="result in searchResults"
              :key="`${result.type}-${result.id}`"
              type="button"
              class="search-result-item"
              @mousedown.prevent="onSelectResult(result)"
            >
              <span>{{ result.name }}</span>
              <span class="search-result-meta">
                <small>{{ getResultTypeLabel(result.type) }}</small>
                <small v-if="result.type === 'issue' && result.status" class="search-status-badge">
                  {{ getIssueStatusLabel(result.status) }}
                </small>
              </span>
            </button>
            <p v-if="hasSearchQuery && searchResults.length === 0" class="search-empty">
              {{ t("layout.project.search.empty") }}
            </p>
          </div>
        </div>
        <router-link
          v-if="canAccessProjectSettings"
          :to="`/project/${projectId}/settings`"
          class="btn btn--icon"
          :aria-label="t('layout.project.util.settings')"
          :title="t('layout.project.util.settings')"
        >
          <MaterialSymbol name="settings" :size="18" alt="" />
        </router-link>
        <AccountWorkspaceDropdown />
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import api from "../lib/axios";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";
import { useBoardStore } from "../stores/boardStore";
import { usePageStore } from "../stores/pageStore";
import { useChatStore } from "../stores/chatStore";
import { useProjectSearchStore } from "../stores/projectSearchStore";
import { convertSnakeToCamel } from "../lib/utils";
import MaterialSymbol from "../components/MaterialSymbol.vue";
import SearchInput from "../components/SearchInput.vue";
import AccountWorkspaceDropdown from "../components/AccountWorkspaceDropdown.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const projectMemberStore = useProjectMemberStore();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const boardStore = useBoardStore();
const pageStore = usePageStore();
const chatStore = useChatStore();
const projectSearchStore = useProjectSearchStore();
const { gnbPreviewTheme, currentUser } = storeToRefs(appStore);

const SEARCH_TYPE_TTLS = {
  board: 60 * 1000,
  page: 30 * 1000,
  channel: 60 * 1000,
  issue: 30 * 1000,
};

const projectId = computed(() => route.params.projectId);
const searchQuery = ref("");
const isSearchOpen = ref(false);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const currentProject = computed(() => {
  if (!projectId.value) return null;
  return workspaceStore.getProject(projectId.value);
});
const projectName = computed(() => currentProject.value?.name || "");
const currentUserId = computed(() => currentUser.value?.id);
const currentProjectRole = computed(() => {
  if (!currentUserId.value) return "";
  const found = projectMembers.value.find(
    (member) => String(member.id) === String(currentUserId.value)
  );
  return (found?.role_name || "").toUpperCase();
});
const canAccessProjectSettings = computed(() =>
  ["OWNER", "ADMIN"].includes(currentProjectRole.value)
);
const projectThemeMode = computed(() => {
  const theme = currentProject.value?.theme_json || {};
  return theme.mode || theme.theme?.mode || theme.colorScheme || "";
});
const themeTokenId = computed(() => {
  const preview = gnbPreviewTheme.value;
  const theme = currentProject.value?.theme_json?.gnb;
  return preview?.themeId || theme?.themeId || "";
});
const gnbStyle = computed(() => {
  if (themeTokenId.value) {
    return {
      "--gnb-bg": `var(--theme-${themeTokenId.value}-bg)`,
      "--gnb-fg": `var(--theme-${themeTokenId.value}-fg)`,
    };
  }
  const theme = currentProject.value?.theme_json?.gnb;
  const background = theme?.background || "#ffffff";
  const foreground = theme?.foreground || "#111827";
  return {
    "--gnb-bg": background,
    "--gnb-fg": foreground,
  };
});

const themeId = computed(() => {
  const mode = projectThemeMode.value;
  if (themeTokenId.value) return themeTokenId.value;
  if (mode === "dark" || mode === "light") return mode;
  return "";
});
const hasSearchQuery = computed(() => String(searchQuery.value || "").trim().length > 0);
const searchResults = computed(() => {
  if (!projectId.value) return [];
  return projectSearchStore.search(projectId.value, searchQuery.value, { limit: 10 });
});
const showSearchPanel = computed(() => isSearchOpen.value && hasSearchQuery.value);

const refreshSearchSources = async () => {
  if (!projectId.value) return;

  await projectSearchStore.refreshStaleTypes(projectId.value, {
    ttls: SEARCH_TYPE_TTLS,
    fetchers: {
      board: async () => {
        await boardStore.fetchBoards(projectId.value);
        projectSearchStore.upsertBoards(projectId.value, boardStore.getBoards(projectId.value));
      },
      page: async () => {
        await pageStore.fetchPages(projectId.value);
        projectSearchStore.upsertPages(projectId.value, pageStore.getPages(projectId.value));
      },
      channel: async () => {
        await chatStore.fetchRooms(projectId.value);
        projectSearchStore.upsertChannels(projectId.value, chatStore.getRooms(projectId.value));
      },
      issue: async () => {
        const res = await api.get("/issues/recent", {
          params: { project_id: projectId.value },
        });
        projectSearchStore.upsertIssues(projectId.value, res.data || []);
      },
    },
  });
};

const onSearchFocus = async () => {
  isSearchOpen.value = true;
  await projectSearchStore.hydrateFromCache();
  await refreshSearchSources();
};

const onSearchBlur = () => {
  window.setTimeout(() => {
    isSearchOpen.value = false;
  }, 100);
};

const getResultTypeLabel = (type) => {
  if (type === "board") return t("layout.project.search.types.board");
  if (type === "page") return t("layout.project.search.types.page");
  if (type === "channel") return t("layout.project.search.types.channel");
  if (type === "issue") return t("layout.project.search.types.issue");
  return type;
};

const getIssueStatusLabel = (status) => {
  const key = convertSnakeToCamel(status || "");
  return t(`issue.status.${key}`);
};

const onSelectResult = (result) => {
  if (!result?.route) return;
  router.push(result.route);
  isSearchOpen.value = false;
};

const applySystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const nextTheme = query.matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
};

const applyTheme = (value) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!value) {
    root.removeAttribute("data-theme-source");
    applySystemTheme();
    return;
  }
  root.setAttribute("data-theme", value);
  root.setAttribute("data-theme-source", "project");
};

watch(
  themeId,
  (value) => {
    applyTheme(value);
  },
  { immediate: true }
);

watch(
  projectId,
  (value) => {
    searchQuery.value = "";
    isSearchOpen.value = false;
    if (!value) return;
    workspaceStore.fetchProjectDetail(value);
    projectMemberStore.fetchProjectMembers(value);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  applyTheme("");
});
</script>

<style scoped>
.projectName {
  font-weight: 600;
  font-size: 20px;
  text-transform: capitalize;
}

.mainnav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 4px;
  color: var(--gnb-fg);
  text-decoration: none;
  line-height: 1;
  font-weight: bold;
}

.mainnav-link:hover {
  background-color: color-mix(in srgb, var(--gnb-bg) 95%, var(--gnb-fg) 5%);
}

.project-search {
  position: relative;
}

.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 50;
  width: 280px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.search-result-item {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: var(--color-surface-muted);
}

.search-result-item small {
  color: var(--color-text-muted);
}

.search-result-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.search-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: var(--color-surface-muted);
}

.search-empty {
  margin: 0;
  padding: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
