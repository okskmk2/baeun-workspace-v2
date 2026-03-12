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
          <router-link class="mainnav__link" :to="workspaceProjectsTo">프로젝트</router-link>
          <router-link class="mainnav__link" :to="workspaceBoardTo">게시판</router-link>
          <router-link class="mainnav__link" :to="workspaceRankTo">랭킹</router-link>
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
    "--color-gnb-bg": theme?.background || "#ffffff",
    "--color-gnb-text": theme?.foreground || "#111827",
  };
});

const workspaceProjectsTo = computed(() => ({
  name: "workspace-projects",
  params: workspaceRouteParams.value,
}));
const workspaceBoardTo = computed(() => ({
  name: "workspace-board",
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
  customThemeSeed,
  (value) => {
    if (!value) {
      clearThemeSeedFromRoot();
      return;
    }
    applyThemeSeedToRoot(value);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearThemeSeedFromRoot();
});
</script>
