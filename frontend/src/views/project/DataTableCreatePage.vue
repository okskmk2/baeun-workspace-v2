<template>
  <BackLinkButton @click="goHome">{{ t("data.createTable.back") }}</BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("data.createTable.title") }}</h1>
      <p class="subtitle">{{ t("data.createTable.subtitle") }}</p>
    </div>
  </hgroup>

  <form class="create-form" @submit.prevent="submitCreateTable">
    <label for="table-name">
      {{ t("data.createTable.fields.name") }}
      <input
        id="table-name"
        v-model.trim="createForm.name"
        type="text"
        :placeholder="t('data.createTable.fields.namePlaceholder')"
        required
      />
    </label>
    <label for="table-description">
      {{ t("data.createTable.fields.description") }}
      <input
        id="table-description"
        v-model.trim="createForm.description"
        type="text"
        :placeholder="t('data.createTable.fields.descriptionPlaceholder')"
      />
    </label>

    <section class="form-section">
      <h2>{{ t("data.createTable.sections.columns") }}</h2>
      <p class="field-help">{{ t("data.createTable.fields.columnsHelp") }}</p>

      <article v-for="(column, index) in createForm.columns" :key="column.uid" class="column-card">
        <div class="column-card__head">
          <strong>{{ t("data.createTable.fields.columnItem", { index: index + 1 }) }}</strong>
          <div class="column-card__move">
            <button
              type="button"
              class="btn btn--icon"
              :aria-label="t('data.createTable.actions.moveUp')"
              :disabled="index === 0"
              @click="moveColumn(index, -1)"
            >
              <MaterialSymbol name="arrow_upward" :size="16" alt="" />
            </button>
            <button
              type="button"
              class="btn btn--icon"
              :aria-label="t('data.createTable.actions.moveDown')"
              :disabled="index === createForm.columns.length - 1"
              @click="moveColumn(index, 1)"
            >
              <MaterialSymbol name="arrow_downward" :size="16" alt="" />
            </button>
          </div>
        </div>

        <label :for="`column-name-${column.uid}`">
          {{ t("data.createTable.fields.columnName") }}
          <input
            :id="`column-name-${column.uid}`"
            v-model.trim="column.name"
            type="text"
            :placeholder="t('data.createTable.fields.columnNamePlaceholder')"
            required
          />
        </label>

        <label :for="`column-type-${column.uid}`">
          {{ t("data.createTable.fields.columnType") }}
          <select :id="`column-type-${column.uid}`" v-model="column.type">
            <option v-for="type in columnTypes" :key="type" :value="type">
              {{ t(`data.createTable.types.${type}`) }}
            </option>
          </select>
        </label>
        <p class="field-help">{{ t(`data.createTable.typeHints.${column.type}`) }}</p>

        <label class="required-check" :for="`column-required-${column.uid}`">
          <input :id="`column-required-${column.uid}`" v-model="column.is_required" type="checkbox" />
          <span>{{ t("data.createTable.fields.required") }}</span>
        </label>
        <p v-if="column.is_required" class="field-help">
          {{ t("data.createTable.fields.requiredHelp") }}
        </p>

        <div v-if="column.type === 'SELECT'" class="option-editor">
          <p class="option-editor__label">{{ t("data.createTable.fields.selectValues") }}</p>
          <p v-if="column.options.length === 0" class="field-help">
            {{ t("data.createTable.fields.selectEmpty") }}
          </p>
          <ul v-else class="option-chips">
            <li v-for="option in column.options" :key="`${column.uid}-${option}`" class="option-chip">
              <span>{{ option }}</span>
              <button
                type="button"
                class="option-chip__remove"
                :aria-label="t('data.createTable.actions.removeOption')"
                @click="removeOption(column, option)"
              >
                ×
              </button>
            </li>
          </ul>
          <div class="option-add">
            <input
              :id="`column-option-${column.uid}`"
              v-model="column.optionDraft"
              type="text"
              :placeholder="t('data.createTable.fields.selectPlaceholder')"
              @keydown.enter.prevent="addOption(column)"
            />
            <button type="button" class="btn btn--secondary btn--sm" @click="addOption(column)">
              {{ t("data.createTable.actions.addOption") }}
            </button>
          </div>
        </div>

        <div class="column-card__footer">
          <button
            type="button"
            class="btn btn--danger btn--sm"
            :disabled="createForm.columns.length === 1"
            @click="removeColumn(index)"
          >
            {{ t("data.createTable.actions.removeColumn") }}
          </button>
        </div>
      </article>

      <button type="button" class="btn btn--secondary" @click="appendColumn">
        {{ t("data.createTable.actions.addColumn") }}
      </button>
    </section>

    <section class="form-section preview-card">
      <h2>{{ t("data.createTable.sections.preview") }}</h2>
      <div v-if="namedColumns.length" class="preview-table-wrap">
        <table class="preview-table">
          <thead>
            <tr>
              <th v-for="column in namedColumns" :key="`preview-${column.uid}`">
                <span>{{ column.name }}</span>
                <small>
                  {{ t(`data.createTable.types.${column.type}`) }}
                  <template v-if="column.is_required">
                    · {{ t("data.createTable.fields.previewRequired") }}
                  </template>
                </small>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td :colspan="namedColumns.length">{{ t("data.createTable.fields.previewBlank") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="field-help">{{ t("data.createTable.fields.previewEmpty") }}</p>
    </section>

    <p v-if="createError" class="status error">{{ createError }}</p>

    <div class="create-actions">
      <button type="button" class="btn btn--secondary" @click="goHome">
        {{ t("data.createTable.actions.cancel") }}
      </button>
      <button type="submit" class="btn" :disabled="isCreating">
        {{ isCreating ? t("data.createTable.actions.submitting") : t("data.createTable.actions.submit") }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import BackLinkButton from "../../components/BackLinkButton.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();

const columnTypes = ["TEXT", "NUMBER", "DATE", "SELECT"];
let columnUid = 1;

const makeColumn = () => ({
  uid: columnUid++,
  name: "",
  type: "TEXT",
  is_required: false,
  options: [],
  optionDraft: "",
});

const projectId = computed(() => route.params.projectId);
const isCreating = ref(false);
const createError = ref("");
const createForm = ref({
  name: "",
  description: "",
  columns: [makeColumn()],
});

const namedColumns = computed(() =>
  createForm.value.columns.filter((column) => String(column.name || "").trim())
);

const goHome = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/data`);
};

const appendColumn = () => {
  createForm.value.columns.push(makeColumn());
};

const removeColumn = (index) => {
  if (createForm.value.columns.length === 1) return;
  createForm.value.columns.splice(index, 1);
};

const moveColumn = (index, offset) => {
  const nextIndex = index + offset;
  const columns = createForm.value.columns;
  if (nextIndex < 0 || nextIndex >= columns.length) return;
  const [moved] = columns.splice(index, 1);
  columns.splice(nextIndex, 0, moved);
};

const addOption = (column) => {
  const value = String(column.optionDraft || "").trim();
  if (!value) return;
  if (column.options.includes(value)) {
    column.optionDraft = "";
    return;
  }
  column.options.push(value);
  column.optionDraft = "";
};

const removeOption = (column, option) => {
  column.options = column.options.filter((item) => item !== option);
};

const resolveCreateError = (error) => {
  const status = error?.response?.status;
  const serverMessage = String(error?.response?.data?.message || "");
  if (status === 403) return t("data.createTable.error.forbidden");
  if (
    status === 409 ||
    /already exists|duplicate|unique|이미 존재/i.test(serverMessage)
  ) {
    return t("data.createTable.error.nameConflict");
  }
  return serverMessage || t("data.createTable.error.createFailed");
};

const submitCreateTable = async () => {
  if (!projectId.value) return;
  createError.value = "";

  if (!createForm.value.name) {
    createError.value = t("data.createTable.error.nameRequired");
    return;
  }
  if (createForm.value.columns.length === 0) {
    createError.value = t("data.createTable.error.columnRequired");
    return;
  }
  if (createForm.value.columns.some((column) => !String(column.name || "").trim())) {
    createError.value = t("data.createTable.error.columnNameRequired");
    return;
  }

  const names = createForm.value.columns.map((column) => String(column.name).trim());
  if (new Set(names).size !== names.length) {
    createError.value = t("data.createTable.error.columnNameDuplicate");
    return;
  }

  const emptySelect = createForm.value.columns.find(
    (column) => column.type === "SELECT" && column.options.length === 0
  );
  if (emptySelect) {
    createError.value = t("data.createTable.error.selectOptionsRequired");
    return;
  }

  isCreating.value = true;
  try {
    const payload = {
      name: createForm.value.name,
      description: createForm.value.description || null,
      columns: createForm.value.columns.map((column, index) => ({
        name: String(column.name).trim(),
        type: column.type,
        is_required: column.is_required === true,
        sort_order: index,
        options: column.type === "SELECT" ? [...column.options] : [],
      })),
    };
    const created = await dataStore.createAdhocTable(projectId.value, payload);
    addToast({
      message: t("data.createTable.toast.created", { name: createForm.value.name }),
      type: "success",
    });
    router.push(`/project/${projectId.value}/data/${created.id}/list`);
  } catch (error) {
    createError.value = resolveCreateError(error);
  } finally {
    isCreating.value = false;
  }
};
</script>

<style scoped>
.create-form {
  display: grid;
  gap: 1.25rem;
  max-width: 760px;
}

.create-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 13px;
}

.create-form input:not([type="checkbox"]),
.create-form select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--color-surface, #fff);
}

.form-section {
  display: grid;
  gap: 0.75rem;
}

.form-section h2 {
  margin: 0;
  font-size: 15px;
}

.field-help {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #71717a);
  font-weight: 400;
}

.column-card {
  display: grid;
  gap: 0.65rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-surface, #fff);
}

.column-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.column-card__move {
  display: flex;
  gap: 0.15rem;
}

.column-card__footer {
  display: flex;
  justify-content: flex-end;
}

.required-check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 13px;
}

.required-check input {
  width: 14px;
  height: 14px;
}

.option-editor {
  display: grid;
  gap: 0.45rem;
}

.option-editor__label {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.option-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.option-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 999px;
  padding: 0.2rem 0.35rem 0.2rem 0.65rem;
  font-size: 13px;
  background: var(--color-surface-alt, #fafafa);
}

.option-chip__remove {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary, #71717a);
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  line-height: 1;
}

.option-add {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.option-add input {
  flex: 1;
  min-width: 160px;
}

.preview-card {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 12px;
  padding: 1rem;
  background: var(--color-surface, #fff);
}

.preview-table-wrap {
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table th,
.preview-table td {
  border: 1px solid var(--color-border, #e4e4e7);
  padding: 0.55rem 0.7rem;
  text-align: left;
}

.preview-table th {
  background: var(--color-surface-alt, #fafafa);
}

.preview-table th span {
  display: block;
}

.preview-table th small {
  display: block;
  margin-top: 0.15rem;
  font-weight: 400;
  color: var(--color-text-secondary, #71717a);
}

.preview-table td {
  color: var(--color-text-secondary, #71717a);
}

.status.error {
  color: #dc2626;
  margin: 0;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
