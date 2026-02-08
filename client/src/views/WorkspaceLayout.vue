<template>
  <div class="WorkspaceLayout">
    <header :style="gnbStyle">
      <div class="left">
        <span class="projectName">{{ projectName || "프로젝트" }}</span>
        <template v-if="projectId">
          <nav class="mainnav">
            <router-link :to="`/workspace/${workspaceId}/project/${projectId}/board`"
              >보드</router-link
            >
            <router-link :to="`/workspace/${workspaceId}/project/${projectId}/wiki`"
              >위키</router-link
            >
            <router-link :to="`/workspace/${workspaceId}/project/${projectId}/messenger`"
              >메신저</router-link
            >
          </nav>
        </template>
      </div>
      <nav class="utilnav">
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings`"
          >관리</router-link
        >
        <router-link to="/account">계정</router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";

const route = useRoute();
const router = useRouter();
const selectedProjectId = ref("");
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

const fetchWorkspace = async () => {
  if (!workspaceId.value) return;
  await workspaceStore.fetchWorkspace(workspaceId.value);
};

const fetchProjects = async () => {
  if (!workspaceId.value) {
    selectedProjectId.value = "";
    return;
  }

  await workspaceStore.fetchProjects(workspaceId.value);
  selectedProjectId.value = projectId.value ? String(projectId.value) : "";
};

const handleProjectChange = () => {
  if (!selectedProjectId.value || !workspaceId.value) {
    return;
  }

  router.push(`/workspace/${workspaceId.value}/project/${selectedProjectId.value}/board`);
};

onMounted(() => {
  fetchWorkspace();
  fetchProjects();
});

watch(
  () => route.params.workspaceId,
  () => {
    fetchWorkspace();
    fetchProjects();
  }
);

watch(
  () => route.params.projectId,
  (newProjectId) => {
    selectedProjectId.value = newProjectId ? String(newProjectId) : "";
  }
);
</script>

<style scoped>
.projectName {
  font-weight: 600;
  font-size: 20px;
  text-transform: capitalize;
}
</style>
