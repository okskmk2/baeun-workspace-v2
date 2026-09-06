<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <h1>Workspace Slot Usage</h1>
      <router-link class="back-link" :to="{ name: 'AdminLicenses' }">목록으로</router-link>
    </header>

    <section class="wire-card">
      <h2>이 워크스페이스 슬롯 라이선스를 구매한 사용자</h2>
      <p v-if="isLoading" class="status">목록을 불러오는 중...</p>
      <p v-else-if="loadError" class="status error">{{ loadError }}</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">사용자</th>
              <th scope="col">이메일</th>
              <th scope="col">구매 수량</th>
              <th scope="col">기간</th>
              <th scope="col">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!rows.length">
              <td colspan="5" class="empty-cell">구매 내역이 없습니다.</td>
            </tr>
            <tr v-for="row in rows" v-else :key="row.purchased_license_id">
              <td>{{ row.member_name || "-" }}</td>
              <td>{{ row.member_email || "-" }}</td>
              <td>{{ Number(row.quantity || 0) }}</td>
              <td>{{ formatPeriod(row.start_date, row.end_date) }}</td>
              <td>
                <span :class="['status-pill', String(row.status || '').toUpperCase() === 'ACTIVE' ? 'ok' : 'danger']">
                  {{ String(row.status || '').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : (row.status || '-') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import api from "../../lib/axios";

const route = useRoute();
const rows = ref([]);
const isLoading = ref(false);
const loadError = ref("");

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatPeriod = (start, end) => {
  const startText = formatDateTime(start);
  const endText = end ? formatDateTime(end) : "무기한";
  return `${startText} ~ ${endText}`;
};

const fetchUsage = async () => {
  const licenseId = Number(route.query.licenseId);
  if (!licenseId) {
    loadError.value = "licenseId 쿼리가 필요합니다.";
    return;
  }

  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await api.get(`/licenses/${licenseId}/usage`);
    const usageType = String(res.data?.usage_type || "");
    if (usageType !== "WORKSPACE_PURCHASERS") {
      loadError.value = "워크스페이스 슬롯 구매 사용자 데이터가 아닙니다.";
      rows.value = [];
      return;
    }
    rows.value = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (error) {
    rows.value = [];
    loadError.value = error?.response?.data?.message || "데이터를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchUsage);
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 0;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 14px;
}

.wire-card h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
}

.empty-cell {
  color: var(--color-text-muted);
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

.status-pill.danger {
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
}

.back-link {
  color: var(--color-link, var(--color-text));
  text-decoration: underline;
}

.status {
  margin: 0 0 10px;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}
</style>
