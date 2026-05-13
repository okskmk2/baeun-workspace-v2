<template>
  <BackLinkButton @click="goBackToTable">테이블로 돌아가기</BackLinkButton>
  <hgroup>
    <div>
      <h1>테이블 설정</h1>
      <p class="subtitle">{{ tableName }} · 버전 {{ tableVersion }}</p>
    </div>
    <div class="actions">
      <button
        type="button"
        class="btn"
        @click="requestPromotion"
        :disabled="!capabilities.can_request_promotion || isAsset"
      >
        워크스페이스 자산으로 승격 신청
      </button>
      <button type="button" class="btn" @click="createSnapshot" :disabled="!capabilities.can_delete_row">
        Snapshot 생성
      </button>
    </div>
  </hgroup>

  <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <DangerZone
    :title="'주의 구역'"
    :description="'테이블을 삭제하면 복구할 수 없습니다.'"
  >
    <template #actions>
      <button type="button" class="btn btn--danger" @click="deleteTable" :disabled="isDeleting">
        {{ isDeleting ? "삭제 중..." : "테이블 삭제" }}
      </button>
    </template>
  </DangerZone>

  <section class="wire-card settings-card">
    <h3>테이블 정보</h3>
    <dl>
      <div>
        <dt>이름</dt>
        <dd>{{ tableName }}</dd>
      </div>
      <div>
        <dt>스코프</dt>
        <dd>{{ isAsset ? "Workspace Asset" : "Project Local" }}</dd>
      </div>
      <div>
        <dt>버전</dt>
        <dd>{{ tableVersion }}</dd>
      </div>
    </dl>
    <div class="rename-form">
      <label for="table-name-input">테이블 이름 변경</label>
      <div class="rename-form__controls">
        <input
          id="table-name-input"
          v-model="tableNameInput"
          type="text"
          :disabled="!capabilities.can_rename_table || isRenaming"
        />
        <button
          type="button"
          class="btn"
          @click="renameTable"
          :disabled="!capabilities.can_rename_table || isRenaming"
        >
          {{ isRenaming ? "변경 중..." : "이름 변경" }}
        </button>
      </div>
    </div>
  </section>

  <section class="wire-card settings-card">
    <h3>테이블 스키마</h3>
    <p class="webhook-help">컬럼 추가/이름 변경/삭제/순서 변경을 수행할 수 있습니다.</p>

    <div class="schema-create">
      <input
        v-model="newColumnName"
        type="text"
        placeholder="새 컬럼 이름"
        :disabled="!capabilities.can_manage_schema || isSchemaSaving"
      />
      <select v-model="newColumnType" :disabled="!capabilities.can_manage_schema || isSchemaSaving">
        <option value="TEXT">TEXT</option>
        <option value="NUMBER">NUMBER</option>
        <option value="DATE">DATE</option>
        <option value="SELECT">SELECT</option>
      </select>
      <button
        type="button"
        class="btn"
        @click="addColumn"
        :disabled="!capabilities.can_manage_schema || isSchemaSaving"
      >
        {{ isSchemaSaving ? "처리 중..." : "컬럼 추가" }}
      </button>
    </div>

    <p v-if="schemaErrorMessage" class="status error">{{ schemaErrorMessage }}</p>

    <ul class="schema-list">
      <li v-for="(column, index) in schemaColumns" :key="column.id" class="schema-item">
        <div class="schema-item__main">
          <input
            v-model="column.editName"
            type="text"
            :disabled="!capabilities.can_manage_schema || isSchemaSaving"
          />
          <span class="meta-badge is-type">{{ String(column.type || "").toUpperCase() }}</span>
        </div>

        <div class="schema-item__actions">
          <button
            type="button"
            class="btn"
            @click="moveColumn(index, -1)"
            :aria-label="'위로 이동'"
            :disabled="!capabilities.can_manage_schema || isSchemaSaving || index === 0"
          >
            <MaterialSymbol name="arrow_upward" :size="16" alt="" />
          </button>
          <button
            type="button"
            class="btn"
            @click="moveColumn(index, 1)"
            :aria-label="'아래로 이동'"
            :disabled="!capabilities.can_manage_schema || isSchemaSaving || index === schemaColumns.length - 1"
          >
            <MaterialSymbol name="arrow_downward" :size="16" alt="" />
          </button>
          <button
            type="button"
            class="btn"
            @click="renameColumn(column)"
            :disabled="!capabilities.can_manage_schema || isSchemaSaving"
          >
            이름 변경
          </button>
          <button
            type="button"
            class="btn btn--danger"
            @click="deleteColumn(column)"
            :disabled="!capabilities.can_manage_schema || isSchemaSaving"
          >
            삭제
          </button>
        </div>
      </li>
    </ul>
  </section>

  <section class="wire-card settings-card">
    <h3>웹훅 설정 (프로토타입)</h3>
    <p class="webhook-help">현재 화면에서만 동작하는 UI 프로토타입입니다. 서버에는 저장되지 않습니다.</p>

    <div class="webhook-form">
      <label for="webhook-url-input">웹훅 URL</label>
      <input
        id="webhook-url-input"
        v-model="webhookUrl"
        type="url"
        placeholder="https://example.com/hooks/table-events"
      />
    </div>

    <div class="webhook-form">
      <label for="webhook-secret-input">서명 시크릿 (선택)</label>
      <input id="webhook-secret-input" v-model="webhookSecret" type="text" placeholder="whsec_..." />
    </div>

    <div class="webhook-events">
      <p class="webhook-events__title">웹훅 이벤트</p>
      <label class="webhook-event-item">
        <input v-model="webhookEvents.addOrDelete" type="checkbox" />
        <span>테이블 데이터 추가/삭제</span>
      </label>
      <label class="webhook-event-item">
        <input v-model="webhookEvents.dataUpdated" type="checkbox" />
        <span>테이블 데이터 변경 시</span>
      </label>
      <label class="webhook-event-item">
        <input v-model="webhookEvents.tableRenamed" type="checkbox" />
        <span>테이블 이름 변경 시</span>
      </label>
      <label class="webhook-event-item">
        <input v-model="webhookEvents.tableDeleted" type="checkbox" />
        <span>테이블 삭제 시</span>
      </label>
    </div>

    <div class="settings-actions webhook-actions">
      <button type="button" class="btn" @click="saveWebhookSettings">웹훅 설정 저장 (로컬)</button>
      <button type="button" class="btn" @click="previewWebhookPayload" :disabled="!hasSelectedWebhookEvent">
        테스트 페이로드 미리보기
      </button>
    </div>

    <p v-if="webhookStatus.message" class="status" :class="webhookStatus.type">
      {{ webhookStatus.message }}
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";
import BackLinkButton from "../../components/BackLinkButton.vue";
import DangerZone from "../../components/DangerZone.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const { tableDetailByKey } = storeToRefs(dataStore);

const projectId = computed(() => String(route.params.projectId || ""));
const tableId = computed(() => String(route.params.tableId || ""));
const tableKey = computed(() => `${projectId.value}:${tableId.value}`);

const tableDetail = computed(() => tableDetailByKey.value[tableKey.value] || null);
const tableName = computed(() => tableDetail.value?.table?.name || "데이터 테이블");
const tableVersion = computed(() => tableDetail.value?.table?.version || 1);
const isAsset = computed(() => tableDetail.value?.table?.is_asset === true);
const capabilities = computed(
  () =>
    tableDetail.value?.capabilities || {
      can_delete_row: false,
      can_request_promotion: false,
      can_rename_table: false,
      can_manage_schema: false,
    }
);

const isDeleting = ref(false);
const isRenaming = ref(false);
const errorMessage = ref("");
const tableNameInput = ref("");
const schemaColumns = ref([]);
const newColumnName = ref("");
const newColumnType = ref("TEXT");
const isSchemaSaving = ref(false);
const schemaErrorMessage = ref("");
const webhookUrl = ref("");
const webhookSecret = ref("");
const webhookEvents = ref({
  addOrDelete: true,
  dataUpdated: true,
  tableRenamed: true,
  tableDeleted: true,
});
const webhookStatus = ref({ type: "", message: "" });

const hasSelectedWebhookEvent = computed(() => Object.values(webhookEvents.value).some(Boolean));

const isValidWebhookUrl = (value) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

watch(
  tableName,
  (next) => {
    tableNameInput.value = String(next || "");
  },
  { immediate: true }
);

watch(
  () => tableDetail.value?.columns,
  (nextColumns) => {
    const source = Array.isArray(nextColumns) ? nextColumns : [];
    schemaColumns.value = source.map((column) => ({
      ...column,
      editName: String(column?.name || ""),
    }));
  },
  { immediate: true }
);

const goBackToTable = () => {
  if (projectId.value && tableId.value) {
    router.push(`/project/${projectId.value}/data/${tableId.value}/list`);
    return;
  }
  router.back();
};

const load = async () => {
  if (!projectId.value || !tableId.value) return;
  await dataStore.fetchTableDetail(projectId.value, tableId.value);
};

const addColumn = async () => {
  schemaErrorMessage.value = "";
  const name = String(newColumnName.value || "").trim();
  if (!name) {
    schemaErrorMessage.value = "컬럼 이름을 입력하세요.";
    return;
  }

  isSchemaSaving.value = true;
  try {
    await dataStore.addTableColumn(projectId.value, tableId.value, {
      name,
      type: newColumnType.value,
    });
    newColumnName.value = "";
    newColumnType.value = "TEXT";
    addToast({ message: "컬럼이 추가되었습니다.", type: "success" });
  } catch (error) {
    schemaErrorMessage.value = error?.response?.data?.message || "컬럼 추가에 실패했습니다.";
  } finally {
    isSchemaSaving.value = false;
  }
};

const renameColumn = async (column) => {
  schemaErrorMessage.value = "";
  const nextName = String(column?.editName || "").trim();
  if (!nextName) {
    schemaErrorMessage.value = "컬럼 이름을 입력하세요.";
    return;
  }
  if (nextName === String(column?.name || "")) return;

  isSchemaSaving.value = true;
  try {
    await dataStore.renameTableColumn(projectId.value, tableId.value, column.id, nextName);
    addToast({ message: "컬럼 이름이 변경되었습니다.", type: "success" });
  } catch (error) {
    schemaErrorMessage.value = error?.response?.data?.message || "컬럼 이름 변경에 실패했습니다.";
  } finally {
    isSchemaSaving.value = false;
  }
};

const deleteColumn = async (column) => {
  schemaErrorMessage.value = "";
  const confirmed = window.confirm(`컬럼 '${column?.name || ""}' 을(를) 삭제하시겠습니까?`);
  if (!confirmed) return;

  isSchemaSaving.value = true;
  try {
    await dataStore.deleteTableColumn(projectId.value, tableId.value, column.id);
    addToast({ message: "컬럼이 삭제되었습니다.", type: "success" });
  } catch (error) {
    schemaErrorMessage.value = error?.response?.data?.message || "컬럼 삭제에 실패했습니다.";
  } finally {
    isSchemaSaving.value = false;
  }
};

const moveColumn = async (index, direction) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= schemaColumns.value.length) return;

  schemaErrorMessage.value = "";
  const nextColumns = [...schemaColumns.value];
  const [picked] = nextColumns.splice(index, 1);
  nextColumns.splice(nextIndex, 0, picked);
  schemaColumns.value = nextColumns;

  isSchemaSaving.value = true;
  try {
    await dataStore.reorderTableColumns(
      projectId.value,
      tableId.value,
      nextColumns.map((column) => column.id)
    );
    addToast({ message: "컬럼 순서가 변경되었습니다.", type: "success" });
  } catch (error) {
    schemaErrorMessage.value = error?.response?.data?.message || "컬럼 순서 변경에 실패했습니다.";
    await load();
  } finally {
    isSchemaSaving.value = false;
  }
};

const renameTable = async () => {
  errorMessage.value = "";
  const nextName = String(tableNameInput.value || "").trim();

  if (!nextName) {
    errorMessage.value = "테이블 이름을 입력하세요.";
    return;
  }

  if (nextName === tableName.value) {
    return;
  }

  isRenaming.value = true;
  try {
    await dataStore.renameTable(projectId.value, tableId.value, nextName);
    addToast({ message: "테이블 이름이 변경되었습니다.", type: "success" });
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "테이블 이름 변경에 실패했습니다.";
  } finally {
    isRenaming.value = false;
  }
};

const requestPromotion = async () => {
  errorMessage.value = "";
  try {
    await dataStore.requestPromotion(projectId.value, tableId.value);
    addToast({ message: "승격 신청이 접수되었습니다.", type: "success" });
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "승격 신청에 실패했습니다.";
  }
};

const createSnapshot = async () => {
  errorMessage.value = "";
  const label = window.prompt("Snapshot 라벨을 입력하세요.", "manual");
  if (label === null) return;

  try {
    await dataStore.createSnapshot(projectId.value, tableId.value, label);
    addToast({ message: "Snapshot이 생성되었습니다.", type: "success" });
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "Snapshot 생성에 실패했습니다.";
  }
};

const deleteTable = async () => {
  errorMessage.value = "";
  const confirmed = window.confirm("테이블을 삭제하시겠습니까? 삭제 후 목록에서 사라집니다.");
  if (!confirmed) return;

  isDeleting.value = true;
  try {
    await dataStore.deleteTable(projectId.value, tableId.value);
    addToast({ message: "테이블이 삭제되었습니다.", type: "success" });
    router.push(`/project/${projectId.value}/data`);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "테이블 삭제에 실패했습니다.";
  } finally {
    isDeleting.value = false;
  }
};

const saveWebhookSettings = () => {
  webhookStatus.value = { type: "", message: "" };

  if (!isValidWebhookUrl(String(webhookUrl.value || "").trim())) {
    webhookStatus.value = { type: "error", message: "유효한 웹훅 URL(http/https)을 입력하세요." };
    return;
  }

  if (!hasSelectedWebhookEvent.value) {
    webhookStatus.value = { type: "error", message: "최소 1개 이상의 웹훅 이벤트를 선택하세요." };
    return;
  }

  webhookStatus.value = { type: "success", message: "웹훅 설정이 로컬 프로토타입 상태로 저장되었습니다." };
  addToast({ message: "웹훅 프로토타입 설정이 저장되었습니다.", type: "success" });
};

const previewWebhookPayload = () => {
  const selectedEvents = Object.entries(webhookEvents.value)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  const payloadPreview = {
    table_id: tableId.value,
    table_name: tableName.value,
    events: selectedEvents,
    has_secret: Boolean(String(webhookSecret.value || "").trim()),
  };

  webhookStatus.value = {
    type: "success",
    message: `미리보기 준비 완료: ${JSON.stringify(payloadPreview)}`,
  };
};

onMounted(load);
</script>

<style scoped>
.settings-card {
  padding: 1rem;
  margin-top: 0.8rem;
}

.settings-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
}

dt {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

dd {
  margin: 0.2rem 0 0;
  font-weight: 700;
}

.status.error {
  color: #dc2626;
  margin-top: 0.6rem;
}

.status.success {
  color: #166534;
  margin-top: 0.6rem;
}

.rename-form {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.45rem;
}

.rename-form label {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

.rename-form__controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rename-form input {
  min-width: 260px;
  flex: 1;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
}

.webhook-help {
  margin: 0.35rem 0 0.8rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
}

.webhook-form {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.7rem;
}

.webhook-form label {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

.webhook-form input {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
}

.webhook-events {
  margin-top: 0.9rem;
  padding: 0.8rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 10px;
  display: grid;
  gap: 0.55rem;
}

.webhook-events__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.webhook-event-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 14px;
}

.webhook-actions {
  margin-top: 0.85rem;
}

.schema-create {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.schema-create input,
.schema-create select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.65rem;
}

.schema-list {
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
}

.schema-item {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 10px;
  padding: 0.65rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.schema-item__main {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.schema-item__main input {
  min-width: 220px;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
}

.schema-item__actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
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
</style>
