<template>
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
      <button type="button" class="btn btn--danger" @click="deleteTable" :disabled="isDeleting">
        {{ isDeleting ? "삭제 중..." : "테이블 삭제" }}
      </button>
    </div>
    <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
  </section>

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
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

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
    }
);

const isDeleting = ref(false);
const errorMessage = ref("");

const load = async () => {
  if (!projectId.value || !tableId.value) return;
  await dataStore.fetchTableDetail(projectId.value, tableId.value);
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
</style>
