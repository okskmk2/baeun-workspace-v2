<template>
  <section class="workspace-billing-settings">
    <hgroup>
      <h1>결제 관리</h1>
      <p class="subtitle">결제 상태를 확인하고 필요한 구매/영수증 페이지로 빠르게 이동하세요.</p>
    </hgroup>

    <p v-if="isLoading" class="status">결제 정보를 불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <template v-else>
      <section class="summary-grid" aria-label="결제 요약">
        <article class="summary-card">
          <p class="summary-label">워크스페이스</p>
          <p class="summary-value summary-value--name">{{ workspaceName }}</p>
          <p class="summary-meta">현재 결제 관리 대상 워크스페이스</p>
        </article>
        <article class="summary-card">
          <p class="summary-label">활성 프로젝트</p>
          <p class="summary-value">{{ projects.length }}</p>
          <p class="summary-meta">PROJECT 리소스 기준 슬롯이 필요한 프로젝트 수</p>
        </article>
        <article class="summary-card">
          <p class="summary-label">확인 가능한 결제 상태</p>
          <p class="summary-value">5</p>
          <p class="summary-meta">대기, 완료, 실패, 취소, 환불</p>
        </article>
      </section>

      <section class="card purchase-actions-card">
        <div class="card__header card__header--stack">
          <h2>구매/결제 이동</h2>
          <p class="status muted">실제 결제 생성은 퍼블릭 결제 페이지에서 진행합니다.</p>
        </div>

        <div class="action-row">
          <router-link class="btn" :to="workspacePlanTo">라이선스 구매 페이지로 이동</router-link>
          <router-link class="btn btn--secondary" :to="publicBillingTo">결제/영수증 페이지로 이동</router-link>
        </div>
      </section>

      <section class="card">
        <div class="card__header card__header--stack">
          <h2>결제 상태 안내</h2>
          <p class="status muted">
            아래 표를 기준으로 현재 결제 건의 후속 조치를 빠르게 판단할 수 있습니다.
          </p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">상태</th>
                <th scope="col">의미</th>
                <th scope="col">운영 처리</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paymentStatuses" :key="item.status">
                <td>
                  <span class="status-pill" :class="item.className">{{ item.status }}</span>
                </td>
                <td>{{ item.description }}</td>
                <td>{{ item.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const errorMessage = ref("");

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value) || []);
const workspaceName = computed(() => workspace.value?.name || `Workspace ${workspaceId.value}`);

const workspacePlanTo = computed(() => ({
  path: "/settings/plan",
  query: {
    source: "workspace-settings-billing",
    workspaceId: String(workspaceId.value || ""),
  },
}));

const publicBillingTo = computed(() => ({
  path: "/settings/billing",
  query: {
    source: "workspace-settings-billing",
    workspaceId: String(workspaceId.value || ""),
  },
}));

const paymentStatuses = [
  {
    status: "대기",
    className: "pending",
    description: "결제 승인 전 상태",
    action: "승인 완료까지 잠시 대기",
  },
  {
    status: "완료",
    className: "ok",
    description: "결제가 정상적으로 완료됨",
    action: "필요한 라이선스/슬롯이 반영되었는지 확인",
  },
  {
    status: "실패",
    className: "danger",
    description: "결제 실패",
    action: "재시도 또는 수단 변경 안내",
  },
  {
    status: "취소",
    className: "muted",
    description: "사용자/관리자 취소",
    action: "필요 시 다시 결제 진행",
  },
  {
    status: "환불",
    className: "warn",
    description: "결제 환불 처리",
    action: "환불 내역과 사용 가능 상태를 함께 확인",
  },
];

const fetchData = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([
      workspaceStore.fetchWorkspace(workspaceId.value),
      workspaceStore.fetchProjects(workspaceId.value),
    ]);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "결제 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);
watch(() => route.params.workspaceId, fetchData);
</script>

<style scoped>
.workspace-billing-settings {
  display: grid;
  gap: 16px;
}

hgroup {
  margin: 0;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 16px;
}

.summary-label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.summary-value {
  margin: 8px 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.summary-value--name {
  font-size: 1.25rem;
}

.summary-meta {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 18px;
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.card__header--stack {
  flex-direction: column;
  align-items: flex-start;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.muted {
  color: var(--color-text-muted);
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

th {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.status-pill.ok {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
}

.status-pill.pending {
  color: var(--color-warning);
  border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
}

.status-pill.warn {
  color: var(--color-warning);
  border-color: color-mix(in srgb, var(--color-warning) 45%, var(--color-border));
}

.status-pill.danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
}

.status-pill.muted {
  color: var(--color-text-muted);
}

@media (max-width: 980px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
