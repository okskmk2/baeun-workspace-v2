<template>
  <BackLinkButton @click="goHome">{{ t("data.chartPage.back") }}</BackLinkButton>
  <template v-if="chart">
    <hgroup>
      <div>
        <h1>{{ chart.name }}</h1>
        <p class="subtitle">{{ t("data.chartPage.title") }}</p>
      </div>
    </hgroup>
    <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>
    <section class="wire-card detail-card">
      <dl>
        <div>
          <dt>{{ t("data.chartPage.fields.table") }}</dt>
          <dd>{{ tableLabel }}</dd>
        </div>
        <div>
          <dt>{{ t("data.chartPage.fields.chartType") }}</dt>
          <dd>{{ chartTypeLabel }}</dd>
        </div>
        <div>
          <dt>{{ t("data.chartPage.fields.xColumn") }}</dt>
          <dd>{{ chart.x_column || "-" }}</dd>
        </div>
        <div>
          <dt>{{ t("data.chartPage.fields.yColumn") }}</dt>
          <dd>{{ chart.y_column || "-" }}</dd>
        </div>
      </dl>
      <div class="chart-placeholder" aria-hidden="true">
        <span v-for="n in 5" :key="n" :style="{ height: `${28 + n * 10}%` }"></span>
      </div>
      <p class="placeholder-text">{{ t("data.chartPage.placeholder") }}</p>
      <router-link v-if="chart.table_id" class="btn btn--secondary" :to="tablePath">
        {{ t("data.chartPage.fields.openTable") }}
      </router-link>
    </section>
  </template>
  <p v-else class="status error">{{ t("data.chartPage.notFound") }}</p>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();

const projectId = computed(() => route.params.projectId);
const chartId = computed(() => route.params.chartId);
const chart = computed(() => dataStore.getChart(projectId.value, chartId.value));
const liveTable = computed(() => dataStore.getTableById(projectId.value, chart.value?.table_id));
const tableLabel = computed(() => liveTable.value?.name || chart.value?.table_name || "-");
const chartTypeLabel = computed(() => {
  const type = chart.value?.chart_type || "bar";
  return t(`data.createChart.types.${type}`);
});
const tablePath = computed(
  () => `/project/${projectId.value}/data/${chart.value?.table_id}/chart`
);

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

onMounted(async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
});
</script>

<style scoped>
.prototype-banner {
  margin: 0 0 1rem;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
}

.detail-card {
  padding: 1rem;
  display: grid;
  gap: 1rem;
  max-width: 640px;
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

dt {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

dd {
  margin: 0.2rem 0 0;
  font-weight: 700;
}

.chart-placeholder {
  height: 160px;
  border: 1px dashed var(--color-border, #e4e4e7);
  border-radius: 10px;
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-alt, #fafafa);
}

.chart-placeholder span {
  flex: 1;
  border-radius: 6px 6px 0 0;
  background: color-mix(in srgb, var(--color-accent, #6366f1) 35%, white 65%);
}

.placeholder-text {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
}

.status.error {
  color: #dc2626;
}

.btn {
  justify-self: start;
}
</style>
