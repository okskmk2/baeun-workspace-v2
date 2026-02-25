<template>
  <main class="workspace-kanban">
    <hgroup>
      <h1>워크스페이스 칸반</h1>
      <p class="subtitle">프로젝트 칸반으로 이동할 수 있습니다.</p>
    </hgroup>

    <p v-if="isLoading" class="status">불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0" class="status muted">프로젝트가 없습니다.</p>

    <ul v-else class="project-list">
      <li v-for="project in projects" :key="project.id" class="project-item">
        <span class="project-name">{{ project.name }}</span>
        <router-link class="btn btn--secondary" :to="`/project/${project.id}/kanban`">
          칸반 열기
        </router-link>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();

const workspaceId = computed(() => route.params.workspaceId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));
const isLoading = ref(false);
const errorMessage = ref("");

const fetchProjects = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "프로젝트를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchProjects);
watch(workspaceId, fetchProjects);
</script>

<style scoped>
.workspace-kanban {
  display: grid;
  gap: 16px;
  padding: 24px;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.project-name {
  font-weight: 600;
}
</style>