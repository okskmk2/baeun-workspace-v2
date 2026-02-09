<template>
  <div class="ProjectLayout">
    <header :style="gnbStyle">
      <div class="left">
        <span class="projectName">{{
          projectName || t("layout.project.projectNameFallback")
        }}</span>
        <template v-if="projectId">
          <nav class="mainnav">
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/board`"
            >
              <MaterialSymbol name="view_kanban" :size="20" alt="" />
              <span>{{ t("layout.project.nav.board") }}</span>
            </router-link>
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/wiki`"
            >
              <MaterialSymbol name="menu_book" :size="20" alt="" />
              <span>{{ t("layout.project.nav.wiki") }}</span>
            </router-link>
            <router-link
              class="mainnav-link"
              :to="`/workspace/${workspaceId}/project/${projectId}/messenger`"
            >
              <MaterialSymbol name="chat_bubble" :size="20" alt="" />
              <span>{{ t("layout.project.nav.messenger") }}</span>
            </router-link>
          </nav>
        </template>
      </div>
      <nav class="utilnav">
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings`">{{
          t("layout.project.util.settings")
        }}</router-link>
        <router-link to="/account">
          <Avatar :text="accountInitials" :label="accountLabel" :size="32" />
        </router-link>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";
import MaterialSymbol from "../components/MaterialSymbol.vue";
import Avatar from "../components/Avatar.vue";

const { t } = useI18n();
const route = useRoute();
const projectMemberStore = useProjectMemberStore();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const { gnbPreviewTheme, currentUser } = storeToRefs(appStore);

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));
const currentProject = computed(() => {
  if (!projectId.value) return "";
  const list = projects.value || [];
  return list.find((project) => String(project.id) === String(projectId.value)) || null;
});
const projectName = computed(() => currentProject.value?.name || "");
const accountInitials = computed(() => {
  const name = currentUser.value?.name || "";
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
});
const accountLabel = computed(() => currentUser.value?.name || t("layout.project.util.account"));
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
    if (!value) return;
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
  font-size: 18px;
}

.mainnav-link:hover {
  background-color: color-mix(in srgb, var(--gnb-bg) 95%, var(--gnb-fg) 5%);
}
</style>
