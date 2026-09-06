<template>
  <BackLinkButton @click="goHome">{{ t("data.createView.back") }}</BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("data.createView.title") }}</h1>
      <p class="subtitle">{{ t("data.createView.subtitle") }}</p>
    </div>
  </hgroup>

  <p class="prototype-banner">{{ t("data.prototype.banner") }}</p>

  <form class="create-form" @submit.prevent="submitCreate">
    <label for="view-name">
      {{ t("data.createView.fields.name") }}
      <input
        id="view-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('data.createView.fields.namePlaceholder')"
        required
      />
    </label>
    <label for="view-description">
      {{ t("data.createView.fields.description") }}
      <input id="view-description" v-model.trim="form.description" type="text" />
    </label>

    <section class="form-section">
      <h2>{{ t("data.createView.sections.sources") }}</h2>
      <p v-if="tables.length === 0" class="empty-hint">
        {{ t("data.createView.error.noTables") }}
        <router-link :to="createTablePath">{{ t("data.createView.fields.createTable") }}</router-link>
      </p>
      <div class="source-grid">
        <label for="view-base">
          {{ t("data.createView.fields.base") }}
          <span class="field-help">{{ t("data.createView.fields.baseHelp") }}</span>
          <select id="view-base" v-model="form.leftKey">
            <option value="">{{ t("data.createView.fields.sourcePlaceholder") }}</option>
            <optgroup
              v-if="leftTableOptions.length"
              :label="t('data.createView.fields.groupTables')"
            >
              <option v-for="source in leftTableOptions" :key="source.key" :value="source.key">
                {{ source.name }}
              </option>
            </optgroup>
            <optgroup
              v-if="leftViewOptions.length"
              :label="t('data.createView.fields.groupViews')"
            >
              <option v-for="source in leftViewOptions" :key="source.key" :value="source.key">
                {{ t("data.createView.fields.viewSuffix", { name: source.name }) }}
              </option>
            </optgroup>
          </select>
        </label>
        <label for="view-attach">
          {{ t("data.createView.fields.attach") }}
          <span class="field-help">{{ t("data.createView.fields.attachHelp") }}</span>
          <select id="view-attach" v-model="form.rightKey">
            <option value="">{{ t("data.createView.fields.sourcePlaceholder") }}</option>
            <optgroup
              v-if="rightTableOptions.length"
              :label="t('data.createView.fields.groupTables')"
            >
              <option v-for="source in rightTableOptions" :key="source.key" :value="source.key">
                {{ source.name }}
              </option>
            </optgroup>
            <optgroup
              v-if="rightViewOptions.length"
              :label="t('data.createView.fields.groupViews')"
            >
              <option v-for="source in rightViewOptions" :key="source.key" :value="source.key">
                {{ t("data.createView.fields.viewSuffix", { name: source.name }) }}
              </option>
            </optgroup>
          </select>
        </label>
      </div>
      <p v-if="form.leftKey && rightTableOptions.length + rightViewOptions.length === 0" class="empty-hint">
        {{ t("data.createView.error.needTwoSources") }}
        <router-link :to="createTablePath">{{ t("data.createView.fields.createTable") }}</router-link>
      </p>
    </section>

    <section class="form-section">
      <h2>{{ t("data.createView.sections.joinType") }}</h2>
      <p class="field-help">{{ t("data.createView.help") }}</p>
      <div class="join-cards" role="radiogroup" :aria-label="t('data.createView.sections.joinType')">
        <button
          type="button"
          class="join-card"
          :class="{ 'is-selected': form.joinType === 'matching' }"
          role="radio"
          :aria-checked="form.joinType === 'matching'"
          @click="form.joinType = 'matching'"
        >
          <strong>{{ t("data.createView.join.matching.title") }}</strong>
          <p>{{ t("data.createView.join.matching.description") }}</p>
          <div class="join-example" aria-hidden="true">
            <div>
              <p>{{ t("data.createView.example.base") }}</p>
              <span>{{ t("data.createView.example.minsu") }}</span>
              <span>{{ t("data.createView.example.younghee") }}</span>
            </div>
            <div>
              <p>{{ t("data.createView.example.attach") }}</p>
              <span>{{ t("data.createView.example.minsu") }} · {{ t("data.createView.example.orders") }}</span>
              <span>{{ t("data.createView.example.none") }}</span>
            </div>
            <div>
              <p>{{ t("data.createView.example.result") }}</p>
              <span>{{ t("data.createView.example.minsu") }} · {{ t("data.createView.example.orders") }}</span>
              <span>{{ t("data.createView.example.dropped") }}</span>
            </div>
          </div>
          <span class="join-hint">{{ t("data.createView.join.matching.hint") }}</span>
        </button>
        <button
          type="button"
          class="join-card"
          :class="{ 'is-selected': form.joinType === 'keep_base' }"
          role="radio"
          :aria-checked="form.joinType === 'keep_base'"
          @click="form.joinType = 'keep_base'"
        >
          <strong>{{ t("data.createView.join.keepBase.title") }}</strong>
          <p>{{ t("data.createView.join.keepBase.description") }}</p>
          <div class="join-example" aria-hidden="true">
            <div>
              <p>{{ t("data.createView.example.base") }}</p>
              <span>{{ t("data.createView.example.minsu") }}</span>
              <span>{{ t("data.createView.example.younghee") }}</span>
            </div>
            <div>
              <p>{{ t("data.createView.example.attach") }}</p>
              <span>{{ t("data.createView.example.minsu") }} · {{ t("data.createView.example.orders") }}</span>
              <span>{{ t("data.createView.example.none") }}</span>
            </div>
            <div>
              <p>{{ t("data.createView.example.result") }}</p>
              <span>{{ t("data.createView.example.minsu") }} · {{ t("data.createView.example.orders") }}</span>
              <span>{{ t("data.createView.example.younghee") }} · {{ t("data.createView.example.blank") }}</span>
            </div>
          </div>
          <span class="join-hint">{{ t("data.createView.join.keepBase.hint") }}</span>
        </button>
      </div>
    </section>

    <section class="form-section">
      <h2>{{ t("data.createView.sections.match") }}</h2>
      <p class="field-help">{{ t("data.createView.fields.match") }}</p>
      <p class="field-help">{{ t("data.createView.fields.matchHint") }}</p>
      <div class="source-grid">
        <label for="view-left-column">
          {{ leftSource?.name || t("data.createView.fields.base") }}
          <select
            id="view-left-column"
            v-model="form.leftColumnId"
            :disabled="leftColumns.length === 0"
          >
            <option value="">{{ t("data.createView.fields.columnPlaceholder") }}</option>
            <option v-for="column in leftColumns" :key="`left-${column.id}`" :value="String(column.id)">
              {{ column.label || column.name }}
            </option>
          </select>
        </label>
        <label for="view-right-column">
          {{ rightSource?.name || t("data.createView.fields.attach") }}
          <select
            id="view-right-column"
            v-model="form.rightColumnId"
            :disabled="rightColumns.length === 0"
          >
            <option value="">{{ t("data.createView.fields.columnPlaceholder") }}</option>
            <option
              v-for="column in rightColumns"
              :key="`right-${column.id}`"
              :value="String(column.id)"
            >
              {{ column.label || column.name }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="typeWarning" class="status warning">{{ typeWarning }}</p>
    </section>

    <section class="form-section preview-card">
      <h2>{{ t("data.createView.sections.preview") }}</h2>
      <p v-if="previewSummary">{{ previewSummary }}</p>
      <p v-else class="field-help">{{ t("data.createView.preview.waiting") }}</p>
      <template v-if="resultColumns.length">
        <p class="preview-label">{{ t("data.createView.preview.columns") }}</p>
        <ul class="result-columns">
          <li v-for="column in resultColumns" :key="`${column.source}-${column.id}-${column.name}`">
            {{ column.label }}
          </li>
        </ul>
      </template>
      <p class="field-help">{{ t("data.createView.preview.note") }}</p>
    </section>

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="create-actions">
      <button type="button" class="btn btn--secondary" @click="goHome">
        {{ t("data.createView.actions.cancel") }}
      </button>
      <button type="submit" class="btn">{{ t("data.createView.actions.submit") }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const { tablesByProject, prototypesByProject, columnsByKey } = storeToRefs(dataStore);

const projectId = computed(() => route.params.projectId);
const createTablePath = computed(() => `/project/${projectId.value}/data/tables/new`);
const tables = computed(() => dataStore.getAllTables(projectId.value));
const formError = ref("");
const form = ref({
  name: "",
  description: "",
  leftKey: "",
  rightKey: "",
  joinType: "matching",
  leftColumnId: "",
  rightColumnId: "",
});

const parseSourceKey = (key) => {
  const value = String(key || "");
  const splitAt = value.indexOf(":");
  if (splitAt <= 0) return null;
  const kind = value.slice(0, splitAt);
  const id = value.slice(splitAt + 1);
  if ((kind !== "table" && kind !== "view") || !id) return null;
  return { kind, id };
};

const tableSources = computed(() => {
  const grouped = tablesByProject.value[projectId.value] || { assets: [], locals: [] };
  return [...(grouped.assets || []), ...(grouped.locals || [])].map((table) => ({
    key: `table:${table.id}`,
    kind: "table",
    id: String(table.id),
    name: table.name,
  }));
});

const viewSources = computed(() => {
  const views = prototypesByProject.value[projectId.value]?.views || [];
  return views.filter((view) => dataStore.isJoinView(view)).map((view) => ({
    key: `view:${view.id}`,
    kind: "view",
    id: String(view.id),
    name: view.name,
  }));
});

const isIncompatibleWith = (source, otherKey) => {
  const other = parseSourceKey(otherKey);
  if (!other) return false;
  return dataStore.sourcesOverlap(projectId.value, source, other);
};

const leftTableOptions = computed(() =>
  tableSources.value.filter((source) => !isIncompatibleWith(source, form.value.rightKey))
);
const leftViewOptions = computed(() =>
  viewSources.value.filter((source) => !isIncompatibleWith(source, form.value.rightKey))
);
const rightTableOptions = computed(() =>
  tableSources.value.filter((source) => !isIncompatibleWith(source, form.value.leftKey))
);
const rightViewOptions = computed(() =>
  viewSources.value.filter((source) => !isIncompatibleWith(source, form.value.leftKey))
);

const resolveSource = (key) => {
  const parsed = parseSourceKey(key);
  if (!parsed) return null;
  if (parsed.kind === "table") {
    const table = dataStore.getTableById(projectId.value, parsed.id);
    return table ? { kind: "table", id: String(table.id), name: table.name } : null;
  }
  const view = dataStore.getView(projectId.value, parsed.id);
  return view ? { kind: "view", id: String(view.id), name: view.name } : null;
};

const leftSource = computed(() => resolveSource(form.value.leftKey));
const rightSource = computed(() => resolveSource(form.value.rightKey));

const leftColumns = computed(() => {
  const source = leftSource.value;
  if (!source) return [];
  void columnsByKey.value;
  void prototypesByProject.value;
  return dataStore.getSourceColumns(projectId.value, source.kind, source.id);
});

const rightColumns = computed(() => {
  const source = rightSource.value;
  if (!source) return [];
  void columnsByKey.value;
  void prototypesByProject.value;
  return dataStore.getSourceColumns(projectId.value, source.kind, source.id);
});

const leftColumn = computed(
  () => leftColumns.value.find((column) => String(column.id) === String(form.value.leftColumnId)) || null
);
const rightColumn = computed(
  () =>
    rightColumns.value.find((column) => String(column.id) === String(form.value.rightColumnId)) || null
);

const typeWarning = computed(() => {
  if (!leftColumn.value || !rightColumn.value) return "";
  if (leftColumn.value.type === rightColumn.value.type) return "";
  return t("data.createView.typeWarning", {
    leftType: t(`data.createView.types.${leftColumn.value.type}`, leftColumn.value.type),
    rightType: t(`data.createView.types.${rightColumn.value.type}`, rightColumn.value.type),
  });
});

const resultColumns = computed(() => {
  if (!leftSource.value || !rightSource.value) return [];
  const toResult = (column, side, sourceName) => ({
    source: side,
    id: column.id,
    name: column.name,
    type: column.type,
    label: `${sourceName}.${column.name}`,
  });
  return [
    ...leftColumns.value.map((column) => toResult(column, "left", leftSource.value.name)),
    ...rightColumns.value.map((column) => toResult(column, "right", rightSource.value.name)),
  ];
});

const previewSummary = computed(() => {
  if (!leftSource.value || !rightSource.value || !leftColumn.value || !rightColumn.value) return "";
  const key =
    form.value.joinType === "keep_base"
      ? "data.createView.preview.keepBase"
      : "data.createView.preview.matching";
  return t(key, {
    left: leftSource.value.name,
    right: rightSource.value.name,
    leftColumn: leftColumn.value.label || leftColumn.value.name,
    rightColumn: rightColumn.value.label || rightColumn.value.name,
  });
});

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

const loadSourceColumns = async (key) => {
  const parsed = parseSourceKey(key);
  if (!parsed || !projectId.value) return;
  await dataStore.ensureSourceColumns(projectId.value, parsed.kind, parsed.id);
};

watch(
  () => form.value.leftKey,
  async (key) => {
    form.value.leftColumnId = "";
    const left = parseSourceKey(key);
    const right = parseSourceKey(form.value.rightKey);
    if (left && right && dataStore.sourcesOverlap(projectId.value, left, right)) {
      form.value.rightKey = "";
      form.value.rightColumnId = "";
    }
    await loadSourceColumns(key);
  }
);

watch(
  () => form.value.rightKey,
  async (key) => {
    form.value.rightColumnId = "";
    const left = parseSourceKey(form.value.leftKey);
    const right = parseSourceKey(key);
    if (left && right && dataStore.sourcesOverlap(projectId.value, left, right)) {
      form.value.rightKey = "";
      return;
    }
    await loadSourceColumns(key);
  }
);

const submitCreate = () => {
  formError.value = "";
  if (!form.value.name) {
    formError.value = t("data.createView.error.nameRequired");
    return;
  }
  if (tables.value.length === 0) {
    formError.value = t("data.createView.error.noTables");
    return;
  }
  if (!leftSource.value) {
    formError.value = t("data.createView.error.baseRequired");
    return;
  }
  if (!rightSource.value) {
    formError.value = t("data.createView.error.attachRequired");
    return;
  }
  if (
    leftSource.value.kind === rightSource.value.kind &&
    String(leftSource.value.id) === String(rightSource.value.id)
  ) {
    formError.value = t("data.createView.error.sameSource");
    return;
  }
  if (dataStore.sourcesOverlap(projectId.value, leftSource.value, rightSource.value)) {
    formError.value = t("data.createView.error.overlap");
    return;
  }
  if (!leftColumn.value || !rightColumn.value) {
    formError.value = t("data.createView.error.matchRequired");
    return;
  }

  const created = dataStore.createView(projectId.value, {
    name: form.value.name,
    description: form.value.description,
    join_type: form.value.joinType,
    left: leftSource.value,
    right: rightSource.value,
    match: {
      left_column: leftColumn.value,
      right_column: rightColumn.value,
    },
    result_columns: resultColumns.value,
  });
  addToast({ message: t("data.createView.toast.created"), type: "success" });
  router.push(`/project/${projectId.value}/data/views/${created.id}`);
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

.create-form {
  display: grid;
  gap: 1.25rem;
  max-width: 860px;
}

.create-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 13px;
}

.create-form input,
.create-form select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--color-surface, #fff);
}

.form-section {
  display: grid;
  gap: 0.65rem;
}

.form-section h2 {
  margin: 0;
  font-size: 15px;
}

.field-help,
.empty-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
  font-weight: 400;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
}

.join-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

.join-card {
  display: grid;
  gap: 0.55rem;
  text-align: left;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-surface, #fff);
  color: inherit;
  width: 100%;
  cursor: pointer;
}

.join-card.is-selected {
  border-color: var(--color-accent, #6366f1);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, #6366f1) 22%, transparent);
}

.join-card strong {
  font-size: 14px;
}

.join-card > p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
}

.join-hint {
  font-size: 11px;
  color: var(--color-text-tertiary, #a1a1aa);
}

.join-example {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  font-size: 11px;
  background: var(--color-surface-alt, #fafafa);
  border-radius: 8px;
  padding: 0.5rem;
}

.join-example p {
  margin: 0 0 0.25rem;
  font-weight: 700;
  color: var(--color-text, #18181b);
}

.join-example span {
  display: block;
  color: var(--color-text-secondary, #71717a);
}

.preview-card {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-surface, #fff);
}

.preview-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}

.result-columns {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 13px;
}

.status.error {
  color: #dc2626;
  margin: 0;
}

.status.warning {
  color: #b45309;
  margin: 0;
  font-size: 13px;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
