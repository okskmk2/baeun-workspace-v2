<template>
  <div class="LnbLayout DataLayout">
    <aside>
      <div class="lnb-shell">
        <div class="data-header">
          <strong>{{ t("data.layout.title") }}</strong>
          <button
            type="button"
            class="icon-btn"
            :aria-label="t('data.layout.actions.refresh')"
            :title="t('data.layout.actions.refresh')"
            @click="refreshTables"
          >
            <MaterialSymbol name="refresh" :size="18" alt="" />
          </button>
        </div>

        <nav class="lnb-scroll data-nav">
          <section v-for="section in sections" :key="section.key" class="nav-section">
            <div class="nav-section__header">
              <h3>{{ section.title }}</h3>
              <router-link
                class="section-add"
                :to="section.addTo"
                :aria-label="section.addLabel"
                :title="section.addLabel"
              >
                <MaterialSymbol name="add" :size="18" alt="" />
              </router-link>
            </div>
            <p v-if="section.items.length === 0" class="empty-text">{{ section.empty }}</p>
            <div v-else class="section-list">
              <router-link
                v-for="item in section.items"
                :key="`${section.key}-${item.id}`"
                class="lnb-item"
                :to="item.to"
              >
                <span>{{ item.name }}</span>
                <span v-if="item.badge === 'asset'" class="category-badge is-asset">
                  {{ t("data.layout.badge.asset") }}
                </span>
                <span v-else-if="item.badge === 'local'" class="category-badge is-local">
                  {{ t("data.layout.badge.local") }}
                </span>
              </router-link>
            </div>
          </section>
        </nav>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { addToast } from "../../lib/toast";
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

const sections = computed(() => [
  {
    key: "tables",
    title: t("data.layout.sections.tables"),
    addTo: `/project/${projectId.value}/data/tables/new`,
    addLabel: t("data.layout.actions.addTable"),
    empty: t("data.layout.empty.tables"),
    items: allTables.value.map((table) => ({
      id: table.id,
      name: table.name,
      to: `/project/${projectId.value}/data/${table.id}/list`,
      badge: table.is_asset ? "asset" : "local",
    })),
  },
  {
    key: "views",
    title: t("data.layout.sections.views"),
    addTo: `/project/${projectId.value}/data/views/new`,
    addLabel: t("data.layout.actions.addView"),
    empty: t("data.layout.empty.views"),
    items: views.value.map((view) => ({
      id: view.id,
      name: view.name,
      to: `/project/${projectId.value}/data/views/${view.id}`,
    })),
  },
  {
    key: "charts",
    title: t("data.layout.sections.charts"),
    addTo: `/project/${projectId.value}/data/charts/new`,
    addLabel: t("data.layout.actions.addChart"),
    empty: t("data.layout.empty.charts"),
    items: charts.value.map((chart) => ({
      id: chart.id,
      name: chart.name,
      to: `/project/${projectId.value}/data/charts/${chart.id}`,
    })),
  },
  {
    key: "webhooks",
    title: t("data.layout.sections.webhooks"),
    addTo: `/project/${projectId.value}/data/webhooks/new`,
    addLabel: t("data.layout.actions.addWebhook"),
    empty: t("data.layout.empty.webhooks"),
    items: webhooks.value.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      to: `/project/${projectId.value}/data/webhooks/${webhook.id}`,
    })),
  },
]);

const loadProjectData = async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
};

const refreshTables = async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
  addToast({ message: t("data.layout.toast.refreshed"), type: "success" });
};

watch(projectId, loadProjectData);
onMounted(loadProjectData);
</script>

<style scoped>
.DataLayout main {
  padding: 18px 24px 3rem;
}

.data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.DataLayout .data-header .icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e4e4e7);
  background: var(--color-surface, #fff);
  color: var(--color-text-secondary, #71717a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.data-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nav-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
}

.nav-section h3 {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #a1a1aa);
}

.DataLayout .section-add {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e4e4e7);
  background: var(--color-surface, #fff);
  color: var(--color-text-secondary, #71717a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: visible;
  white-space: nowrap;
}

.DataLayout .section-add:hover {
  text-decoration: none;
  color: var(--color-text, #18181b);
}

.empty-text {
  margin: 0.15rem 0 0.4rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lnb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-decoration: none;
}

.category-badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  line-height: 1.2;
  border: 1px solid transparent;
  text-decoration: none;
  flex-shrink: 0;
}

.category-badge.is-asset {
  color: #186339;
  background: #e9f9ef;
  border-color: #b8ebca;
}

.category-badge.is-local {
  color: #6d28d9;
  background: #f3e8ff;
  border-color: #ddd6fe;
}
</style>
