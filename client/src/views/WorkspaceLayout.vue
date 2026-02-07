<template>
  <div class="DefaultLayout">
    <header>
      <div>
        <router-link class="brand" :to="`/workspace/${workspaceId}`">{{
          workspaceName || "Workspace"
        }}</router-link>
        <select v-model="selectedProjectId" @change="handleProjectChange" class="projectselect">
          <option disabled value="">프로젝트를 선택하세요.</option>
          <option v-for="project in projects" :key="project.id" :value="String(project.id)">
            {{ project.name }}
          </option>
        </select>
      </div>
      <nav class="mainnav">
        <template v-if="projectId">
          <router-link :to="`/workspace/${workspaceId}/project/${projectId}/board`"
            >보드</router-link
          >
          <router-link :to="`/workspace/${workspaceId}/project/${projectId}/wiki`"
            >위키</router-link
          >
          <router-link :to="`/workspace/${workspaceId}/project/${projectId}/messenger`"
            >메신저</router-link
          >
        </template>
      </nav>
      <nav class="utilnav">
        <router-link to="/login">관리</router-link>
        <router-link to="/account">계정</router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";

const route = useRoute();
const router = useRouter();
const workspaceName = ref("");
const projects = ref([]);
const selectedProjectId = ref("");

const workspaceId = route.params.workspaceId;
const projectId = route.params.projectId;

const fetchWorkspaceName = async () => {
  if (!workspaceId.value) {
    workspaceName.value = "";
    return;
  }

  try {
    const res = await api.get(`/workspace/${workspaceId.value}`);
    workspaceName.value = res.data?.data?.name;
  } catch (error) {
    workspaceName.value = "";
  }
};

const fetchProjects = async () => {
  if (!workspaceId.value) {
    projects.value = [];
    selectedProjectId.value = "";
    return;
  }

  try {
    const res = await api.get(`/workspace/${workspaceId.value}/projects`);
    projects.value = res.data?.data || [];
  } catch (error) {
    projects.value = [];
  }

  selectedProjectId.value = projectId.value ? String(projectId.value) : "";
};

const handleProjectChange = () => {
  if (!selectedProjectId.value || !workspaceId.value) {
    return;
  }

  router.push(`/workspace/${workspaceId.value}/project/${selectedProjectId.value}/board`);
};

onMounted(() => {
  fetchWorkspaceName();
  fetchProjects();
});

watch(
  () => route.params.workspaceId,
  () => {
    fetchWorkspaceName();
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
