<template>
  <hgroup>
    <div>
      <h1>{{ tableName }}</h1>
      <p class="subtitle">
        {{ t("data.tablePage.subtitle", { columns: columns.length, rows: rows.length }) }}
        <span v-if="isAsset" class="asset-badge">{{ t("data.tablePage.assetBadge") }}</span>
      </p>
    </div>
    <div class="actions">
      <button
        v-if="capabilities.can_create_row"
        type="button"
        class="btn btn--sm"
        @click="addRow"
      >
        {{ t("data.tablePage.actions.addRow") }}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" @click="reloadAll">
        {{ t("data.tablePage.actions.refresh") }}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" @click="downloadAsTsv">
        {{ t("data.tablePage.actions.download") }}
      </button>
      <router-link
        class="btn btn--icon"
        :to="`/project/${projectId}/data/${tableId}/settings`"
        :aria-label="t('data.tablePage.actions.settings')"
        :title="t('data.tablePage.actions.settings')"
      >
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <p v-if="pageType === 'form'" class="route-notice">
    {{ t("data.tablePage.notice.form") }}
  </p>
  <p v-else-if="pageType === 'chart'" class="route-notice">
    {{ t("data.tablePage.notice.chart") }}
    <router-link :to="`/project/${projectId}/data/charts/new`">
      {{ t("data.tablePage.actions.openChart") }}
    </router-link>
  </p>

  <section class="sheet-card">
    <p v-if="!hasLoaded" class="status-copy">{{ t("data.tablePage.loading") }}</p>
    <p v-else-if="columns.length === 0" class="status-copy">
      {{ t("data.tablePage.table.emptyColumns") }}
      <router-link :to="`/project/${projectId}/data/${tableId}/settings`">
        {{ t("data.tablePage.actions.settings") }}
      </router-link>
    </p>
    <div v-else class="grid-scroll">
      <table class="grid-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="`head-${column.id}`"
              :class="columnTypeClass(column)"
            >
              <span class="column-name">{{ column.name }}</span>
              <small>
                {{ typeLabel(column.type) }}
                <template v-if="column.is_required">
                  · <span class="required-star">*</span>
                  {{ t("data.tablePage.table.requiredMark") }}
                </template>
              </small>
            </th>
            <th v-if="showRowActions" class="col-actions">
              {{ t("data.tablePage.table.rowActions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="sheetColspan" class="empty-cell">
              <p>{{ t("data.tablePage.table.emptyRows") }}</p>
              <p>{{ t("data.tablePage.table.emptyRowsHelp") }}</p>
              <button
                v-if="capabilities.can_create_row"
                type="button"
                class="btn btn--sm"
                @click="addRow"
              >
                {{ t("data.tablePage.actions.addFirstRow") }}
              </button>
            </td>
          </tr>
          <tr
            v-for="row in rows"
            v-else
            :key="row.id"
            :class="{ 'is-active': String(activeRowId) === String(row.id) && isRowModalOpen }"
          >
            <td
              v-for="column in columns"
              :key="`cell-${row.id}-${column.id}`"
              :class="[
                columnTypeClass(column),
                {
                  'is-editing': isEditingCell(row, column),
                  'is-editable': canEditCell(column),
                  'is-failed': isFailedCell(row, column),
                },
              ]"
              :title="displayValue(row, column)"
              @click="startCellEdit(row, column)"
            >
              <template v-if="isEditingCell(row, column)">
                <select
                  v-if="normalizeType(column.type) === 'SELECT'"
                  :ref="setCellInput"
                  v-model="editingValue"
                  @change="commitCellEdit(row, column)"
                  @blur="commitCellEdit(row, column)"
                  @keydown.esc.prevent="cancelCellEdit"
                >
                  <option value="">{{ t("data.tablePage.selectPlaceholder") }}</option>
                  <option
                    v-for="option in resolveSelectOptions(column)"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select>
                <input
                  v-else-if="normalizeType(column.type) === 'NUMBER'"
                  :ref="setCellInput"
                  v-model="editingValue"
                  type="number"
                  @blur="commitCellEdit(row, column)"
                  @keydown.enter.prevent="commitCellEdit(row, column)"
                  @keydown.esc.prevent="cancelCellEdit"
                />
                <input
                  v-else-if="normalizeType(column.type) === 'DATE'"
                  :ref="setCellInput"
                  v-model="editingValue"
                  type="date"
                  @blur="commitCellEdit(row, column)"
                  @keydown.enter.prevent="commitCellEdit(row, column)"
                  @keydown.esc.prevent="cancelCellEdit"
                />
                <input
                  v-else
                  :ref="setCellInput"
                  v-model="editingValue"
                  type="text"
                  @blur="commitCellEdit(row, column)"
                  @keydown.enter.prevent="commitCellEdit(row, column)"
                  @keydown.esc.prevent="cancelCellEdit"
                />
                <span v-if="isSavingCell(row, column)" class="cell-saving">
                  {{ t("data.tablePage.savingCell") }}
                </span>
              </template>
              <span v-else>{{ displayValue(row, column) }}</span>
            </td>
            <td v-if="showRowActions" class="col-actions">
              <div class="row-actions">
                <button
                  v-if="capabilities.can_update_row"
                  type="button"
                  class="btn btn--secondary btn--sm"
                  @click.stop="startRowEdit(row)"
                >
                  {{ t("data.tablePage.actions.editRow") }}
                </button>
                <button
                  v-if="capabilities.can_delete_row"
                  type="button"
                  class="btn btn--danger btn--sm"
                  @click.stop="askDeleteRow(row.id)"
                >
                  {{ t("data.tablePage.actions.deleteRow") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="history-card">
    <h2>{{ t("data.tablePage.audit.title") }}</h2>
    <ul class="audit-list">
      <li v-for="log in recentLogs" :key="log.id">
        <span>{{ auditSentence(log) }}</span>
        <time>{{ formatDateTime(log.changed_at) }}</time>
      </li>
      <li v-if="recentLogs.length === 0" class="audit-empty">
        {{ t("data.tablePage.audit.empty") }}
      </li>
    </ul>
  </section>

  <BaseModal
    :open="isRowModalOpen"
    :title="rowModalTitle"
    maxWidth="640px"
    @close="closeRowModal"
    :closeOnBackdrop="false"
  >
    <form class="row-form" @submit.prevent="submitRowForm">
      <p v-if="editableColumns.length === 0" class="error-text">
        {{ t("data.tablePage.modal.emptyEditableColumns") }}
      </p>

      <div v-for="column in editableColumns" :key="`form-${column.id}`" class="row-form__item">
        <label :for="`form-${column.id}`">
          {{ column.name }}
          <span v-if="column.is_required" class="required-star">*</span>
        </label>
        <p class="field-help">{{ typeHint(column.type) }}</p>

        <input
          v-if="normalizeType(column.type) === 'TEXT'"
          :id="`form-${column.id}`"
          v-model="rowForm[column.name]"
          type="text"
        />
        <input
          v-else-if="normalizeType(column.type) === 'NUMBER'"
          :id="`form-${column.id}`"
          v-model="rowForm[column.name]"
          type="number"
        />
        <input
          v-else-if="normalizeType(column.type) === 'DATE'"
          :id="`form-${column.id}`"
          v-model="rowForm[column.name]"
          type="date"
        />
        <select
          v-else-if="normalizeType(column.type) === 'SELECT'"
          :id="`form-${column.id}`"
          v-model="rowForm[column.name]"
        >
          <option value="">{{ t("data.tablePage.selectPlaceholder") }}</option>
          <option v-for="option in resolveSelectOptions(column)" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
        <input v-else :id="`form-${column.id}`" v-model="rowForm[column.name]" type="text" />
      </div>

      <p v-if="createRowError" class="error-text">{{ createRowError }}</p>

      <div class="row-form__actions">
        <button type="button" class="btn btn--secondary" @click="closeRowModal">
          {{ t("data.tablePage.actions.cancel") }}
        </button>
        <button
          type="submit"
          class="btn"
          :disabled="isSubmittingRow || editableColumns.length === 0"
        >
          {{ isSubmittingRow ? rowModalSubmittingText : rowModalSubmitText }}
        </button>
      </div>
    </form>
  </BaseModal>

  <ConfirmDeleteModal
    :open="isDeleteOpen"
    :title="t('data.tablePage.confirm.title')"
    :message="t('data.tablePage.confirm.message')"
    :confirm-label="t('data.tablePage.confirm.confirm')"
    :deleting-label="t('data.tablePage.confirm.deleting')"
    :cancel-label="t('data.tablePage.actions.cancel')"
    @close="closeDeleteModal"
    @confirm="confirmDeleteRow"
  />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";
import BaseModal from "../../components/BaseModal.vue";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const { t } = useI18n();
const route = useRoute();
const dataStore = useDataStore();
const { rowsByKey, columnsByKey, tableDetailByKey, auditLogsByKey } = storeToRefs(dataStore);

const tableId = computed(() => String(route.params.tableId || ""));
const pageType = computed(() => String(route.params.pageType || "list"));
const projectId = computed(() => String(route.params.projectId || ""));
const tableKey = computed(() => `${projectId.value}:${tableId.value}`);

const tableDetail = computed(() => tableDetailByKey.value[tableKey.value] || null);
const tableName = computed(
  () => tableDetail.value?.table?.name || t("data.tablePage.fallbackName")
);
const isAsset = computed(() => tableDetail.value?.table?.is_asset === true);
const columns = computed(() => columnsByKey.value[tableKey.value] || []);
const editableColumns = computed(() =>
  columns.value.filter(
    (column) => column && typeof column.name === "string" && column.can_edit !== false
  )
);
const rows = computed(() => rowsByKey.value[tableKey.value] || []);
const auditLogs = computed(() => auditLogsByKey.value[tableKey.value] || []);
const recentLogs = computed(() => auditLogs.value.slice(0, 8));
const capabilities = computed(
  () =>
    tableDetail.value?.capabilities || {
      can_create_row: false,
      can_update_row: false,
      can_delete_row: false,
    }
);

const showRowActions = computed(
  () => capabilities.value.can_update_row || capabilities.value.can_delete_row
);
const sheetColspan = computed(() => columns.value.length + (showRowActions.value ? 1 : 0));

const hasLoaded = ref(false);
const isRowModalOpen = ref(false);
const rowModalMode = ref("create");
const activeRowId = ref(null);
const rowForm = ref({});
const isSubmittingRow = ref(false);
const createRowError = ref("");
const isDeleteOpen = ref(false);
const pendingDeleteRowId = ref(null);
const editingCell = ref(null);
const editingValue = ref("");
const originalValue = ref("");
const savingCellKey = ref("");
const failedCellKey = ref("");
const cellInput = ref(null);
const isCommitting = ref(false);

const setCellInput = (el) => {
  cellInput.value = el;
};

const rowModalTitle = computed(() =>
  rowModalMode.value === "edit"
    ? t("data.tablePage.modal.titleEdit")
    : t("data.tablePage.modal.titleCreate")
);
const rowModalSubmitText = computed(() =>
  rowModalMode.value === "edit"
    ? t("data.tablePage.actions.save")
    : t("data.tablePage.actions.create")
);
const rowModalSubmittingText = computed(() =>
  rowModalMode.value === "edit"
    ? t("data.tablePage.actions.saving")
    : t("data.tablePage.actions.creating")
);

const normalizeType = (type) => String(type || "TEXT").toUpperCase();
const typeLabel = (type) => t(`data.createTable.types.${normalizeType(type)}`);
const typeHint = (type) => t(`data.createTable.typeHints.${normalizeType(type)}`);
const columnTypeClass = (column) => {
  const type = normalizeType(column.type);
  if (type === "NUMBER") return "is-number";
  if (type === "DATE") return "is-date";
  if (type === "SELECT") return "is-choice";
  return "is-text";
};

const displayValue = (row, column) => {
  const value = row?.json_data?.[column.name];
  if (value === null || value === undefined) return "";
  return String(value);
};

const resolveSelectOptions = (column) => {
  if (!Array.isArray(column.options_json)) return [];
  return column.options_json.map((item) => String(item));
};

const isBlank = (value) => value === "" || value === null || value === undefined;

const toNumberOrNull = (value) => {
  if (isBlank(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const cellKey = (rowId, columnId) => `${rowId}:${columnId}`;
const canEditCell = (column) =>
  capabilities.value.can_update_row && column?.can_edit !== false;
const isEditingCell = (row, column) =>
  String(editingCell.value?.rowId) === String(row.id) &&
  String(editingCell.value?.columnId) === String(column.id);
const isSavingCell = (row, column) => savingCellKey.value === cellKey(row.id, column.id);
const isFailedCell = (row, column) => failedCellKey.value === cellKey(row.id, column.id);

const startCellEdit = async (row, column) => {
  if (!canEditCell(column)) return;
  if (isEditingCell(row, column)) return;
  editingCell.value = { rowId: row.id, columnId: column.id };
  editingValue.value = displayValue(row, column);
  originalValue.value = displayValue(row, column);
  failedCellKey.value = "";
  await nextTick();
  cellInput.value?.focus?.();
  if (cellInput.value && typeof cellInput.value.select === "function" && cellInput.value.type !== "date") {
    cellInput.value.select();
  }
};

const cancelCellEdit = () => {
  editingCell.value = null;
  editingValue.value = "";
  originalValue.value = "";
  isCommitting.value = false;
};

const commitCellEdit = async (row, column) => {
  if (!editingCell.value || isCommitting.value) return;
  if (!isEditingCell(row, column)) return;

  let nextValue = editingValue.value;
  if (normalizeType(column.type) === "NUMBER") {
    nextValue = toNumberOrNull(nextValue);
  } else if (nextValue === "") {
    nextValue = null;
  }

  const previous = originalValue.value === "" ? null : originalValue.value;
  const comparableNext = nextValue === null || nextValue === undefined ? "" : String(nextValue);
  if (comparableNext === String(previous ?? "")) {
    cancelCellEdit();
    return;
  }

  if (column.is_required && isBlank(nextValue)) {
    addToast({
      message: t("data.tablePage.error.required", { name: column.name }),
      type: "error",
    });
    cancelCellEdit();
    return;
  }

  isCommitting.value = true;
  savingCellKey.value = cellKey(row.id, column.id);
  try {
    await dataStore.patchRow(projectId.value, tableId.value, row.id, {
      [column.name]: nextValue,
    });
    failedCellKey.value = "";
    cancelCellEdit();
  } catch {
    failedCellKey.value = cellKey(row.id, column.id);
    addToast({ message: t("data.tablePage.error.saveCell"), type: "error" });
    cancelCellEdit();
  } finally {
    savingCellKey.value = "";
    isCommitting.value = false;
  }
};

const startRowEdit = (row) => {
  rowModalMode.value = "edit";
  activeRowId.value = row.id;
  const initial = {};
  editableColumns.value.forEach((column) => {
    const current = row?.json_data?.[column.name];
    initial[column.name] = current === null || current === undefined ? "" : current;
  });
  rowForm.value = initial;
  createRowError.value = "";
  isRowModalOpen.value = true;
};

const addRow = () => {
  const initial = {};
  editableColumns.value.forEach((column) => {
    initial[column.name] = "";
  });
  rowModalMode.value = "create";
  activeRowId.value = null;
  rowForm.value = initial;
  createRowError.value = "";
  isRowModalOpen.value = true;
};

const closeRowModal = () => {
  isRowModalOpen.value = false;
  activeRowId.value = null;
  createRowError.value = "";
};

const submitRowForm = async () => {
  if (editableColumns.value.length === 0) {
    createRowError.value = t("data.tablePage.modal.emptyEditableColumns");
    return;
  }

  const missing = editableColumns.value.find(
    (column) => column.is_required && isBlank(rowForm.value[column.name])
  );
  if (missing) {
    createRowError.value = t("data.tablePage.error.required", { name: missing.name });
    return;
  }

  isSubmittingRow.value = true;
  createRowError.value = "";

  try {
    const payload = {};
    editableColumns.value.forEach((column) => {
      let value = rowForm.value[column.name];
      if (normalizeType(column.type) === "NUMBER") {
        value = toNumberOrNull(value);
      }
      payload[column.name] = value === "" ? null : value;
    });

    if (rowModalMode.value === "edit" && activeRowId.value) {
      await dataStore.patchRow(projectId.value, tableId.value, activeRowId.value, payload);
      addToast({ message: t("data.tablePage.toast.rowUpdated"), type: "success" });
    } else {
      await dataStore.createRow(projectId.value, tableId.value, payload);
      addToast({ message: t("data.tablePage.toast.rowCreated"), type: "success" });
    }

    await dataStore.fetchRows(projectId.value, tableId.value);
    await dataStore.fetchAuditLogs(projectId.value, tableId.value);
    closeRowModal();
  } catch (error) {
    createRowError.value =
      error?.response?.data?.message ||
      (rowModalMode.value === "edit"
        ? t("data.tablePage.error.updateRow")
        : t("data.tablePage.error.createRow"));
  } finally {
    isSubmittingRow.value = false;
  }
};

const askDeleteRow = (rowId) => {
  pendingDeleteRowId.value = rowId;
  isDeleteOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteOpen.value = false;
  pendingDeleteRowId.value = null;
};

const confirmDeleteRow = async () => {
  const rowId = pendingDeleteRowId.value;
  if (!rowId) {
    closeDeleteModal();
    return;
  }
  try {
    await api.delete(`/data/projects/${projectId.value}/tables/${tableId.value}/rows/${rowId}`);
    await dataStore.fetchRows(projectId.value, tableId.value);
    await dataStore.fetchAuditLogs(projectId.value, tableId.value);
    addToast({ message: t("data.tablePage.toast.rowDeleted"), type: "success" });
  } catch (error) {
    addToast({
      message: error?.response?.data?.message || t("data.tablePage.error.deleteRow"),
      type: "error",
    });
  } finally {
    closeDeleteModal();
  }
};

const auditSentence = (log) => {
  const name = log.changed_by_name || t("data.tablePage.audit.system");
  const action = String(log.action || "").toUpperCase();
  if (action === "INSERT") return t("data.tablePage.audit.insert", { name });
  if (action === "UPDATE") return t("data.tablePage.audit.update", { name });
  if (action === "DELETE") return t("data.tablePage.audit.delete", { name });
  return t("data.tablePage.audit.other", { name });
};

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString();
};

const sanitizeFileName = (value = "") =>
  String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_") || "sheet";

const escapeTsvCell = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[\t\n\r"]/g.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const downloadAsTsv = () => {
  if (!columns.value.length) {
    addToast({ message: t("data.tablePage.error.downloadNoColumns"), type: "error" });
    return;
  }

  const headers = columns.value.map((column) => escapeTsvCell(column.name));
  const bodyLines = rows.value.map((row) =>
    columns.value
      .map((column) => escapeTsvCell(row?.json_data?.[column.name]))
      .join("\t")
  );

  const tsvText = [headers.join("\t"), ...bodyLines].join("\n");
  const today = new Date().toISOString().slice(0, 10);
  const fileName = `${sanitizeFileName(tableName.value)}_${today}.tsv`;

  const blob = new Blob(["\uFEFF", tsvText], {
    type: "text/tab-separated-values;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const reloadAll = async () => {
  if (!projectId.value || !tableId.value) return;
  try {
    await Promise.all([
      dataStore.fetchTableDetail(projectId.value, tableId.value),
      dataStore.fetchRows(projectId.value, tableId.value),
      dataStore.fetchAuditLogs(projectId.value, tableId.value),
    ]);
  } finally {
    hasLoaded.value = true;
  }
};

onMounted(reloadAll);

watch(
  () => [projectId.value, tableId.value],
  async ([nextProjectId, nextTableId], [prevProjectId, prevTableId]) => {
    if (!nextProjectId || !nextTableId) return;
    if (nextProjectId === prevProjectId && nextTableId === prevTableId) return;
    hasLoaded.value = false;
    await reloadAll();
  }
);
</script>

<style scoped>
.subtitle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.asset-badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  border: 1px solid #b8ebca;
  color: #186339;
  background: #e9f9ef;
}

.route-notice {
  margin: 0 0 1rem;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-accent-soft);
  font-size: 13px;
}

.route-notice a {
  margin-left: 0.35rem;
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 600;
}

.sheet-card,
.history-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-surface);
}

.sheet-card {
  margin-bottom: 1rem;
}

.history-card {
  max-width: 720px;
}

.history-card h2 {
  margin: 0 0 0.75rem;
  font-size: 15px;
}

.status-copy {
  margin: 0;
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.grid-scroll {
  overflow: auto;
  max-height: calc(100dvh - 280px);
}

.grid-table {
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.4;
}

.grid-table th,
.grid-table td {
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  padding: 10px 12px;
  vertical-align: middle;
  min-width: 168px;
  background: var(--color-surface);
}

.grid-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-surface-alt);
  text-align: left;
  font-size: 13px;
  font-weight: 700;
}

.grid-table th small {
  display: block;
  margin-top: 0.15rem;
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.column-name {
  display: block;
}

.grid-table td.is-number,
.grid-table th.is-number {
  min-width: 120px;
}

.grid-table td.is-number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.grid-table td.is-date,
.grid-table th.is-date {
  min-width: 140px;
}

.grid-table tbody tr:nth-child(even) td {
  background: color-mix(in srgb, var(--color-surface-alt) 55%, var(--color-surface) 45%);
}

.grid-table tbody tr:hover td {
  background: color-mix(in srgb, var(--color-accent-soft) 50%, var(--color-surface) 50%);
}

.grid-table tbody tr.is-active td {
  background: var(--color-accent-soft);
}

.grid-table td.is-editable {
  cursor: text;
}

.grid-table td.is-editing {
  padding: 4px;
}

.grid-table td.is-failed {
  box-shadow: inset 0 0 0 2px var(--color-danger);
}

.grid-table td.is-editing input,
.grid-table td.is-editing select {
  width: 100%;
  border: 2px solid var(--color-accent);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--color-input-bg);
}

.cell-saving {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-muted);
}

.col-actions {
  min-width: 148px;
  position: sticky;
  right: 0;
  z-index: 1;
  white-space: nowrap;
}

.grid-table thead th.col-actions {
  z-index: 3;
}

.row-actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.empty-cell {
  text-align: center;
  padding: 32px 16px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.empty-cell p {
  margin: 0 0 0.4rem;
}

.required-star {
  color: var(--color-danger);
  font-weight: 700;
}

.audit-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.audit-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
  font-size: 14px;
}

.audit-list time,
.audit-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.row-form {
  display: grid;
  gap: 12px;
}

.row-form__item {
  display: grid;
  gap: 0.35rem;
}

.row-form label {
  font-size: 13px;
}

.field-help {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.row-form input,
.row-form select {
  width: 100%;
  border: 1px solid var(--color-input-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--color-input-bg);
}

.row-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.error-text {
  color: var(--color-danger);
  margin: 0;
  font-size: 13px;
}

@media (max-width: 639px) {
  .col-actions {
    position: static;
  }
}
</style>
