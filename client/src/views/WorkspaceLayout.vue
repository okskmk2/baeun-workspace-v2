<template>
  <router-view></router-view>
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

<style scoped></style>
