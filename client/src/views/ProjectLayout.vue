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
        <router-link to="/account">{{ t("layout.project.util.account") }}</router-link>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script setup>
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";
import MaterialSymbol from "../components/MaterialSymbol.vue";

const { t } = useI18n();
const route = useRoute();
const projectMemberStore = useProjectMemberStore();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const { gnbPreviewTheme } = storeToRefs(appStore);

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));
const currentProject = computed(() => {
  if (!projectId.value) return "";
  const list = projects.value || [];
  return list.find((project) => String(project.id) === String(projectId.value)) || null;
});
const projectName = computed(() => currentProject.value?.name || "");
const gnbStyle = computed(() => {
  const preview = gnbPreviewTheme.value;
  const theme = currentProject.value?.theme_json?.gnb;
  const background = preview?.background || theme?.background || "#ffffff";
  const foreground = preview?.foreground || theme?.foreground || "#111827";
  return {
    "--gnb-bg": background,
    "--gnb-fg": foreground,
  };
});

watch(
  projectId,
  (value) => {
    if (!value) return;
    projectMemberStore.fetchProjectMembers(value);
  },
  { immediate: true }
);
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
  font-size: 16px;
}

.mainnav-link:hover {
  background-color: color-mix(in srgb, var(--gnb-bg) 95%, var(--gnb-fg) 5%);
}

.mainnav-link.router-link-active {
  background-color: color-mix(in srgb, var(--gnb-bg) 90%, var(--gnb-fg) 10%);
}
</style>
