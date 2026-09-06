<template>
  <div class="WorkspaceLayout">
    <header :style="gnbStyle">
      <div class="container inner-gnb">
        <router-link class="brand" :to="workspaceProjectsTo">
          <Avatar
            :text="workspaceInitials"
            :label="workspaceName || 'Workspace'"
            :image-url="workspaceImageUrl"
            :size="28"
          />
          <span class="brand-text">{{ workspaceName || "워크스페이스" }}</span>
        </router-link>
        <nav class="mainnav">
          <router-link class="mainnav-link" :to="workspaceProjectsTo">
            <MaterialSymbol name="workspaces" :size="20" alt="" />
            <span>프로젝트</span>
          </router-link>
          <router-link class="mainnav-link" :to="workspaceBoardTo">
            <MaterialSymbol name="communication" :size="20" alt="" />
            <span>게시판</span>
          </router-link>
          <router-link class="mainnav-link" :to="workspaceRankTo">
            <MaterialSymbol name="social_leaderboard" :size="20" alt="" />
            <span>랭킹</span>
          </router-link>
        </nav>
        <nav class="utilnav">
          <router-link
            class="btn btn--icon"
            :to="workspaceSettingsTo"
            aria-label="설정"
            title="설정"
          >
            <MaterialSymbol name="settings" :size="18" alt="" />
          </router-link>
          <button
            type="button"
            class="btn btn--icon"
            aria-label="챗봇 열기"
            title="챗봇 열기"
            @click="toggleAssistantModal"
          >
            <MaterialSymbol name="smart_toy" :size="18" alt="" />
          </button>
          <AgentChatWidget
            :showTrigger="false"
            :menuAriaLabel="`${workspaceName || '워크스페이스'} AI`"
          />
          <ContextSwicher />
        </nav>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import ContextSwicher from "../../components/ContextSwicher.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import Avatar from "../../components/Avatar.vue";
import AgentChatWidget from "../../components/AgentChatWidget.vue";
import { toggleAssistantModal } from "../../lib/assistantModal";
import { recordRecentVisit } from "../../lib/recentVisits";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAppStore } from "../../stores/appStore";
import {
  applyThemeSeedToRoot,
  clearThemeSeedFromRoot,
  isPresetThemeId,
  resolveThemeSeed,
} from "../../lib/themeSeed";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const { gnbPreviewTheme } = storeToRefs(appStore);

const workspaceId = computed(() => route.params.workspaceId);
const workspaceRouteParams = computed(() => ({ workspaceId: workspaceId.value }));
const currentWorkspace = computed(() => {
  if (!workspaceId.value) return null;
  return workspaceStore.workspaceById[workspaceId.value] || null;
});
const workspaceName = computed(() => String(currentWorkspace.value?.name || ""));
const workspaceImageUrl = computed(() => String(currentWorkspace.value?.img_url || ""));
const workspaceInitials = computed(() => {
  const name = workspaceName.value;
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
});

const gnbTheme = computed(() => {
  const preview = gnbPreviewTheme.value;
  if (preview && typeof preview === "object") return preview;
  return currentWorkspace.value?.theme_json?.gnb || null;
});
const themeTokenId = computed(() => {
  const themeId = gnbTheme.value?.themeId;
  if (isPresetThemeId(themeId)) return themeId;
  return "";
});
const customThemeSeed = computed(() => resolveThemeSeed(gnbTheme.value));
const themeId = computed(() => {
  if (themeTokenId.value) return themeTokenId.value;
  if (customThemeSeed.value) return "custom";
  return "";
});

const gnbStyle = computed(() => {
  if (themeTokenId.value) {
    return {
      "--color-gnb-bg": `var(--theme-${themeTokenId.value}-bg)`,
      "--color-gnb-text": `var(--theme-${themeTokenId.value}-fg)`,
    };
  }

  if (customThemeSeed.value) {
    return {
      "--color-gnb-bg": "var(--theme-custom-bg)",
      "--color-gnb-text": "var(--theme-custom-fg)",
    };
  }

  const theme = gnbTheme.value;
  return {
    ...(theme?.background ? { "--color-gnb-bg": theme.background } : {}),
    ...(theme?.foreground ? { "--color-gnb-text": theme.foreground } : {}),
  };
});

const workspaceProjectsTo = computed(() => ({
  name: "workspace-projects",
  params: workspaceRouteParams.value,
}));
const workspaceBoardTo = computed(() => ({
  name: "workspace-board-root",
  params: workspaceRouteParams.value,
}));
const workspaceRankTo = computed(() => ({
  name: "workspace-rank",
  params: workspaceRouteParams.value,
}));
const workspaceSettingsTo = computed(() => ({
  name: "workspace-settings",
  params: workspaceRouteParams.value,
}));

const applyTheme = (value) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (!value) {
    clearThemeSeedFromRoot();
    root.removeAttribute("data-theme");
    root.removeAttribute("data-theme-source");
    return;
  }

  if (value === "custom" && customThemeSeed.value) {
    applyThemeSeedToRoot(customThemeSeed.value);
  } else {
    clearThemeSeedFromRoot();
  }

  root.setAttribute("data-theme", value);
  root.setAttribute("data-theme-source", "workspace");
};

watch(
  workspaceId,
  async (value) => {
    if (!value) return;
    if (workspaceStore.workspaceById[value]) return;
    await workspaceStore.fetchWorkspace(value);
  },
  { immediate: true }
);

watch(
  currentWorkspace,
  (value) => {
    if (!value?.id || !value?.name) return;
    recordRecentVisit({
      type: "workspace",
      id: value.id,
      name: value.name,
      imgUrl: value.img_url || "",
    });
  },
  { immediate: true }
);

watch(
  customThemeSeed,
  (value) => {
    if (themeId.value !== "custom") return;
    if (!value) return;
    applyThemeSeedToRoot(value);
  },
  { immediate: true }
);

watch(
  themeId,
  (value) => {
    applyTheme(value);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  const root = document.documentElement;
  clearThemeSeedFromRoot();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-theme-source");
});
</script>
