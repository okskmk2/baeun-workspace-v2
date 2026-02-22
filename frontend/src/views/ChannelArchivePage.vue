<template>
  <hgroup>
    <h1>{{ t("messenger.archive.header.title") }}</h1>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("messenger.archive.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
  <p v-else-if="items.length === 0" class="status">
    {{ t("messenger.archive.empty.channels") }}
  </p>

  <ul v-else class="archive-list">
    <li v-for="item in items" :key="item.id" class="archive-item">
      <h2 class="channel-name">
        <router-link :to="`/project/${projectId}/channel/${item.id}`">
          {{ item.name || t("messenger.layout.fallback.channelName") }}
        </router-link>
      </h2>
      <p class="meta-row">
        {{ t("messenger.archive.fields.lastMessageAt") }}: {{ formatDate(item.last_message_at) }}
      </p>
      <p class="meta-row">
        {{ t("messenger.archive.fields.totalMessageCount") }}: {{ item.total_message_count || 0 }}
      </p>
      <p class="meta-row">
        {{ t("messenger.archive.fields.linkedIssue") }}:
        <router-link
          v-if="item.issue_id && item.board_id"
          :to="`/project/${projectId}/board/${item.board_id}/issue/${item.issue_id}`"
        >
          {{ item.issue_title || `#${item.issue_id}` }}
        </router-link>
        <span v-else>{{ t("messenger.archive.empty.noIssue") }}</span>
      </p>
    </li>
  </ul>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const { t } = useI18n();
const route = useRoute();

const projectId = computed(() => route.params.projectId);
const isLoading = ref(false);
const errorMessage = ref("");
const items = ref([]);

const fetchArchivedChannels = async () => {
  if (!projectId.value) {
    items.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/channels/archived", {
      params: { project_id: projectId.value },
    });
    items.value = res.data || [];
  } catch (error) {
    items.value = [];
    errorMessage.value = error?.response?.data?.message || t("messenger.archive.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (value) => {
  if (!value) {
    return t("messenger.archive.empty.noMessages");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
};

onMounted(fetchArchivedChannels);
watch(projectId, fetchArchivedChannels);
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

.channel-name {
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
