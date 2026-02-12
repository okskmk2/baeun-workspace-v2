<template>
  <hgroup>
    <h1>{{ t("messenger.home.header.title") }}</h1>
  </hgroup>
  <section class="activity-card" aria-live="polite">
    <h2>채널 액티비티</h2>
    <p v-if="isLoading" class="status">불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
    <p v-else-if="messages.length === 0" class="status">메시지가 없습니다.</p>
    <ul v-else>
      <li v-for="message in messages" :key="message.message_id">
        <span class="item-title">
          {{ message.channel_name || "채널" }} · {{ message.content || "(내용 없음)" }}
        </span>
        <span class="item-meta">
          {{ message.creator_name || "알 수 없음" }} · {{ formatTime(message.created_at) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const { t } = useI18n();
const route = useRoute();

const projectId = computed(() => route.params.projectId);
const isLoading = ref(false);
const errorMessage = ref("");
const messages = ref([]);

const fetchRecentMessages = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/channels/recent", {
      params: { project_id: projectId.value },
    });
    messages.value = res.data?.data || [];
  } catch (error) {
    messages.value = [];
    errorMessage.value = "최근 메시지를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

onMounted(fetchRecentMessages);
watch(projectId, fetchRecentMessages);
</script>

<style scoped>
.activity-card {
  max-width: 520px;
  width: 100%;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: var(--color-text);
}

.activity-card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-card li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-title {
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
</style>
