<template>
  <BackLinkButton @click="goHome">{{ t("data.createChart.back") }}</BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("data.createChart.title") }}</h1>
      <p class="subtitle">{{ t("data.createChart.subtitle") }}</p>
    </div>
  </hgroup>

  <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>

  <form class="create-form" @submit.prevent="submitCreate">
    <label for="chart-name">
      {{ t("data.createChart.fields.name") }}
      <input id="chart-name" v-model.trim="form.name" type="text" required />
    </label>
    <label for="chart-table">
      {{ t("data.createChart.fields.table") }}
      <select id="chart-table" v-model="form.tableId" required>
        <option value="">{{ t("data.createChart.fields.tablePlaceholder") }}</option>
        <option v-for="table in tables" :key="table.id" :value="String(table.id)">
          {{ table.name }}
        </option>
      </select>
    </label>
    <label for="chart-type">
      {{ t("data.createChart.fields.chartType") }}
      <select id="chart-type" v-model="form.chartType">
        <option value="bar">{{ t("data.createChart.types.bar") }}</option>
        <option value="line">{{ t("data.createChart.types.line") }}</option>
        <option value="pie">{{ t("data.createChart.types.pie") }}</option>
      </select>
    </label>
    <label for="chart-x">
      {{ t("data.createChart.fields.xColumn") }}
      <select id="chart-x" v-model="form.xColumn" :disabled="columns.length === 0">
        <option value="">{{ t("data.createChart.fields.columnPlaceholder") }}</option>
        <option v-for="column in columns" :key="`x-${column.id}`" :value="column.name">
          {{ column.name }}
        </option>
      </select>
    </label>
    <label for="chart-y">
      {{ t("data.createChart.fields.yColumn") }}
      <select id="chart-y" v-model="form.yColumn" :disabled="columns.length === 0">
        <option value="">{{ t("data.createChart.fields.columnPlaceholder") }}</option>
        <option v-for="column in yColumns" :key="`y-${column.id}`" :value="column.name">
          {{ column.name }}
        </option>
      </select>
    </label>

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="create-actions">
      <button type="button" class="btn btn--secondary" @click="goHome">
        {{ t("data.createChart.actions.cancel") }}
      </button>
      <button type="submit" class="btn">{{ t("data.createChart.actions.submit") }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const { columnsByKey } = storeToRefs(dataStore);

const projectId = computed(() => route.params.projectId);
const tables = computed(() => dataStore.getAllTables(projectId.value));
const formError = ref("");
const form = ref({
  name: "",
  tableId: "",
  chartType: "bar",
  xColumn: "",
  yColumn: "",
});

const tableKey = computed(() =>
  projectId.value && form.value.tableId ? `${projectId.value}:${form.value.tableId}` : ""
);
const columns = computed(() => (tableKey.value ? columnsByKey.value[tableKey.value] || [] : []));
const yColumns = computed(() => {
  const numberColumns = columns.value.filter((column) => String(column.type).toUpperCase() === "NUMBER");
  return numberColumns.length > 0 ? numberColumns : columns.value;
});

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

watch(
  () => form.value.tableId,
  async (tableId) => {
    form.value.xColumn = "";
    form.value.yColumn = "";
    if (!projectId.value || !tableId) return;
    try {
      await dataStore.fetchTableDetail(projectId.value, tableId);
    } catch {
      /* column options stay empty if the table cannot be loaded */
    }
  }
);

const submitCreate = () => {
  formError.value = "";
  if (!form.value.name) {
    formError.value = t("data.createChart.error.nameRequired");
    return;
  }
  if (tables.value.length === 0) {
    formError.value = t("data.createChart.error.noTables");
    return;
  }
  if (!form.value.tableId) {
    formError.value = t("data.createChart.error.tableRequired");
    return;
  }

  const table = dataStore.getTableById(projectId.value, form.value.tableId);
  const created = dataStore.createChart(projectId.value, {
    name: form.value.name,
    table_id: form.value.tableId,
    table_name: table?.name || "",
    chart_type: form.value.chartType,
    x_column: form.value.xColumn,
    y_column: form.value.yColumn,
  });
  addToast({ message: t("data.createChart.toast.created"), type: "success" });
  router.push(`/project/${projectId.value}/data/charts/${created.id}`);
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
  display: grid;
  gap: 0.35rem;
  font-size: 13px;
}

.create-form input,
.create-form select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--color-surface, #fff);
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
