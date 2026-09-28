<template>
  <div class="LnbLayout DataLayout">
    <aside>
      <div class="lnb-shell">
        <div ref="createMenuRef" class="create-menu">
          <button
            class="btn"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="isCreateMenuOpen"
            @click="isCreateMenuOpen = !isCreateMenuOpen"
          >
            {{ t("data.layout.actions.create") }}
          </button>
          <div v-if="isCreateMenuOpen" class="create-menu__list" role="menu">
            <router-link
              v-for="option in createOptions"
              :key="option.key"
              class="create-menu__item"
              role="menuitem"
              :to="option.to"
              @click="isCreateMenuOpen = false"
            >
              {{ option.label }}
            </router-link>
          </div>
        </div>

        <nav class="lnb-scroll">
          <section v-for="section in visibleSections" :key="section.key" class="data-section">
            <h3>{{ section.title }}</h3>
            <router-link
              v-for="item in section.items"
              :key="`${section.key}-${item.id}`"
              :to="item.to"
            >
              {{ item.name }}
            </router-link>
          </section>
        </nav>
        <router-link class="lnb-bottom" :to="`/project/${projectId}/data`">
          {{ t("data.layout.nav.home") }}
        </router-link>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
const views = computed(() => prototypesByProject.value[projectId.value]?.views || []);
const charts = computed(() => prototypesByProject.value[projectId.value]?.charts || []);
const webhooks = computed(() => prototypesByProject.value[projectId.value]?.webhooks || []);

const isCreateMenuOpen = ref(false);
const createMenuRef = ref(null);

const createOptions = computed(() => [
  { key: "table", label: t("data.layout.actions.addTable"), to: `/project/${projectId.value}/data/tables/new` },
  { key: "view", label: t("data.layout.actions.addView"), to: `/project/${projectId.value}/data/views/new` },
  { key: "chart", label: t("data.layout.actions.addChart"), to: `/project/${projectId.value}/data/charts/new` },
  { key: "webhook", label: t("data.layout.actions.addWebhook"), to: `/project/${projectId.value}/data/webhooks/new` },
]);

const toTableItem = (table) => ({
  id: table.id,
  name: table.name,
  to: `/project/${projectId.value}/data/${table.id}/list`,
});

const sections = computed(() => [
  {
    key: "tables",
    title: t("data.layout.sections.tables"),
    items: (tables.value.locals || []).map(toTableItem),
  },
  {
    key: "assetTables",
    title: t("data.layout.sections.assetTables"),
    items: (tables.value.assets || []).map(toTableItem),
  },
  {
    key: "views",
    title: t("data.layout.sections.views"),
    items: views.value.map((view) => ({
      id: view.id,
      name: view.name,
      to: `/project/${projectId.value}/data/views/${view.id}`,
    })),
  },
  {
    key: "charts",
    title: t("data.layout.sections.charts"),
    items: charts.value.map((chart) => ({
      id: chart.id,
      name: chart.name,
      to: `/project/${projectId.value}/data/charts/${chart.id}`,
    })),
  },
  {
    key: "webhooks",
    title: t("data.layout.sections.webhooks"),
    items: webhooks.value.map((webhook) => ({
      id: webhook.id,
      name: webhook.name,
      to: `/project/${projectId.value}/data/webhooks/${webhook.id}`,
    })),
  },
]);

const visibleSections = computed(() => sections.value.filter((section) => section.items.length > 0));

const loadProjectData = async () => {
  if (!projectId.value) return;
  dataStore.hydratePrototypes(projectId.value);
  await dataStore.fetchTables(projectId.value);
};

const closeCreateMenuOnOutsideClick = (event) => {
  if (!isCreateMenuOpen.value) return;
  if (createMenuRef.value?.contains(event.target)) return;
  isCreateMenuOpen.value = false;
};

watch(projectId, loadProjectData);
watch(
  () => route.fullPath,
  () => {
    isCreateMenuOpen.value = false;
  }
);
onMounted(() => {
  loadProjectData();
  document.addEventListener("click", closeCreateMenuOnOutsideClick);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", closeCreateMenuOnOutsideClick);
});
</script>

<style scoped>
.DataLayout main {
  padding: 18px 24px 3rem;
}

.create-menu + nav {
  margin-top: 1rem;
}

.create-menu {
  position: relative;
}

.create-menu__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-card-bg);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

.create-menu__item {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: var(--font-size-label);
  color: var(--color-text);
  text-decoration: none;
}

.create-menu__item:hover {
  background-color: var(--color-surface-alt);
  text-decoration: none;
}

.data-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.DataLayout .data-section a {
  font-size: 15px;
}

.data-section h3 {
  margin: 8px 0 2px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
