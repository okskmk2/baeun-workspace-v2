<template>
  <hgroup>
    <h1>최근 대화</h1>
  </hgroup>

  <p v-if="isLoading" class="status">최근 대화를 불러오는 중...</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <div v-else-if="groupedMessages.length" class="feed">
    <div v-for="group in groupedMessages" :key="group.label" class="feed-group">
      <div class="feed-date">{{ group.label }}</div>
      <article v-for="item in group.items" :key="item.message_id" class="feed-item">
        <div class="feed-icon">M</div>
        <div class="feed-body">
          <div class="feed-title">
            {{ item.chatroom_name || "채팅방" }} · {{ item.content || "메시지" }}
          </div>
          <div class="feed-meta">
            {{ item.creator_name || "알수없음" }} · {{ formatTime(item.created_at) }}
          </div>
        </div>
      </article>
    </div>
  </div>

  <div v-else class="empty" aria-live="polite">
    <div class="empty-card">
      <div class="empty-badge">Chat</div>
      <h1>최근 24시간 대화가 없습니다</h1>
      <p class="empty-desc">왼쪽 메뉴에서 새로운 채팅방을 만들고 대화를 시작하세요.</p>
      <button type="button" class="btn">채팅방 만들기</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const route = useRoute();

const isLoading = ref(false);
const errorMessage = ref("");
const messages = ref([]);

const projectId = computed(() => route.params.projectId);

const fetchRecentMessages = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/chatroom/recent", {
      params: { project_id: projectId.value },
    });
    messages.value = res.data?.data || [];
  } catch (error) {
    messages.value = [];
    errorMessage.value = "최근 대화를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  if (date >= startOfToday) return "오늘";
  if (date >= startOfYesterday) return "어제";
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const groupedMessages = computed(() => {
  const buckets = new Map();
  messages.value.forEach((item) => {
    const label = formatDateLabel(item.created_at);
    if (!label) return;
    if (!buckets.has(label)) {
      buckets.set(label, []);
    }
    buckets.get(label).push(item);
  });

  const order = Array.from(buckets.keys());
  const priority = (label) => (label === "오늘" ? 0 : label === "어제" ? 1 : 2);
  order.sort((a, b) => priority(a) - priority(b));

  return order.map((label) => ({
    label,
    items: buckets.get(label) || [],
  }));
});

onMounted(fetchRecentMessages);
watch(projectId, fetchRecentMessages);
</script>

<style scoped>
.status {
  color: #6b7280;
  font-size: 14px;
}

.status.error {
  color: #b91c1c;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-date {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.feed-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.feed-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.feed-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.empty {
  display: flex;
  justify-content: center;
}

.empty-card {
  max-width: 520px;
  width: 100%;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px dashed #e5e7eb;
  text-align: center;
}

.empty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.empty-card h1 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #111827;
}

.empty-desc {
  margin: 0 0 16px;
  color: #4b5563;
  font-size: 14px;
}
</style>
