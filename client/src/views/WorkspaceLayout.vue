<template>
  <div class="WorkspaceLayout">
    <header>
      <div class="left">
        <router-link class="workspaceName" :to="`/workspace/${workspaceId}`">{{
          workspaceName || "Workspace"
        }}</router-link>
        <select v-model="selectedProjectId" @change="handleProjectChange" class="projectselect">
          <option disabled value="">프로젝트를 선택하세요.</option>
          <option v-for="project in projects" :key="project.id" :value="String(project.id)">
            {{ project.name }}
          </option>
        </select>
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
import { useWorkspaceStore } from "../stores/workspaceStore";

const route = useRoute();
const router = useRouter();
const selectedProjectId = ref("");
const workspaceStore = useWorkspaceStore();

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);

const workspaceName = computed(() => workspaceStore.getWorkspaceName(workspaceId.value));
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));

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
