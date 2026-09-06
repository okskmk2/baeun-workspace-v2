<template>
  <hgroup>
    <div>
      <h1>{{ t("data.home.header.title") }}</h1>
      <p class="subtitle">{{ t("data.home.header.subtitle") }}</p>
    </div>
  </hgroup>

  <section class="overview-grid">
    <article class="wire-card card">
      <h3>{{ t("data.home.cards.tables") }}</h3>
      <p>{{ allTables.length }}</p>
    </article>
    <article class="wire-card card">
      <h3>{{ t("data.home.cards.views") }}</h3>
      <p>{{ views.length }}</p>
    </article>
    <article class="wire-card card">
      <h3>{{ t("data.home.cards.charts") }}</h3>
      <p>{{ charts.length }}</p>
    </article>
    <article class="wire-card card">
      <h3>{{ t("data.home.cards.webhooks") }}</h3>
      <p>{{ webhooks.length }}</p>
    </article>
  </section>

  <section class="quick-links">
    <router-link
      v-for="table in quickLinks"
      :key="table.id"
      class="quick-link"
      :to="`/project/${projectId}/data/${table.id}/list`"
    >
      {{ t("data.home.quickLinks.open", { name: table.name }) }}
    </router-link>
    <p v-if="quickLinks.length === 0" class="status">
      {{ t("data.home.quickLinks.empty") }}
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const dataStore = useDataStore();
const { tablesByProject, prototypesByProject } = storeToRefs(dataStore);
const projectId = computed(() => route.params.projectId);
const tables = computed(() => tablesByProject.value[projectId.value] || { assets: [], locals: [] });
const allTables = computed(() => [...(tables.value.assets || []), ...(tables.value.locals || [])]);
const views = computed(() => prototypesByProject.value[projectId.value]?.views || []);
const charts = computed(() => prototypesByProject.value[projectId.value]?.charts || []);
const webhooks = computed(() => prototypesByProject.value[projectId.value]?.webhooks || []);
const quickLinks = computed(() => allTables.value.slice(0, 6));

onMounted(async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
});
</script>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.card {
  padding: 1rem;
}

.card h3 {
  margin: 0;
  font-size: 14px;
}

.card p {
  margin: 0.4rem 0 0;
  font-size: 24px;
  font-weight: 700;
}

.quick-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.quick-link {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  text-decoration: none;
  color: inherit;
  background: var(--color-surface, #fff);
}

.status {
  margin: 0;
  color: var(--color-text-secondary, #71717a);
}
</style>
