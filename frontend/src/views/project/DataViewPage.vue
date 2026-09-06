<template>
  <BackLinkButton @click="goHome">{{ t("data.viewPage.back") }}</BackLinkButton>
  <template v-if="view">
    <hgroup>
      <div>
        <h1>{{ view.name }}</h1>
        <p class="subtitle">{{ t("data.viewPage.title") }}</p>
      </div>
    </hgroup>
    <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>

    <section v-if="isJoinView" class="wire-card detail-card">
      <p class="summary">{{ summary }}</p>
      <dl>
        <div>
          <dt>{{ t("data.viewPage.fields.base") }}</dt>
          <dd>
            {{ view.left?.name || "-" }}
            <span class="kind-badge">{{ kindLabel(view.left?.kind) }}</span>
          </dd>
        </div>
        <div>
          <dt>{{ t("data.viewPage.fields.attach") }}</dt>
          <dd>
            {{ view.right?.name || "-" }}
            <span class="kind-badge">{{ kindLabel(view.right?.kind) }}</span>
          </dd>
        </div>
        <div>
          <dt>{{ t("data.viewPage.fields.joinType") }}</dt>
          <dd>{{ joinTypeLabel }}</dd>
        </div>
        <div>
          <dt>{{ t("data.viewPage.fields.match") }}</dt>
          <dd>
            {{
              t("data.viewPage.fields.matchValue", {
                left: view.match?.left_column?.name || "-",
                right: view.match?.right_column?.name || "-",
              })
            }}
          </dd>
        </div>
        <div v-if="view.description">
          <dt>{{ t("data.viewPage.fields.description") }}</dt>
          <dd>{{ view.description }}</dd>
        </div>
      </dl>
      <div v-if="resultColumns.length">
        <p class="preview-label">{{ t("data.viewPage.fields.columns") }}</p>
        <ul class="result-columns">
          <li v-for="column in resultColumns" :key="`${column.source}-${column.id}-${column.name}`">
            {{ column.label || column.name }}
          </li>
        </ul>
      </div>
      <div class="detail-actions">
        <router-link v-if="leftPath" class="btn btn--secondary" :to="leftPath">
          {{ leftLinkLabel }}
        </router-link>
        <router-link v-if="rightPath" class="btn btn--secondary" :to="rightPath">
          {{ rightLinkLabel }}
        </router-link>
      </div>
    </section>
    <p v-else class="status warning">{{ t("data.viewPage.legacy") }}</p>
  </template>
  <p v-else class="status error">{{ t("data.viewPage.notFound") }}</p>
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
const viewId = computed(() => route.params.viewId);
const view = computed(() => dataStore.getView(projectId.value, viewId.value));
const isJoinView = computed(() => dataStore.isJoinView(view.value));
const resultColumns = computed(() =>
  Array.isArray(view.value?.result_columns) ? view.value.result_columns : []
);

const joinTypeLabel = computed(() =>
  view.value?.join_type === "keep_base"
    ? t("data.createView.join.keepBase.title")
    : t("data.createView.join.matching.title")
);

const summary = computed(() => {
  if (!isJoinView.value) return "";
  const key =
    view.value.join_type === "keep_base"
      ? "data.createView.preview.keepBase"
      : "data.createView.preview.matching";
  return t(key, {
    left: view.value.left?.name || "-",
    right: view.value.right?.name || "-",
    leftColumn: view.value.match?.left_column?.name || "-",
    rightColumn: view.value.match?.right_column?.name || "-",
  });
});

const kindLabel = (kind) =>
  kind === "view" ? t("data.viewPage.kind.view") : t("data.viewPage.kind.table");

const sourcePath = (source) => {
  if (!source?.kind || !projectId.value) return "";
  if (source.kind === "table") return `/project/${projectId.value}/data/${source.id}/list`;
  if (source.kind === "view") return `/project/${projectId.value}/data/views/${source.id}`;
  return "";
};

const leftPath = computed(() => sourcePath(view.value?.left));
const rightPath = computed(() => sourcePath(view.value?.right));
const leftLinkLabel = computed(() =>
  view.value?.left?.kind === "view"
    ? t("data.viewPage.fields.openView")
    : t("data.viewPage.fields.openTable")
);
const rightLinkLabel = computed(() =>
  view.value?.right?.kind === "view"
    ? t("data.viewPage.fields.openView")
    : t("data.viewPage.fields.openTable")
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
  max-width: 720px;
}

.summary {
  margin: 0;
  font-size: 14px;
}

dl {
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

dt {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

dd {
  margin: 0.2rem 0 0;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.kind-badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--color-border, #e4e4e7);
  color: var(--color-text-secondary, #71717a);
}

.preview-label {
  margin: 0 0 0.35rem;
  font-size: 12px;
  font-weight: 700;
}

.result-columns {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status.error {
  color: #dc2626;
}

.status.warning {
  color: #b45309;
}
</style>
