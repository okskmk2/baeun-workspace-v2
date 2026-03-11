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
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import ContextSwicher from "../../components/ContextSwicher.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import Avatar from "../../components/Avatar.vue";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAppStore } from "../../stores/appStore";

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

const themeTokenId = computed(() => {
  const preview = gnbPreviewTheme.value;
  const theme = currentWorkspace.value?.theme_json?.gnb;
  return preview?.themeId || theme?.themeId || "";
});

const gnbStyle = computed(() => {
  if (themeTokenId.value) {
    return {
      "--dl-gnb-bg": `var(--theme-${themeTokenId.value}-bg)`,
      "--dl-gnb-text": `var(--theme-${themeTokenId.value}-fg)`,
    };
  }

  const theme = currentWorkspace.value?.theme_json?.gnb;
  return {
    "--dl-gnb-bg": theme?.background || "#ffffff",
    "--dl-gnb-text": theme?.foreground || "#111827",
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
</script>
<style>
.WorkspaceLayout {
  display: flex;
  flex-direction: column;
  --dl-bg: #f5f5f5;
  --dl-surface: #f9fafb;
  --dl-text: #111827;
  --dl-text-muted: #6b7280;
  --dl-border: #e5e7eb;
  --dl-gnb-bg: #ffffff;
  --dl-gnb-text: #111827;
  --dl-page-bg: #ffffff;
}

.WorkspaceLayout .brand {
  text-decoration: none;
  color: inherit;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
}

.WorkspaceLayout .brand-logo {
  height: 24px;
  width: 24px;
  display: block;
}

.WorkspaceLayout .brand-text {
  line-height: 1;
}

.WorkspaceLayout > header {
  background-color: var(--dl-gnb-bg);
}

.WorkspaceLayout .inner-gnb {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 20px 40px;
  color: var(--dl-gnb-text);
}

.WorkspaceLayout .inner-gnb > nav {
  display: flex;
  align-items: center;
}

.WorkspaceLayout .mainnav {
  font-size: 18px;
  gap: 60px;
  font-weight: 600;
  justify-self: center;
}

.WorkspaceLayout .utilnav {
  font-size: 15px;
  gap: 20px;
  justify-self: end;
}

.WorkspaceLayout .mainnav__link,
.WorkspaceLayout .utilnav__link {
  color: inherit;
  text-decoration: none;
}

.WorkspaceLayout .mainnav__link.router-link-active,
.WorkspaceLayout .utilnav__link.router-link-active {
  color: var(--color-primary);
}

.WorkspaceLayout main {
  background-color: var(--dl-page-bg);
  padding: 2rem 3rem 4rem;
  margin-top: 1rem;
  margin-bottom: 3rem;
  border-radius: 8px;
}
</style>
