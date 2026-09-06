<template>
  <BackLinkButton @click="goHome">{{ t("data.createWebhook.back") }}</BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("data.createWebhook.title") }}</h1>
      <p class="subtitle">{{ t("data.createWebhook.subtitle") }}</p>
    </div>
  </hgroup>

  <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>

  <form class="create-form" @submit.prevent="submitCreate">
    <label for="webhook-name">
      {{ t("data.createWebhook.fields.name") }}
      <input id="webhook-name" v-model.trim="form.name" type="text" required />
    </label>
    <label for="webhook-table">
      {{ t("data.createWebhook.fields.table") }}
      <select id="webhook-table" v-model="form.tableId" required>
        <option value="">{{ t("data.createWebhook.fields.tablePlaceholder") }}</option>
        <option v-for="table in tables" :key="table.id" :value="String(table.id)">
          {{ table.name }}
        </option>
      </select>
    </label>
    <label for="webhook-url">
      {{ t("data.createWebhook.fields.url") }}
      <input
        id="webhook-url"
        v-model.trim="form.url"
        type="url"
        placeholder="https://example.com/hooks/table-events"
        required
      />
    </label>
    <label for="webhook-secret">
      {{ t("data.createWebhook.fields.secret") }}
      <input id="webhook-secret" v-model.trim="form.secret" type="text" placeholder="whsec_..." />
    </label>

    <fieldset class="event-list">
      <legend>{{ t("data.createWebhook.fields.events") }}</legend>
      <label class="event-item">
        <input v-model="form.events.addOrDelete" type="checkbox" />
        <span>{{ t("data.createWebhook.fields.addOrDelete") }}</span>
      </label>
      <label class="event-item">
        <input v-model="form.events.dataUpdated" type="checkbox" />
        <span>{{ t("data.createWebhook.fields.dataUpdated") }}</span>
      </label>
      <label class="event-item">
        <input v-model="form.events.tableRenamed" type="checkbox" />
        <span>{{ t("data.createWebhook.fields.tableRenamed") }}</span>
      </label>
      <label class="event-item">
        <input v-model="form.events.tableDeleted" type="checkbox" />
        <span>{{ t("data.createWebhook.fields.tableDeleted") }}</span>
      </label>
    </fieldset>

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="create-actions">
      <button type="button" class="btn btn--secondary" @click="goHome">
        {{ t("data.createWebhook.actions.cancel") }}
      </button>
      <button type="submit" class="btn">{{ t("data.createWebhook.actions.submit") }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();

const projectId = computed(() => route.params.projectId);
const tables = computed(() => dataStore.getAllTables(projectId.value));
const formError = ref("");
const form = ref({
  name: "",
  tableId: "",
  url: "",
  secret: "",
  events: {
    addOrDelete: true,
    dataUpdated: true,
    tableRenamed: true,
    tableDeleted: true,
  },
});

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

const isValidWebhookUrl = (value) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const submitCreate = () => {
  formError.value = "";
  if (!form.value.name) {
    formError.value = t("data.createWebhook.error.nameRequired");
    return;
  }
  if (tables.value.length === 0) {
    formError.value = t("data.createWebhook.error.noTables");
    return;
  }
  if (!form.value.tableId) {
    formError.value = t("data.createWebhook.error.tableRequired");
    return;
  }
  if (!isValidWebhookUrl(form.value.url)) {
    formError.value = t("data.createWebhook.error.urlInvalid");
    return;
  }
  if (!Object.values(form.value.events).some(Boolean)) {
    formError.value = t("data.createWebhook.error.eventRequired");
    return;
  }

  const table = dataStore.getTableById(projectId.value, form.value.tableId);
  const created = dataStore.createWebhook(projectId.value, {
    name: form.value.name,
    table_id: form.value.tableId,
    table_name: table?.name || "",
    url: form.value.url,
    secret: form.value.secret,
    events: { ...form.value.events },
  });
  addToast({ message: t("data.createWebhook.toast.created"), type: "success" });
  router.push(`/project/${projectId.value}/data/webhooks/${created.id}`);
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

.create-form {
  display: grid;
  gap: 0.75rem;
  max-width: 560px;
}

.create-form label {
  /* display: grid; */
  gap: 0.35rem;
  font-size: 13px;
}

.create-form input:not([type="checkbox"]),
.create-form select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--color-surface, #fff);
}

.event-list {
  margin: 0;
  padding: 0.8rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 10px;
  display: grid;
  gap: 0.55rem;
}

.event-list legend {
  font-size: 13px;
  font-weight: 700;
  padding: 0 0.25rem;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
}

.status.error {
  color: #dc2626;
  margin: 0;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
