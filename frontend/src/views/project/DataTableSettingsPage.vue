<template>
  <BackLinkButton @click="goBackToTable">테이블로 돌아가기</BackLinkButton>
  <hgroup>
    <h1>테이블 설정</h1>
    <p class="subtitle">{{ tableName }} · 버전 {{ tableVersion }}</p>
  </hgroup>

  <section class="wire-card settings-card">
    <h3>액션</h3>
    <div class="settings-actions">
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
    <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
  </section>

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
    }
);

const isDeleting = ref(false);
const isRenaming = ref(false);
const errorMessage = ref("");
const tableNameInput = ref("");
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
</style>
