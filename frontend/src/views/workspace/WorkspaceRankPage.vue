<template>
  <main class="workspace-rank">
    <hgroup>
      <h1>워크스페이스 랭킹</h1>
      <p class="subtitle">프로젝트별 이슈 수 기준으로 정렬한 목록입니다.</p>
    </hgroup>

    <p v-if="isLoading" class="status">불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
    <p v-else-if="rankedProjects.length === 0" class="status muted">표시할 프로젝트가 없습니다.</p>

    <ol v-else class="rank-list">
      <li v-for="project in rankedProjects" :key="project.id" class="rank-item">
        <div>
          <p class="project-name">{{ project.name }}</p>
          <p class="project-meta">이슈 {{ Number(project.issue_count || 0) }}개</p>
        </div>
        <router-link class="btn btn--secondary" :to="`/project/${project.id}/board`">
          보드 열기
        </router-link>
      </li>
    </ol>
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

const rankedProjects = computed(() =>
  [...projects.value].sort((left, right) => Number(right.issue_count || 0) - Number(left.issue_count || 0))
);

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
.workspace-rank {
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

.rank-list {
  margin: 0;
  padding-left: 22px;
  display: grid;
  gap: 8px;
}

.rank-item {
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
  margin: 0;
  font-weight: 600;
}

.project-meta {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}
</style>