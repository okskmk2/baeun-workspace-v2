<template>
  <main class="slots-page">
    <hgroup>
      <h1>{{ t("settings.slots.title") }}</h1>
      <p class="subtitle">{{ t("settings.slots.subtitle") }}</p>
    </hgroup>

    <p v-if="isLoading" class="status">{{ t("settings.slots.loading") }}</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <template v-else>
      <section class="summary-grid" aria-label="슬롯 요약">
        <article class="summary-card">
          <p class="summary-label">{{ t("settings.slots.workspaceCard.label") }}</p>
          <p class="summary-value">{{ workspaceSlot.remaining }} / {{ workspaceSlot.granted }}</p>
          <p class="summary-meta">
            {{
              t("settings.slots.workspaceCard.meta", {
                used: workspaceSlot.used,
                free: workspaceSlot.free,
                purchased: workspaceSlot.purchased,
              })
            }}
          </p>
        </article>
        <article class="summary-card">
          <p class="summary-label">{{ t("settings.slots.expiryCard.label") }}</p>
          <p class="summary-value summary-value--name">{{ nearestExpiryLabel }}</p>
          <p class="summary-meta">{{ t("settings.slots.expiryCard.meta") }}</p>
        </article>
        <article class="summary-card">
          <p class="summary-label">{{ t("settings.slots.cancelCard.label") }}</p>
          <p class="summary-value">{{ cancelingCount }}</p>
          <p class="summary-meta">{{ t("settings.slots.cancelCard.meta") }}</p>
        </article>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>{{ t("settings.slots.holdings.title") }}</h2>
          <router-link class="btn btn--sm" :to="workspaceCartTo">
            {{ t("settings.slots.holdings.buy") }}
          </router-link>
        </div>
        <p v-if="!holdings.length" class="status muted">{{ t("settings.slots.holdings.empty") }}</p>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ t("settings.slots.holdings.columns.product") }}</th>
                <th>{{ t("settings.slots.holdings.columns.quantity") }}</th>
                <th>{{ t("settings.slots.holdings.columns.status") }}</th>
                <th>{{ t("settings.slots.holdings.columns.end") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in holdings" :key="item.id">
                <td>{{ item.license_name }} · {{ cycleLabel(item.billing_cycle) }}</td>
                <td>{{ item.quantity }}</td>
                <td>
                  <span class="status-pill" :class="holdingClass(item)">{{ holdingLabel(item) }}</span>
                </td>
                <td>{{ formatDate(item.end_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>{{ t("settings.slots.workspaces.title") }}</h2>
        <p v-if="!workspaceRows.length" class="status muted">{{ t("settings.slots.workspaces.empty") }}</p>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{{ t("settings.slots.workspaces.columns.name") }}</th>
                <th>{{ t("settings.slots.workspaces.columns.project") }}</th>
                <th>{{ t("settings.slots.workspaces.columns.member") }}</th>
                <th>{{ t("settings.slots.workspaces.columns.action") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in workspaceRows" :key="row.workspace_id">
                <td>
                  <router-link :to="`/workspace/${row.workspace_id}/settings/license`">
                    {{ row.name }}
                  </router-link>
                </td>
                <td :class="{ 'is-short': row.project.remaining < 1 }">
                  {{ row.project.remaining }} / {{ row.project.granted }}
                </td>
                <td :class="{ 'is-short': row.member.remaining < 1 }">
                  {{ row.member.remaining }} / {{ row.member.granted }}
                </td>
                <td>
                  <router-link class="btn btn--sm btn--secondary" :to="`/workspace/${row.workspace_id}/settings/license`">
                    {{ t("settings.slots.workspaces.license") }}
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import { emptySlot, monthlyCartTo } from "../../lib/slots";

const { t } = useI18n();

const isLoading = ref(false);
const errorMessage = ref("");
const entitlements = ref({ workspace: emptySlot("WORKSPACE"), workspaces: [] });
const licenses = ref([]);

const workspaceSlot = computed(() => entitlements.value.workspace || emptySlot("WORKSPACE"));
const workspaceRows = computed(() => entitlements.value.workspaces || []);
const workspaceCartTo = computed(() => monthlyCartTo("WORKSPACE"));

const holdings = computed(() =>
  (licenses.value || []).filter((item) => String(item.target_resource || "").toUpperCase() === "WORKSPACE")
);

const cancelingCount = computed(
  () => holdings.value.filter((item) => item.cancel_at_period_end && String(item.status).toUpperCase() === "ACTIVE").length
);

const nearestExpiryLabel = computed(() => {
  const dates = holdings.value
    .map((item) => item.end_date)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now())
    .sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return t("settings.slots.expiryCard.none");
  return dates[0].toLocaleDateString();
});

const cycleLabel = (cycle) => {
  const normalized = String(cycle || "").toUpperCase();
  if (normalized === "MONTHLY") return t("settings.slots.cycles.monthly");
  if (normalized === "YEARLY") return t("settings.slots.cycles.yearly");
  if (normalized === "LIFETIME") return t("settings.slots.cycles.lifetime");
  return cycle || "-";
};

const holdingLabel = (item) => {
  if (item.cancel_at_period_end) return t("settings.slots.status.canceling");
  const status = String(item.status || "").toUpperCase();
  if (status === "ACTIVE") return t("settings.slots.status.active");
  if (status === "EXPIRED") return t("settings.slots.status.expired");
  if (status === "CANCELED") return t("settings.slots.status.canceled");
  if (status === "REFUNDED") return t("settings.slots.status.refunded");
  return status;
};

const holdingClass = (item) => {
  if (item.cancel_at_period_end) return "warn";
  const status = String(item.status || "").toUpperCase();
  if (status === "ACTIVE") return "ok";
  if (status === "REFUNDED" || status === "CANCELED") return "muted";
  return "warn";
};

const formatDate = (value) => {
  if (!value) return t("settings.slots.holdings.noEnd");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

onMounted(async () => {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const [entitlementRes, meRes] = await Promise.all([
      api.get("/payments/entitlements"),
      api.get("/payments/me", { params: { page: 1, pageSize: 10 } }),
    ]);
    entitlements.value = entitlementRes.data || entitlements.value;
    licenses.value = meRes.data?.licenses || [];
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("settings.slots.error");
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.slots-page {
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

.summary-value--name {
  font-size: 1.1rem;
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
  align-items: center;
  gap: 10px;
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

.is-short {
  color: var(--color-danger);
  font-weight: 700;
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

.status-pill.warn {
  color: var(--color-warning);
}

.status-pill.muted {
  color: var(--color-text-muted);
}

@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
