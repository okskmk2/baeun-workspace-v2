<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>운영 홈</h1>
        <p class="admin-page__subtitle">가입 게이트, 테넌트, 공개 표면, 결제를 한 화면에서 봅니다.</p>
      </div>
    </header>

    <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>

    <section class="admin-kpi-grid">
      <router-link class="admin-kpi" :to="{ name: 'AdminApprovals' }">
        <p class="admin-kpi__label">가입 승인 대기</p>
        <p class="admin-kpi__value">{{ kpis.pendingApprovals }}</p>
      </router-link>
      <router-link class="admin-kpi" :to="{ name: 'AdminUsers' }">
        <p class="admin-kpi__label">전체 회원</p>
        <p class="admin-kpi__value">{{ kpis.members }}</p>
      </router-link>
      <article class="admin-kpi">
        <p class="admin-kpi__label">오늘 가입</p>
        <p class="admin-kpi__value">{{ kpis.todaySignups }}</p>
      </article>
      <router-link class="admin-kpi" :to="{ name: 'AdminWorkspaces' }">
        <p class="admin-kpi__label">워크스페이스</p>
        <p class="admin-kpi__value">{{ kpis.workspaces }}</p>
      </router-link>
      <router-link class="admin-kpi" :to="{ name: 'AdminProjects' }">
        <p class="admin-kpi__label">프로젝트</p>
        <p class="admin-kpi__value">{{ kpis.projects }}</p>
      </router-link>
      <router-link class="admin-kpi" :to="{ name: 'AdminPublicCatalog' }">
        <p class="admin-kpi__label">공개 워크스페이스 / 프로젝트</p>
        <p class="admin-kpi__value">{{ kpis.publicWorkspaces }} / {{ kpis.publicProjects }}</p>
      </router-link>
      <router-link class="admin-kpi" :to="{ name: 'AdminPayments' }">
        <p class="admin-kpi__label">결제 합계 (30일)</p>
        <p class="admin-kpi__value">{{ formatAdminMoney(kpis.paymentTotal30d) }}</p>
      </router-link>
      <article class="admin-kpi">
        <p class="admin-kpi__label">접속 소켓 / 만료 임박</p>
        <p class="admin-kpi__value">{{ kpis.onlineSockets }} / {{ kpis.expiringLicenses }}</p>
      </article>
    </section>

    <section class="admin-meta-grid">
      <article class="admin-card">
        <h2>승인 대기</h2>
        <p v-if="pendingApprovals.length === 0" class="admin-page__subtitle">대기 중인 가입이 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in pendingApprovals" :key="item.id">
            <router-link class="admin-link" :to="{ name: 'AdminUserDetail', params: { memberId: item.id } }">
              {{ item.name || "-" }}
            </router-link>
            <span>{{ item.email }}</span>
            <span>{{ formatAdminDateTime(item.created_at) }}</span>
          </li>
        </ul>
      </article>

      <article class="admin-card">
        <h2>14일 내 만료 라이선스</h2>
        <p v-if="expiringLicenses.length === 0" class="admin-page__subtitle">임박한 만료가 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in expiringLicenses" :key="item.id">
            <strong>{{ item.target_name || "-" }}</strong>
            <span>{{ item.license_name || item.target_resource }} × {{ item.quantity }}</span>
            <span>{{ formatAdminDate(item.end_date) }}</span>
          </li>
        </ul>
      </article>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../../lib/axios";
import { formatAdminDate, formatAdminDateTime, formatAdminMoney } from "../../lib/adminFormat";

const loadError = ref("");
const kpis = ref({
  members: 0,
  pendingApprovals: 0,
  todaySignups: 0,
  workspaces: 0,
  publicWorkspaces: 0,
  projects: 0,
  publicProjects: 0,
  paymentTotal: 0,
  paymentTotal30d: 0,
  expiringLicenses: 0,
  onlineSockets: 0,
});
const pendingApprovals = ref([]);
const expiringLicenses = ref([]);

const fetchDashboard = async () => {
  loadError.value = "";
  try {
    const res = await api.get("/admin/dashboard");
    kpis.value = { ...kpis.value, ...(res.data?.kpis || {}) };
    pendingApprovals.value = Array.isArray(res.data?.pendingApprovals) ? res.data.pendingApprovals : [];
    expiringLicenses.value = Array.isArray(res.data?.expiringLicenses) ? res.data.expiringLicenses : [];
  } catch (error) {
    loadError.value = error?.response?.data?.message || "대시보드를 불러오지 못했습니다.";
  }
};

onMounted(fetchDashboard);
</script>

<style scoped>
.admin-queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.admin-queue li {
  display: grid;
  gap: 2px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
  font-size: 13px;
}

.admin-queue li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
</style>
