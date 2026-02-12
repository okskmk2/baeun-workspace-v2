<template>
  <hgroup>
    <h1>{{ t("board.home.header.title") }}</h1>
  </hgroup>

  <p v-if="isLoading" class="status">불러오는 중...</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
  <p v-else-if="activities.length === 0" class="status">최근 이슈 활동이 없습니다.</p>
  <FeedList v-else :groups="activityGroups" item-key="itemKey" :item-click="handleItemClick">
    <template #icon>
      <span class="feed-icon">B</span>
    </template>
    <template #item="{ item }">
      <div class="item-title">
        <span class="event-badge" :class="badgeClass(item.event_type)">
          {{ eventLabel(item.event_type) }}
        </span>
        {{ item.title }}
      </div>
      <div class="item-meta">{{ item.board_name }} · {{ formatTime(item.occurred_at) }}</div>
    </template>
  </FeedList>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import FeedList from "../components/FeedList.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const projectId = computed(() => route.params.projectId);
const isLoading = ref(false);
const errorMessage = ref("");
const activities = ref([]);

const fetchRecentIssues = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/issues/recent", {
      params: { project_id: projectId.value },
    });
    const data = res.data?.data || {};
    activities.value = data.items || [];
  } catch (error) {
    activities.value = [];
    errorMessage.value = "최근 활동을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const eventLabel = (value) => (value === "UPDATED" ? "수정" : "등록");
const badgeClass = (value) => (value === "UPDATED" ? "is-updated" : "is-created");
const itemKey = (item, index) => `${item.event_type}-${item.id}-${item.occurred_at || index}`;

const activityGroups = computed(() => [
  {
    label: "최근 24시간",
    items: activities.value,
  },
]);

const handleItemClick = (item) => {
  if (!projectId.value || !item?.board_id || !item?.id) return;
  router.push(`/project/${projectId.value}/board/${item.board_id}/issue/${item.id}`);
};

onMounted(fetchRecentIssues);
watch(projectId, fetchRecentIssues);
</script>

<style scoped>
.activity-card {
  max-width: 520px;
  width: 100%;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  background-color: var(--color-surface);
}

.activity-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: var(--color-text);
}

.item-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text);
}

.item-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.status {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.event-badge {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text);
}

.event-badge.is-updated {
  background: color-mix(in srgb, var(--color-warning) 25%, transparent 75%);
  color: var(--color-warning);
}

.event-badge.is-created {
  background: color-mix(in srgb, var(--color-success) 25%, transparent 75%);
  color: var(--color-success);
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-text);
  color: var(--color-text-inverse);
  font-size: 12px;
  font-weight: 700;
}
</style>
