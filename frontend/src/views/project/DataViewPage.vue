<template>
  <BackLinkButton @click="goHome">{{ t("data.viewPage.back") }}</BackLinkButton>

  <div v-if="view">
    <hgroup>
      <div>
        <h1>{{ view.name }}</h1>
        <p class="subtitle">{{ t("data.viewPage.title") }}</p>
      </div>
    </hgroup>

    <section v-if="isJoinView" class="wire-card detail-card">
      <div class="detail-heading">
        <div>
          <p class="eyebrow">{{ t("data.viewPage.fields.summary") }}</p>
          <p class="summary">{{ summary }}</p>
        </div>
        <span class="prototype-badge">{{ t("data.prototype.badge") }}</span>
      </div>

      <div class="relation-flow" :aria-label="t('data.viewPage.fields.relationship')">
        <div class="source-card">
          <span class="source-label">{{ t("data.viewPage.fields.base") }}</span>
          <strong>{{ view.left?.name || "-" }}</strong>
          <span class="kind-badge">{{ kindLabel(view.left?.kind) }}</span>
        </div>
        <div class="join-connector">
          <span>{{ matchValue }}</span>
          <small>{{ joinTypeLabel }}</small>
        </div>
        <div class="source-card">
          <span class="source-label">{{ t("data.viewPage.fields.attach") }}</span>
          <strong>{{ view.right?.name || "-" }}</strong>
          <span class="kind-badge">{{ kindLabel(view.right?.kind) }}</span>
        </div>
      </div>

      <p v-if="view.description" class="description">{{ view.description }}</p>

      <section class="columns-section">
        <div class="section-heading">
          <div>
            <h2>{{ t("data.viewPage.fields.columns") }}</h2>
            <p>{{ t("data.viewPage.fields.columnsCount", { count: resultColumns.length }) }}</p>
          </div>
        </div>

        <div v-if="resultColumns.length" class="columns-scroll">
          <table class="columns-table">
            <thead>
              <tr>
                <th>{{ t("data.viewPage.fields.columnName") }}</th>
                <th>{{ t("data.viewPage.fields.source") }}</th>
                <th>{{ t("data.viewPage.fields.type") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="column in resultColumns" :key="column.key">
                <td>
                  <strong>{{ column.label || column.name }}</strong>
                  <small v-if="column.label && column.label !== column.name">{{ column.name }}</small>
                </td>
                <td>{{ column.sourceName }}</td>
                <td><span class="type-badge">{{ column.type }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-columns">{{ t("data.viewPage.fields.columnsEmpty") }}</p>
      </section>

      <section class="rows-section">
        <div class="section-heading">
          <div>
            <h2>{{ t("data.viewPage.fields.data") }}</h2>
            <p v-if="!isLoadingRows">{{ t("data.viewPage.fields.rowsCount", { count: viewRows.length }) }}</p>
          </div>
        </div>
        <p v-if="isLoadingRows" class="rows-status">{{ t("data.viewPage.fields.rowsLoading") }}</p>
        <p v-else-if="rowsError" class="rows-status rows-status--error">{{ rowsError }}</p>
        <p v-else-if="viewRows.length === 0" class="empty-columns">{{ t("data.viewPage.fields.rowsEmpty") }}</p>
        <div v-else class="rows-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="column in resultColumns" :key="`data-head-${column.key}`">
                  {{ column.label || column.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in viewRows" :key="row.id">
                <td v-for="column in resultColumns" :key="`data-cell-${row.id}-${column.key}`">
                  {{ displayValue(row, column) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="detail-actions">
        <router-link v-if="leftPath" class="btn btn--secondary" :to="leftPath">
          {{ leftLinkLabel }}
        </router-link>
        <router-link v-if="rightPath" class="btn btn--secondary" :to="rightPath">
          {{ rightLinkLabel }}
        </router-link>
      </div>
    </section>

    <section v-else class="wire-card empty-state status warning">
      <strong>{{ t("data.viewPage.legacyTitle") }}</strong>
      <p>{{ t("data.viewPage.legacy") }}</p>
    </section>
  </div>

  <p v-else class="status error">{{ t("data.viewPage.notFound") }}</p>
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
const isLoadingRows = ref(false);
const rowsError = ref("");
const viewRows = ref([]);

const projectId = computed(() => route.params.projectId);
const viewId = computed(() => route.params.viewId);
const view = computed(() => dataStore.getView(projectId.value, viewId.value));
const isJoinView = computed(() => dataStore.isJoinView(view.value));
const resultColumns = computed(() =>
  Array.isArray(view.value?.result_columns)
    ? view.value.result_columns.map((column, index) => ({
        ...column,
        key: `${column.source || "column"}-${column.id || index}-${column.name || index}`,
        type: String(column.type || "TEXT").toUpperCase(),
        sourceName:
          column.source === "right" ? view.value?.right?.name || "-" : view.value?.left?.name || "-",
      }))
    : []
);

const joinTypeLabel = computed(() =>
  view.value?.join_type === "keep_base"
    ? t("data.createView.join.keepBase.title")
    : t("data.createView.join.matching.title")
);

const summary = computed(() => {
  if (!isJoinView.value) return "";
  const key =
    view.value.join_type === "keep_base"
      ? "data.createView.preview.keepBase"
      : "data.createView.preview.matching";
  return t(key, {
    left: view.value.left?.name || "-",
    right: view.value.right?.name || "-",
    leftColumn: view.value.match?.left_column?.name || "-",
    rightColumn: view.value.match?.right_column?.name || "-",
  });
});

const matchValue = computed(() =>
  t("data.viewPage.fields.matchValue", {
    left: view.value?.match?.left_column?.name || "-",
    right: view.value?.match?.right_column?.name || "-",
  })
);

const displayValue = (row, column) => {
  const value = row?.json_data?.[column.name];
  return value === null || value === undefined || value === "" ? "-" : String(value);
};

const valueKey = (value) => `${typeof value}:${String(value ?? "")}`;

const joinRows = (definition, leftRows, rightRows) => {
  const leftName = definition.match?.left_column?.name;
  const rightName = definition.match?.right_column?.name;
  const resultColumnsForView = Array.isArray(definition.result_columns)
    ? definition.result_columns
    : [];
  const rightByKey = new Map();
  rightRows.forEach((row) => {
    const key = valueKey(row?.json_data?.[rightName]);
    const matches = rightByKey.get(key) || [];
    matches.push(row);
    rightByKey.set(key, matches);
  });

  const combined = [];
  leftRows.forEach((leftRow, index) => {
    const matches = rightByKey.get(valueKey(leftRow?.json_data?.[leftName])) || [];
    const pairs = definition.join_type === "keep_base" && matches.length === 0 ? [null] : matches;
    if (definition.join_type !== "keep_base" && matches.length === 0) return;
    pairs.forEach((rightRow, pairIndex) => {
      const jsonData = {};
      resultColumnsForView.forEach((column) => {
        const sourceRow = column.source === "right" ? rightRow : leftRow;
        jsonData[column.name] = sourceRow?.json_data?.[column.name] ?? null;
      });
      combined.push({
        id: `view-row-${index}-${pairIndex}`,
        json_data: jsonData,
      });
    });
  });
  return combined;
};

const loadSourceRows = async (source, seen = new Set()) => {
  if (!source?.kind || source.id === undefined || source.id === null) return [];
  const sourceKey = `${source.kind}:${source.id}`;
  if (seen.has(sourceKey)) return [];
  seen.add(sourceKey);
  if (source.kind === "table") {
    return dataStore.fetchRows(projectId.value, source.id);
  }
  const nestedView = dataStore.getView(projectId.value, source.id);
  if (!nestedView || !dataStore.isJoinView(nestedView)) return [];
  const [leftRows, rightRows] = await Promise.all([
    loadSourceRows(nestedView.left, new Set(seen)),
    loadSourceRows(nestedView.right, new Set(seen)),
  ]);
  return joinRows(nestedView, leftRows, rightRows);
};

const loadViewRows = async () => {
  if (!view.value || !isJoinView.value) return;
  isLoadingRows.value = true;
  rowsError.value = "";
  try {
    const [leftRows, rightRows] = await Promise.all([
      loadSourceRows(view.value.left),
      loadSourceRows(view.value.right),
    ]);
    viewRows.value = joinRows(view.value, leftRows, rightRows);
  } catch {
    viewRows.value = [];
    rowsError.value = t("data.viewPage.fields.rowsError");
  } finally {
    isLoadingRows.value = false;
  }
};

const kindLabel = (kind) =>
  kind === "view" ? t("data.viewPage.kind.view") : t("data.viewPage.kind.table");

const sourcePath = (source) => {
  if (!source?.kind || !projectId.value) return "";
  if (source.kind === "table") return `/project/${projectId.value}/data/${source.id}/list`;
  if (source.kind === "view") return `/project/${projectId.value}/data/views/${source.id}`;
  return "";
};

const leftPath = computed(() => sourcePath(view.value?.left));
const rightPath = computed(() => sourcePath(view.value?.right));
const leftLinkLabel = computed(() =>
  view.value?.left?.kind === "view"
    ? t("data.viewPage.fields.openView")
    : t("data.viewPage.fields.openTable")
);
const rightLinkLabel = computed(() =>
  view.value?.right?.kind === "view"
    ? t("data.viewPage.fields.openView")
    : t("data.viewPage.fields.openTable")
);

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

onMounted(async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
  await loadViewRows();
});
</script>

<style scoped>
.detail-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  max-width: 900px;
}

.detail-heading,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.summary {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
}

.eyebrow,
.source-label {
  margin: 0 0 0.3rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 12px;
  font-weight: 700;
}

.prototype-badge,
.type-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.relation-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(140px, 0.7fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.source-card {
  min-width: 0;
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  background: var(--color-page-bg, #fafafa);
}

.source-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.join-connector {
  display: grid;
  gap: 0.25rem;
  text-align: center;
  color: var(--color-text, #18181b);
  font-size: 13px;
  font-weight: 700;
}

.join-connector::before,
.join-connector::after {
  content: "";
  height: 1px;
  background: var(--color-border, #e4e4e7);
}

.join-connector small {
  color: var(--color-text-secondary, #71717a);
  font-size: 11px;
  font-weight: 400;
}

.description {
  margin: 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border, #e4e4e7);
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
}

.columns-section {
  display: grid;
  gap: 0.65rem;
}

.section-heading h2 {
  margin: 0;
  font-size: 15px;
}

.section-heading p {
  margin: 0.25rem 0 0;
  color: var(--color-text-secondary, #71717a);
  font-size: 12px;
}

.columns-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
}

.columns-table {
  width: 100%;
  min-width: 520px;
  border-collapse: collapse;
  font-size: 13px;
}

.columns-table th,
.columns-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--color-border, #e4e4e7);
  text-align: left;
}

.columns-table th {
  color: var(--color-text-secondary, #71717a);
  font-size: 11px;
  font-weight: 700;
  background: var(--color-page-bg, #fafafa);
}

.columns-table tr:last-child td {
  border-bottom: 0;
}

.columns-table td:first-child {
  width: 45%;
}

.columns-table td small {
  display: block;
  margin-top: 0.2rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 11px;
}

.kind-badge {
  width: fit-content;
  display: flex;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--color-border, #e4e4e7);
  color: var(--color-text-secondary, #71717a);
}

.empty-columns {
  margin: 0;
  padding: 1rem;
  border: 1px dashed var(--color-border, #e4e4e7);
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
  text-align: center;
}

.rows-section {
  display: grid;
  gap: 0.65rem;
}

.rows-status {
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
  text-align: center;
}

.rows-status--error {
  color: #dc2626;
}

.rows-scroll {
  overflow: auto;
  max-height: 420px;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid var(--color-border, #e4e4e7);
  text-align: left;
  white-space: nowrap;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  color: var(--color-text-secondary, #71717a);
  font-size: 11px;
  background: var(--color-page-bg, #fafafa);
}

.data-table tr:last-child td {
  border-bottom: 0;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status.error {
  color: #dc2626;
}

.status.warning {
  color: #b45309;
}

.empty-state {
  max-width: 720px;
  padding: 1rem;
}

.empty-state p {
  margin: 0.35rem 0 0;
  color: inherit;
  font-size: 13px;
}

@media (max-width: 680px) {
  .relation-flow {
    grid-template-columns: 1fr;
  }

  .join-connector {
    grid-template-columns: 1fr;
  }

  .join-connector::before,
  .join-connector::after {
    display: none;
  }

  .detail-heading {
    flex-direction: column;
  }
}
</style>
