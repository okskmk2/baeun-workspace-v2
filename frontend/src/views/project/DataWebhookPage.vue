<template>
  <BackLinkButton @click="goHome">{{ t("data.webhookPage.back") }}</BackLinkButton>
  <template v-if="webhook">
    <hgroup>
      <div>
        <h1>{{ webhook.name }}</h1>
        <p class="subtitle">{{ t("data.webhookPage.title") }}</p>
      </div>
    </hgroup>
    <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>
    <section class="wire-card detail-card">
      <dl>
        <div>
          <dt>{{ t("data.webhookPage.fields.table") }}</dt>
          <dd>{{ tableLabel }}</dd>
        </div>
        <div>
          <dt>{{ t("data.webhookPage.fields.url") }}</dt>
          <dd class="url-value">{{ webhook.url }}</dd>
        </div>
        <div>
          <dt>{{ t("data.webhookPage.fields.secret") }}</dt>
          <dd>
            {{ webhook.secret ? t("data.webhookPage.fields.secretSet") : t("data.webhookPage.fields.secretEmpty") }}
          </dd>
        </div>
        <div>
          <dt>{{ t("data.webhookPage.fields.events") }}</dt>
          <dd>{{ eventLabels }}</dd>
        </div>
      </dl>
      <div class="detail-actions">
        <router-link v-if="webhook.table_id" class="btn btn--secondary" :to="tablePath">
          {{ t("data.webhookPage.fields.openTable") }}
        </router-link>
        <button type="button" class="btn btn--secondary" @click="previewPayload">
          {{ t("data.webhookPage.actions.preview") }}
        </button>
      </div>
      <p v-if="previewMessage" class="status success">{{ previewMessage }}</p>
    </section>
  </template>
  <p v-else class="status error">{{ t("data.webhookPage.notFound") }}</p>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();

const projectId = computed(() => route.params.projectId);
const webhookId = computed(() => route.params.webhookId);
const webhook = computed(() => dataStore.getWebhook(projectId.value, webhookId.value));
const liveTable = computed(() => dataStore.getTableById(projectId.value, webhook.value?.table_id));
const tableLabel = computed(() => liveTable.value?.name || webhook.value?.table_name || "-");
const tablePath = computed(
  () => `/project/${projectId.value}/data/${webhook.value?.table_id}/list`
);
const previewMessage = ref("");

const eventKeyMap = {
  addOrDelete: "data.createWebhook.fields.addOrDelete",
  dataUpdated: "data.createWebhook.fields.dataUpdated",
  tableRenamed: "data.createWebhook.fields.tableRenamed",
  tableDeleted: "data.createWebhook.fields.tableDeleted",
};

const eventLabels = computed(() => {
  const events = webhook.value?.events || {};
  const labels = Object.entries(eventKeyMap)
    .filter(([key]) => events[key])
    .map(([, key]) => t(key));
  return labels.length ? labels.join(", ") : "-";
});

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

const previewPayload = () => {
  if (!webhook.value) return;
  const selectedEvents = Object.entries(webhook.value.events || {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  const payloadPreview = {
    table_id: webhook.value.table_id,
    table_name: tableLabel.value,
    events: selectedEvents,
    has_secret: Boolean(webhook.value.secret),
  };
  previewMessage.value = t("data.webhookPage.previewReady", {
    payload: JSON.stringify(payloadPreview),
  });
};

onMounted(async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
});
</script>

<style scoped>
.prototype-banner {
  margin: 0 0 1rem;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
}

.detail-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  max-width: 640px;
}

dl {
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

dt {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

dd {
  margin: 0.2rem 0 0;
  font-weight: 700;
}

.url-value {
  word-break: break-all;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status.error {
  color: #dc2626;
}

.status.success {
  color: #166534;
  margin: 0;
  font-size: 13px;
}
</style>
