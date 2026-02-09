<template>
  <hgroup>
    <h1>{{ t("messenger.home.header.title") }}</h1>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("messenger.home.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <div v-else-if="groupedMessages.length" class="feed">
    <div v-for="group in groupedMessages" :key="group.label" class="feed-group">
      <div class="feed-date">{{ group.label }}</div>
      <article v-for="item in group.items" :key="item.message_id" class="feed-item">
        <div class="feed-icon">M</div>
        <div class="feed-body">
          <div class="feed-title">
            {{ item.channel_name || t("messenger.home.feed.channelFallback") }} ·
            {{ item.content || t("messenger.home.feed.messageFallback") }}
          </div>
          <div class="feed-meta">
            {{ item.creator_name || t("messenger.home.feed.creatorFallback") }} ·
            {{ formatTime(item.created_at) }}
          </div>
        </div>
      </article>
    </div>
  </div>

  <div v-else class="empty" aria-live="polite">
    <div class="empty-card">
      <div class="empty-badge">{{ t("messenger.home.empty.badge") }}</div>
      <h1>{{ t("messenger.home.empty.title") }}</h1>
      <p class="empty-desc">{{ t("messenger.home.empty.description") }}</p>
      <button type="button" class="btn">{{ t("messenger.home.actions.createChannel") }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const { t, locale } = useI18n();
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
    const res = await api.get("/channels/recent", {
      params: { project_id: projectId.value },
    });
    messages.value = res.data?.data || [];
  } catch (error) {
    messages.value = [];
    errorMessage.value = t("messenger.home.status.errorLoad");
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

  if (date >= startOfToday) return t("messenger.home.date.today");
  if (date >= startOfYesterday) return t("messenger.home.date.yesterday");
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const dateLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleDateString(dateLocale, { month: "2-digit", day: "2-digit" });
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const timeLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleTimeString(timeLocale, {
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
  const todayLabel = t("messenger.home.date.today");
  const yesterdayLabel = t("messenger.home.date.yesterday");
  const priority = (label) => (label === todayLabel ? 0 : label === yesterdayLabel ? 1 : 2);
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
  color: var(--color-text-muted);
  font-size: 14px;
}

.status.error {
  color: var(--color-danger);
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
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.feed-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-text);
  color: var(--color-text-inverse);
  font-size: 12px;
  font-weight: 700;
}

.feed-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.feed-meta {
  font-size: 12px;
  color: var(--color-text-muted);
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
  border: 1px dashed var(--color-border);
  text-align: center;
}

.empty-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-text-inverse);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.empty-card h1 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--color-text);
}

.empty-desc {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
