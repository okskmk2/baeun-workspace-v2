<template>
  <hgroup>
    <h1>{{ t("kanban.archive.header.title") }}</h1>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("kanban.archive.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
  <p v-else-if="items.length === 0" class="status">
    {{ t("kanban.archive.empty.kanbans") }}
  </p>

  <ul v-else class="archive-list">
    <li v-for="item in items" :key="item.id" class="archive-item">
      <h2 class="kanban-name">
        <router-link :to="`/project/${projectId}/kanban/${item.id}`">
          {{ item.name || t("kanban.page.header.fallbackTitle") }}
        </router-link>
      </h2>
      <p class="meta-row">
        {{ t("kanban.archive.fields.createdAt") }}: {{ formatDate(item.created_at) }}
      </p>
      <p class="meta-row">
        {{ t("kanban.archive.fields.totalTaskCount") }}: {{ totalTaskCount(item.task_counts) }}
      </p>
      <p class="meta-row">
        {{ t("kanban.archive.fields.summary") }}:
        {{ item.summary || t("kanban.archive.empty.noSummary") }}
      </p>
    </li>
  </ul>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../../lib/axios";

const { t } = useI18n();
const route = useRoute();

const projectId = computed(() => route.params.projectId);
const isLoading = ref(false);
const errorMessage = ref("");
const items = ref([]);

const fetchArchivedKanbans = async () => {
  if (!projectId.value) {
    items.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/kanbans", {
      params: { projectId: projectId.value, isActive: false },
    });
    items.value = res.data || [];
  } catch (error) {
    items.value = [];
    errorMessage.value = error?.response?.data?.message || t("kanban.archive.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

const totalTaskCount = (taskCounts) => {
  if (!taskCounts || typeof taskCounts !== "object") {
    return 0;
  }
  return Object.values(taskCounts).reduce((acc, value) => acc + Number(value || 0), 0);
};

onMounted(fetchArchivedKanbans);
watch(projectId, fetchArchivedKanbans);
</script>

<style scoped>
.status {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.archive-item {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  background: var(--color-card-bg);
}

.kanban-name {
  margin: 0 0 10px;
  font-size: 15px;
}

.meta-row {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.meta-row + .meta-row {
  margin-top: 6px;
}
</style>
