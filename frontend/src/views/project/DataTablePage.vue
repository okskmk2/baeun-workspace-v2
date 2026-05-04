<template>
  <hgroup>
    <div>
      <h1>{{ pageTitle }}</h1>
      <p class="subtitle">{{ tableName }} · {{ pageTypeLabel }} · 버전 {{ tableVersion }}</p>
    </div>
    <div class="actions">
      <button type="button" class="btn btn--secondary btn--sm" @click="addRow" :disabled="!capabilities.can_create_row">
        행 추가
      </button>
      <button type="button" class="btn  btn--secondary btn--sm" @click="reloadAll">새로고침</button>
      <router-link class="btn btn--icon" :to="`/project/${projectId}/data/${tableId}/settings`">
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <section v-if="pageType !== 'list'" class="wire-card placeholder">
    <p>
      {{ pageTypeLabel }} 뷰는 위키 임베딩 확장을 고려해 준비 중입니다. 현재는 목록 뷰를 사용하세요.
    </p>
  </section>

  <section v-else class="wire-card grid-wrap">
    <div class="grid-scroll">
      <table class="grid-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="`head-${column.id}`">
              <div class="column-head">
                <div class="column-head__title">
                  <span>{{ column.name }}</span>
                  <span class="meta-badge is-type">{{ getTypeLabel(column.type) }}</span>
                </div>
                <div class="column-head__meta">
                  <span v-if="column.is_required" class="meta-badge is-required">필수</span>
                </div>
              </div>
            </th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length + 1" class="empty-cell">데이터가 없습니다.</td>
          </tr>
          <tr v-for="row in rows" v-else :key="row.id">
            <td v-for="column in columns" :key="`cell-${row.id}-${column.id}`">
              <span>{{ displayValue(row, column) || "-" }}</span>
            </td>
            <td>
              <div class="row-actions">
                <button
                  type="button"
                  class="btn"
                  :disabled="!capabilities.can_update_row"
                  @click="startRowEdit(row)"
                >
                  수정
                </button>
                <button
                  type="button"
                  class="btn btn--danger"
                  :disabled="!capabilities.can_delete_row"
                  @click="removeRow(row.id)"
                >
                  삭제
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <BaseModal
    :open="isRowModalOpen"
    :title="rowModalTitle"
    maxWidth="640px"
    @close="closeRowModal"
    :closeOnBackdrop="false"
  >
    <form class="row-form" @submit.prevent="submitRowForm">
      <p v-if="editableColumns.length === 0" class="empty-cell">
        입력 가능한 컬럼이 없습니다. 컬럼 권한을 확인하세요.
      </p>

      <div v-for="column in editableColumns" :key="`create-${column.id}`" class="row-form__item">
        <label :for="`create-${column.id}`">{{ column.name }}</label>
        <p class="field-meta">
          <span class="meta-badge is-type">{{ getTypeLabel(column.type) }}</span>
          <span v-if="column.is_required" class="meta-badge is-required">필수 입력</span>
        </p>

        <input
          v-if="column.type === 'TEXT'"
          :id="`create-${column.id}`"
          v-model="rowForm[column.name]"
          type="text"
        />

        <input
          v-else-if="column.type === 'NUMBER'"
          :id="`create-${column.id}`"
          v-model.number="rowForm[column.name]"
          type="number"
        />

        <input
          v-else-if="column.type === 'DATE'"
          :id="`create-${column.id}`"
          v-model="rowForm[column.name]"
          type="date"
        />

        <select
          v-else-if="column.type === 'SELECT'"
          :id="`create-${column.id}`"
          v-model="rowForm[column.name]"
        >
          <option value="">선택</option>
          <option v-for="option in resolveSelectOptions(column)" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <input v-else :id="`create-${column.id}`" v-model="rowForm[column.name]" type="text" />
      </div>

      <p v-if="createRowError" class="error-text">{{ createRowError }}</p>

      <div class="row-form__actions">
        <button type="button" class="btn" @click="closeRowModal">취소</button>
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

  <section class="wire-card summary">
    <h3>변경 이력</h3>
    <ul class="audit-list">
      <li v-for="log in auditLogs.slice(0, 8)" :key="log.id">
        <strong>{{ log.action }}</strong>
        <span>{{ log.changed_by_name || "시스템" }}</span>
        <time>{{ formatDateTime(log.changed_at) }}</time>
      </li>
      <li v-if="auditLogs.length === 0" class="empty-cell">이력이 없습니다.</li>
    </ul>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";
import BaseModal from "../../components/BaseModal.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const { rowsByKey, columnsByKey, tableDetailByKey, auditLogsByKey } = storeToRefs(dataStore);

const tableId = computed(() => String(route.params.tableId || ""));
const pageType = computed(() => String(route.params.pageType || "list"));
const projectId = computed(() => String(route.params.projectId || ""));
const tableKey = computed(() => `${projectId.value}:${tableId.value}`);

const pageTypeMap = { list: "목록", form: "폼", chart: "시각화" };
const tableDetail = computed(() => tableDetailByKey.value[tableKey.value] || null);
const tableName = computed(() => tableDetail.value?.table?.name || "데이터 테이블");
const tableVersion = computed(() => tableDetail.value?.table?.version || 1);
const columns = computed(() => columnsByKey.value[tableKey.value] || []);
const editableColumns = computed(() =>
  columns.value.filter(
    (column) => column && typeof column.name === "string" && column.can_edit !== false
  )
);
const rows = computed(() => rowsByKey.value[tableKey.value] || []);
const auditLogs = computed(() => auditLogsByKey.value[tableKey.value] || []);
const capabilities = computed(
  () =>
    tableDetail.value?.capabilities || {
      can_create_row: false,
      can_update_row: false,
      can_delete_row: false,
      can_request_promotion: false,
    }
);

const pageTypeLabel = computed(() => pageTypeMap[pageType.value] || "목록");
const pageTitle = computed(() => `${tableName.value} · ${pageTypeLabel.value}`);
const isRowModalOpen = ref(false);
const rowModalMode = ref("create");
const activeRowId = ref(null);
const rowForm = ref({});
const isSubmittingRow = ref(false);
const createRowError = ref("");
const rowModalTitle = computed(() => (rowModalMode.value === "edit" ? "행 수정" : "행 추가"));
const rowModalSubmitText = computed(() => (rowModalMode.value === "edit" ? "저장" : "생성"));
const rowModalSubmittingText = computed(() =>
  rowModalMode.value === "edit" ? "저장 중..." : "생성 중..."
);

const displayValue = (row, column) => {
  const value = row?.json_data?.[column.name];
  if (value === null || value === undefined) return "";
  return String(value);
};

const resolveSelectOptions = (column) => {
  if (!Array.isArray(column.options_json)) return [];
  return column.options_json.map((item) => String(item));
};

const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getTypeLabel = (type) => {
  const normalized = String(type || "").toUpperCase();
  if (normalized === "TEXT") return "Text";
  if (normalized === "NUMBER") return "Number";
  if (normalized === "DATE") return "Date";
  if (normalized === "SELECT") return "Select";
  return normalized || "Unknown";
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

const addRow = async () => {
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
    createRowError.value = "입력 가능한 컬럼이 없습니다.";
    return;
  }

  isSubmittingRow.value = true;
  createRowError.value = "";

  try {
    const payload = {};
    editableColumns.value.forEach((column) => {
      let value = rowForm.value[column.name];
      if (column.type === "NUMBER") {
        value = toNumberOrNull(value);
      }
      payload[column.name] = value === "" ? null : value;
    });

    if (rowModalMode.value === "edit" && activeRowId.value) {
      await dataStore.patchRow(projectId.value, tableId.value, activeRowId.value, payload);
      addToast({ message: "행이 수정되었습니다.", type: "success" });
    } else {
      await dataStore.createRow(projectId.value, tableId.value, payload);
      addToast({ message: "행이 추가되었습니다.", type: "success" });
    }

    await dataStore.fetchRows(projectId.value, tableId.value);
    await dataStore.fetchAuditLogs(projectId.value, tableId.value);
    closeRowModal();
  } catch (error) {
    createRowError.value =
      error?.response?.data?.message ||
      (rowModalMode.value === "edit" ? "행 수정에 실패했습니다." : "행 추가에 실패했습니다.");
  } finally {
    isSubmittingRow.value = false;
  }
};

const removeRow = async (rowId) => {
  const confirmed = window.confirm("이 행을 삭제하시겠습니까?");
  if (!confirmed) return;
  try {
    await api.delete(`/data/projects/${projectId.value}/tables/${tableId.value}/rows/${rowId}`);
    await dataStore.fetchRows(projectId.value, tableId.value);
    await dataStore.fetchAuditLogs(projectId.value, tableId.value);
    addToast({ message: "행이 삭제되었습니다.", type: "success" });
  } catch (error) {
    addToast({
      message: error?.response?.data?.message || "행 삭제에 실패했습니다.",
      type: "error",
    });
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString();
};

const reloadAll = async () => {
  await Promise.all([
    dataStore.fetchTableDetail(projectId.value, tableId.value),
    dataStore.fetchRows(projectId.value, tableId.value),
    dataStore.fetchAuditLogs(projectId.value, tableId.value),
  ]);
};

onMounted(reloadAll);

watch(
  () => [projectId.value, tableId.value],
  async ([nextProjectId, nextTableId], [prevProjectId, prevTableId]) => {
    if (!nextProjectId || !nextTableId) return;
    if (nextProjectId === prevProjectId && nextTableId === prevTableId) return;
    await reloadAll();
  }
);
</script>

<style scoped>
.toolbar,
.summary,
.placeholder,
.grid-wrap {
  padding: 1rem;
  margin-top: 0.8rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar__left,
.toolbar__right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.grid-scroll {
  overflow-x: auto;
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
}

.grid-table th,
.grid-table td {
  border-bottom: 1px solid var(--color-border, #e4e4e7);
  padding: 0.5rem;
  vertical-align: top;
}

.column-head {
  display: grid;
  gap: 0.3rem;
}

.column-head__title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.column-head__meta {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.grid-table input,
.grid-table select {
  width: 100%;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.4rem 0.55rem;
}

.empty-cell {
  color: var(--color-text-secondary, #71717a);
}

.audit-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
}

.audit-list li {
  display: grid;
  grid-template-columns: 13rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: center;
}

.audit-list time {
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.row-form {
  display: grid;
  gap: 0.75rem;
}

.row-form__item {
  display: grid;
  gap: 0.35rem;
}

.field-meta {
  margin: 0;
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
  line-height: 1.3;
}

.meta-badge.is-type {
  background: #eaf3ff;
  border-color: #c9ddff;
  color: #1d4f91;
}

.meta-badge.is-required {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.row-form input,
.row-form select {
  width: 100%;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
}

.row-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.error-text {
  color: #dc2626;
  margin: 0;
}
</style>
