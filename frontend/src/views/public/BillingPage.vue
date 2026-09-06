<template>
  <main class="billing-page">
    <hgroup class="hero">
      <div>
        <h1>{{ t("settings.billing.title") }}</h1>
        <p>{{ t("settings.billing.subtitle") }}</p>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn" :disabled="isOpeningPortal || !canOpenPortal" @click="openPortal">
          {{ isOpeningPortal ? t("settings.billing.portal.opening") : t("settings.billing.portal.open") }}
        </button>
        <router-link class="btn btn--secondary" to="/pricing">{{ t("settings.billing.buySlots") }}</router-link>
      </div>
    </hgroup>
    <p v-if="!canOpenPortal && !isLoading" class="status muted">{{ t("settings.billing.portal.unavailable") }}</p>

    <p v-if="bannerMessage" class="banner" :class="bannerClass">{{ bannerMessage }}</p>
    <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="status">{{ t("settings.billing.loading") }}</p>

    <template v-else>
      <section class="slot-strip">
        <p>
          {{
            t("settings.billing.slotStrip", {
              remaining: workspaceSlot.remaining,
              granted: workspaceSlot.granted,
            })
          }}
        </p>
        <router-link to="/settings/plan">{{ t("settings.billing.slotStripLink") }}</router-link>
      </section>

      <section class="card">
        <h2>{{ t("settings.billing.subscriptions.title") }}</h2>
        <p v-if="!subscriptions.length" class="status muted">{{ t("settings.billing.subscriptions.empty") }}</p>
        <ul v-else class="subscription-list">
          <li v-for="item in subscriptions" :key="item.id" class="subscription-card">
            <div>
              <p class="subscription-name">{{ item.license_name }} · {{ cycleLabel(item.billing_cycle) }}</p>
              <p class="status muted">
                {{ t("settings.billing.subscriptions.quantity", { count: item.quantity }) }}
                ·
                {{
                  item.cancel_at_period_end
                    ? t("settings.billing.subscriptions.until", { date: formatDate(item.end_date) })
                    : t("settings.billing.subscriptions.renews", { date: formatDate(item.end_date) })
                }}
              </p>
            </div>
            <span class="status-pill" :class="item.cancel_at_period_end ? 'warn' : 'ok'">
              {{
                item.cancel_at_period_end
                  ? t("settings.slots.status.canceling")
                  : t("settings.slots.status.active")
              }}
            </span>
          </li>
        </ul>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>{{ t("settings.billing.history.title") }}</h2>
          <select v-model="statusFilter" class="status-filter" @change="onStatusFilterChange">
            <option value="">{{ t("settings.billing.history.filters.all") }}</option>
            <option value="SUCCESS">{{ t("settings.billing.status.SUCCESS") }}</option>
            <option value="PENDING">{{ t("settings.billing.status.PENDING") }}</option>
            <option value="FAILED">{{ t("settings.billing.status.FAILED") }}</option>
            <option value="CANCELED">{{ t("settings.billing.status.CANCELED") }}</option>
            <option value="REFUNDED">{{ t("settings.billing.status.REFUNDED") }}</option>
          </select>
        </div>

        <p v-if="pendingCount" class="status warn">
          {{ t("settings.billing.history.pending", { count: pendingCount }) }}
        </p>
        <p v-if="!visiblePayments.length" class="status muted">{{ t("settings.billing.history.empty") }}</p>

        <div v-else class="table-wrap history-table">
          <table>
            <thead>
              <tr>
                <th>{{ t("settings.billing.history.columns.date") }}</th>
                <th>{{ t("settings.billing.history.columns.status") }}</th>
                <th>{{ t("settings.billing.history.columns.amount") }}</th>
                <th>{{ t("settings.billing.history.columns.items") }}</th>
                <th>{{ t("settings.billing.history.columns.provider") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in visiblePayments" :key="payment.id">
                <td>{{ formatDateTime(payment.created_at) }}</td>
                <td>
                  <span class="status-pill" :class="statusClass(payment.status)">
                    {{ statusLabel(payment.status) }}
                  </span>
                </td>
                <td>{{ formatMoney(payment.total_amount, payment.currency) }}</td>
                <td>{{ licenseSummary(payment.licenses) }}</td>
                <td>{{ payment.provider || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="history-cards">
          <li v-for="payment in visiblePayments" :key="`card-${payment.id}`" class="history-card">
            <div class="history-card__row">
              <span class="status-pill" :class="statusClass(payment.status)">
                {{ statusLabel(payment.status) }}
              </span>
              <strong>{{ formatMoney(payment.total_amount, payment.currency) }}</strong>
            </div>
            <p>{{ licenseSummary(payment.licenses) }}</p>
            <p class="status muted">{{ formatDateTime(payment.created_at) }} · {{ payment.provider }}</p>
          </li>
        </ul>

        <div v-if="pagination.totalPages > 1" class="pager">
          <button type="button" class="btn btn--secondary btn--sm" :disabled="pagination.page <= 1" @click="fetchBilling({ page: pagination.page - 1 })">
            {{ t("settings.billing.history.prev") }}
          </button>
          <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="pagination.page >= pagination.totalPages"
            @click="fetchBilling({ page: pagination.page + 1 })"
          >
            {{ t("settings.billing.history.next") }}
          </button>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { emptySlot } from "../../lib/slots";

const { t } = useI18n();
const route = useRoute();

const payments = ref([]);
const licenses = ref([]);
const workspaceSlot = ref(emptySlot("WORKSPACE"));
const pagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
const statusFilter = ref("");
const isLoading = ref(false);
const isOpeningPortal = ref(false);
const errorMessage = ref("");
const bannerMessage = ref("");
const bannerClass = ref("");
let pollTimer = null;

const workspaceFilterId = computed(() => {
  const value = route.query.workspaceId;
  return Array.isArray(value) ? value[0] : value;
});

const canOpenPortal = computed(() =>
  (payments.value || []).some((item) => String(item.provider || "").toUpperCase() === "POLAR")
);

const subscriptions = computed(() =>
  (licenses.value || []).filter(
    (item) => item.polar_subscription_id && String(item.status || "").toUpperCase() === "ACTIVE"
  )
);

const visiblePayments = computed(() => payments.value);

const pendingCount = computed(
  () => (payments.value || []).filter((item) => String(item.status || "").toUpperCase() === "PENDING").length
);

const cycleLabel = (cycle) => {
  const normalized = String(cycle || "").toUpperCase();
  if (normalized === "MONTHLY") return t("settings.slots.cycles.monthly");
  if (normalized === "YEARLY") return t("settings.slots.cycles.yearly");
  if (normalized === "LIFETIME") return t("settings.slots.cycles.lifetime");
  return cycle || "-";
};

const statusLabel = (status) => t(`settings.billing.status.${String(status || "").toUpperCase()}`) || status;

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
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatMoney = (amount, currency = "USD") =>
  new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount || 0));

const licenseSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return "-";
  return items
    .map((item) => `${item.license_name || item.target_resource} × ${item.quantity}`)
    .join(", ");
};

const onStatusFilterChange = () => fetchBilling({ page: 1 });

const fetchBilling = async ({ page } = {}) => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [meRes, entitlementRes] = await Promise.all([
      api.get("/payments/me", {
        params: {
          page: page || pagination.value.page,
          pageSize: pagination.value.pageSize,
          workspaceId: workspaceFilterId.value || undefined,
          status: statusFilter.value || undefined,
        },
      }),
      api.get("/payments/entitlements"),
    ]);
    payments.value = meRes.data?.payments || [];
    licenses.value = meRes.data?.licenses || [];
    pagination.value = {
      page: meRes.data?.pagination?.page || 1,
      pageSize: meRes.data?.pagination?.pageSize || 10,
      total: meRes.data?.pagination?.total || 0,
      totalPages: meRes.data?.pagination?.totalPages || 1,
    };
    workspaceSlot.value = entitlementRes.data?.workspace || emptySlot("WORKSPACE");
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("settings.billing.error");
  } finally {
    isLoading.value = false;
  }
};

const syncCheckout = async (checkoutId) => {
  bannerMessage.value = t("settings.billing.banner.checking");
  bannerClass.value = "";
  try {
    const response = await api.get("/payments/sync", { params: { checkout_id: checkoutId } });
    if (response.data?.fulfilled) {
      bannerMessage.value = t("settings.billing.banner.success");
      bannerClass.value = "ok";
      await fetchBilling({ page: 1 });
      return true;
    }
    bannerMessage.value = t("settings.billing.banner.waiting");
    return false;
  } catch (error) {
    bannerMessage.value = error?.response?.data?.message || t("settings.billing.banner.failed");
    bannerClass.value = "error";
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
      message:
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        t("settings.billing.portal.error"),
      type: "error",
    });
  } finally {
    isOpeningPortal.value = false;
  }
};

onMounted(async () => {
  await fetchBilling({ page: 1 });
  if (route.query.checkout === "cancel") {
    bannerMessage.value = t("settings.billing.banner.cancel");
    bannerClass.value = "warn";
  }
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
          if (!finished) bannerMessage.value = t("settings.billing.banner.timeout");
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

.hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 60%);
  padding: 16px;
}

h1 {
  margin: 0 0 8px;
}

.hero p,
.subtitle,
.status {
  margin: 0;
  color: var(--color-text-muted);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.banner {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.banner.ok {
  color: var(--color-success);
}

.banner.error,
.status.error {
  color: var(--color-danger);
}

.banner.warn,
.status.warn {
  color: var(--color-warning);
}

.slot-strip,
.card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 16px;
}

.slot-strip {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.slot-strip p {
  margin: 0;
}

.card {
  display: grid;
  gap: 10px;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.card__header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.status-filter {
  min-height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-page-bg);
  color: var(--color-text);
  padding: 0 8px;
}

.subscription-list,
.history-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.subscription-card,
.history-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.subscription-name {
  margin: 0 0 4px;
  font-weight: 700;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
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
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.status-pill.ok {
  color: var(--color-success);
}

.status-pill.pending,
.status-pill.warn {
  color: var(--color-warning);
}

.status-pill.danger {
  color: var(--color-danger);
}

.status-pill.muted {
  color: var(--color-text-muted);
}

.pager {
  display: flex;
  gap: 10px;
  align-items: center;
}

.history-cards {
  display: none;
}

.history-card p {
  margin: 6px 0 0;
}

.history-card__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 960px) {
  .hero {
    flex-direction: column;
  }

  .hero-actions,
  .hero-actions .btn {
    width: 100%;
  }

  .history-table {
    display: none;
  }

  .history-cards {
    display: grid;
  }

  .slot-strip {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
