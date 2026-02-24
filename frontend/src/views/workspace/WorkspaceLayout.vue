<template>
  <div class="WorkspaceLayout">
    <header>
      <div class="container inner-gnb">
        <router-link class="brand" :to="workspaceProjectsTo">
          <span class="brand-text">워크스페이스 이름</span>
        </router-link>
        <nav class="mainnav">
          <router-link class="mainnav__link" :to="workspaceProjectsTo">프로젝트</router-link>
          <router-link class="mainnav__link" :to="workspaceBoardTo">게시판</router-link>
          <router-link class="mainnav__link" :to="workspaceRankTo">랭킹</router-link>
        </nav>
        <nav class="utilnav">
          <router-link class="utilnav__link" :to="workspaceSettingsTo">설정</router-link>
          <account-dropdown />
        </nav>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AccountDropdown from "../../components/AccountDropdown.vue";

const route = useRoute();

const workspaceId = computed(() => route.params.workspaceId);
const workspaceRouteParams = computed(() => ({ workspaceId: workspaceId.value }));

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
