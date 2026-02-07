<template>
  <main>
    <hgroup>
      <h1>프로젝트 목록</h1>
      <button>프로젝트 만들기</button>
    </hgroup>
    <p v-if="isLoading">Loading...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0">No projects.</p>
    <ul v-else>
      <li v-for="project in projects" :key="project.id">
        <router-link :to="`/workspace/${workspaceId}/project/${project.id}`">
          {{ project.name }}
        </router-link>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const route = useRoute();
const projects = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const workspaceId = route.params.workspaceId;

const fetchProjects = async () => {
  //   const workspaceId = route.params.workspaceId;
  if (!workspaceId) {
    projects.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/workspace/${workspaceId}/projects`);
    projects.value = res.data?.data || [];
  } catch (error) {
    projects.value = [];
    errorMessage.value = "Failed to load projects.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchProjects);
watch(() => route.params.workspaceId, fetchProjects);
</script>
