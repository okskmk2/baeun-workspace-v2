<template>
  <hgroup>
    <h1>{{ t("messenger.home.header.title") }}</h1>
  </hgroup>
  <p v-if="isLoading" class="status">불러오는 중...</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
  <p v-else-if="messages.length === 0" class="status">메시지가 없습니다.</p>
  <FeedList v-else :groups="messageGroups" item-key="itemKey" :item-click="handleItemClick">
    <template #icon>
      <span class="feed-icon">M</span>
    </template>
    <template #item="{ item }">
      <div class="item-title">
        <span v-if="isSystemMessage(item)" class="message-type system">
          {{ t("messenger.room.messageType.system") }}
        </span>
        <span v-else-if="isAgentMessage(item)" class="message-type agent">
          {{ t("messenger.room.messageType.agent") }}
        </span>
        {{ item.channel_name || "채널" }} · {{ item.content || "(내용 없음)" }}
      </div>
      <div class="item-meta">
        {{ getMessageAuthor(item) }} · {{ formatTime(item.created_at) }}
      </div>
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
const messages = ref([]);

const fetchRecentMessages = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/channels/recent", {
      params: { project_id: projectId.value },
    });
    messages.value = res.data || [];
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

const itemKey = (item, index) => item.message_id || index;
const messageGroups = computed(() => [
  {
    label: "최근 24시간",
    items: messages.value,
  },
]);

const handleItemClick = (item) => {
  if (!projectId.value || !item?.channel_id) return;
  router.push(`/project/${projectId.value}/channel/${item.channel_id}`);
};

const getMessageType = (message) => {
  const explicitType = String(message?.type || "").toUpperCase();
  if (["SYSTEM", "USER", "AGENT"].includes(explicitType)) {
    return explicitType;
  }
  const content = message?.content || "";
  if (/님이 .*님을 초대했습니다\.$/.test(content)) {
    return "SYSTEM";
  }
  return "USER";
};

const isSystemMessage = (message) => getMessageType(message) === "SYSTEM";
const isAgentMessage = (message) => getMessageType(message) === "AGENT";

const getMessageAuthor = (message) => {
  if (isAgentMessage(message)) {
    return message?.creator_name || t("messenger.room.messageType.agent");
  }
  return message?.creator_name || t("messenger.room.fallback.unknownUser");
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

.item-title {
  font-size: 14px;
  color: var(--color-text);
}

.message-type {
  margin-right: 6px;
  font-size: 11px;
  font-weight: 700;
}

.message-type.system {
  color: var(--color-text-muted);
}

.message-type.agent {
  color: var(--color-accent);
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
