<template>
  <main class="billing-page">
    <section class="hero">
      <h1>결제 내역</h1>
      <p>Polar 결제와 라이선스 상태를 확인합니다.</p>
      <div class="hero-actions">
        <button type="button" class="btn" :disabled="isOpeningPortal" @click="openPortal">
          {{ isOpeningPortal ? "포털 여는 중..." : "결제 수단 / 영수증 관리" }}
        </button>
        <router-link class="btn btn--secondary" to="/pricing">라이선스 구매</router-link>
      </div>
    </section>

    <p v-if="syncMessage" class="status">{{ syncMessage }}</p>
    <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="status">결제 내역을 불러오는 중...</p>

    <section v-else class="card">
      <h2>최근 결제</h2>
      <p v-if="!payments.length" class="status muted">아직 결제 내역이 없습니다.</p>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>상태</th>
              <th>금액</th>
              <th>라이선스</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.id">
              <td>{{ formatDate(payment.created_at) }}</td>
              <td>
                <span class="status-pill" :class="statusClass(payment.status)">{{
                  statusLabel(payment.status)
                }}</span>
              </td>
              <td>{{ formatMoney(payment.total_amount, payment.currency) }}</td>
              <td>{{ licenseSummary(payment.licenses) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";

const route = useRoute();
const payments = ref([]);
const isLoading = ref(false);
const isOpeningPortal = ref(false);
const errorMessage = ref("");
const syncMessage = ref("");
let pollTimer = null;

const statusLabel = (status) => {
  const map = {
    PENDING: "대기",
    SUCCESS: "완료",
    FAILED: "실패",
    CANCELED: "취소",
    REFUNDED: "환불",
  };
  return map[String(status || "").toUpperCase()] || status || "-";
};

const statusClass = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SUCCESS") return "ok";
  if (normalized === "PENDING") return "pending";
  if (normalized === "FAILED") return "danger";
  if (normalized === "REFUNDED") return "warn";
  return "muted";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
};

const formatMoney = (amount, currency = "USD") =>
  new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount || 0));

const licenseSummary = (licenses) => {
  if (!Array.isArray(licenses) || licenses.length === 0) return "-";
  return licenses
    .map((item) => `${item.license_name || item.target_resource} × ${item.quantity}`)
    .join(", ");
};

const fetchPayments = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.get("/payments/me");
    payments.value = response.data?.payments || [];
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "결제 내역을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const syncCheckout = async (checkoutId) => {
  syncMessage.value = "결제를 확인하는 중...";
  try {
    const response = await api.get("/payments/sync", { params: { checkout_id: checkoutId } });
    if (response.data?.fulfilled) {
      syncMessage.value = "결제가 반영되었습니다.";
      await fetchPayments();
      return true;
    }
    syncMessage.value = "결제 확인 중입니다. 잠시만 기다려 주세요.";
    return false;
  } catch (error) {
    syncMessage.value = error?.response?.data?.message || "결제 확인에 실패했습니다.";
    return true;
  }
};

const openPortal = async () => {
  isOpeningPortal.value = true;
  try {
    const response = await api.post("/payments/portal");
    const url = response.data?.url;
    if (!url) throw new Error("missing portal url");
    window.location.assign(url);
  } catch (error) {
    addToast({
      message: error?.response?.data?.message || "고객 포털을 열 수 없습니다.",
      type: "error",
    });
  } finally {
    isOpeningPortal.value = false;
  }
};

onMounted(async () => {
  await fetchPayments();
  const checkoutId = Array.isArray(route.query.checkout_id)
    ? route.query.checkout_id[0]
    : route.query.checkout_id;
  if (route.query.checkout === "success" && checkoutId) {
    const done = await syncCheckout(checkoutId);
    if (!done) {
      let attempts = 0;
      pollTimer = setInterval(async () => {
        attempts += 1;
        const finished = await syncCheckout(checkoutId);
        if (finished || attempts >= 8) {
          clearInterval(pollTimer);
          pollTimer = null;
          if (!finished) syncMessage.value = "결제는 완료됐을 수 있습니다. 잠시 후 새로고침하세요.";
        }
      }, 2000);
    }
  }
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.billing-page {
  display: grid;
  gap: 16px;
}

.hero,
.card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-page-bg);
  padding: 16px;
}

.hero {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 60%);
}

.hero h1,
.card h2 {
  margin: 0 0 8px;
}

.hero p {
  margin: 0;
  color: var(--color-text-muted);
}

.hero-actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 560px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border);
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
}

.status-pill.pending {
  color: var(--color-warning);
}

.status-pill.warn {
  color: var(--color-warning);
}

.status-pill.danger {
  color: var(--color-danger);
}

.status-pill.muted {
  color: var(--color-text-muted);
}
</style>
