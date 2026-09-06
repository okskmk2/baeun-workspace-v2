<template>
  <section class="workspace-billing-settings">
    <hgroup>
      <h1>결제</h1>
      <p class="subtitle">이 워크스페이스로 산 슬롯 요약입니다. 영수증과 카드는 계정 결제에서 관리합니다.</p>
    </hgroup>

    <p v-if="isLoading" class="status">결제 정보를 불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <template v-else>
      <section class="summary-grid">
        <article class="summary-card">
          <p class="summary-label">프로젝트 슬롯</p>
          <p class="summary-value">{{ projectRemaining }} / {{ projectGranted }}</p>
          <p class="summary-meta">잔여 / 보유 (사용 {{ projectUsed }})</p>
        </article>
        <article class="summary-card">
          <p class="summary-label">멤버 슬롯</p>
          <p class="summary-value">{{ memberRemaining }} / {{ memberGranted }}</p>
          <p class="summary-meta">잔여 / 보유 (사용 {{ memberUsed }})</p>
        </article>
      </section>

      <section class="card">
        <h2>구매·영수증</h2>
        <p class="status muted">카드 변경과 영수증은 계정 결제 화면의 Polar 포털에서 처리합니다.</p>
        <div class="action-row">
          <router-link class="btn" :to="projectPurchaseTo">프로젝트 슬롯 구매</router-link>
          <router-link class="btn btn--secondary" :to="memberPurchaseTo">멤버 슬롯 구매</router-link>
          <router-link class="btn btn--secondary" :to="accountBillingTo">계정 결제로 이동</router-link>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { monthlyCartTo } from "../../lib/slots";

const route = useRoute();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const errorMessage = ref("");

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);

const projectGranted = computed(() => Number(workspace.value?.project_slot_total || 0));
const projectUsed = computed(() => Number(workspace.value?.project_slot_used || 0));
const projectRemaining = computed(() => Number(workspace.value?.project_slot_remaining || 0));
const memberGranted = computed(() => Number(workspace.value?.member_slot_total || 0));
const memberUsed = computed(() => Number(workspace.value?.member_slot_used || 0));
const memberRemaining = computed(() => Number(workspace.value?.member_slot_remaining || 0));

const projectPurchaseTo = computed(() => monthlyCartTo("PROJECT", workspaceId.value));
const memberPurchaseTo = computed(() => monthlyCartTo("WORKSPACE_MEMBER", workspaceId.value));
const accountBillingTo = computed(() => ({
  path: "/settings/billing",
  query: { workspaceId: String(workspaceId.value || "") },
}));

const fetchData = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await workspaceStore.fetchWorkspace(workspaceId.value);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "결제 정보를 불러오지 못했습니다.";
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

h1 {
  margin: 0;
}

.subtitle,
.status {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 16px;
}

.summary-label,
.summary-meta {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.summary-value {
  margin: 8px 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.card h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 800px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
