<template>
  <BaseModal :closeOnBackdrop="false" :open="open" :title="t('wiki.page.move.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="move-page-parent">{{ t("wiki.page.move.modal.parentLabel") }}</label>
        <select id="move-page-parent" v-model="form.parentId">
          <option :value="''">{{ t("wiki.page.move.modal.parentRootOption") }}</option>
          <option
            v-for="option in parentPageOptions"
            :key="`parent-${option.id}`"
            :value="String(option.id)"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isSaving">
          {{ isSaving ? t("wiki.page.move.actions.moving") : t("wiki.page.move.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { flattenPageTreeToOptions } from "../../lib/pageTreeText";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  pageId: {
    type: [Number, String],
    required: true,
  },
  currentParentId: {
    type: [Number, String, null],
    default: null,
  },
  pages: {
    type: Array,
    default: () => [],
  },
  isSaving: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "save"]);

const form = ref({
  parentId: "",
});
const formError = ref("");

const toComparableString = (value) => String(value ?? "");

const collectDescendantIds = (nodes, id, bucket = new Set()) => {
  if (!Array.isArray(nodes)) return bucket;
  for (const node of nodes) {
    if (!node?.id) continue;
    if (toComparableString(node.id) === toComparableString(id)) {
      collectAllNestedIds(node.children, bucket);
      return bucket;
    }
    collectDescendantIds(node.children, id, bucket);
  }
  return bucket;
};

const collectAllNestedIds = (nodes, bucket) => {
  if (!Array.isArray(nodes)) return;
  for (const node of nodes) {
    if (!node?.id) continue;
    bucket.add(toComparableString(node.id));
    collectAllNestedIds(node.children, bucket);
  }
};

const filterOutInvalidParents = (nodes, blockedIds) => {
  if (!Array.isArray(nodes)) return [];
  const result = [];
  for (const node of nodes) {
    if (!node?.id) continue;
    const id = toComparableString(node.id);
    if (blockedIds.has(id)) continue;
    result.push({
      ...node,
      children: filterOutInvalidParents(node.children, blockedIds),
    });
  }
  return result;
};

const descendantIds = computed(() => collectDescendantIds(props.pages, props.pageId));

const blockedParentIds = computed(() => {
  const blocked = new Set(descendantIds.value);
  blocked.add(toComparableString(props.pageId));
  return blocked;
});

const parentTree = computed(() => filterOutInvalidParents(props.pages, blockedParentIds.value));
const parentPageOptions = computed(() => flattenPageTreeToOptions(parentTree.value));

const normalizedParentId = computed(() => {
  if (form.value.parentId === "" || form.value.parentId == null) return null;
  return form.value.parentId;
});

const handleClose = () => {
  emit("close");
};

const handleSubmit = () => {
  formError.value = "";
  emit("save", {
    parentId: normalizedParentId.value,
  });
};

const resetForm = () => {
  form.value = {
    parentId:
      props.currentParentId === null || props.currentParentId === undefined
        ? ""
        : String(props.currentParentId),
  };
  formError.value = "";
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm();
  }
);
</script>

<style scoped>
.form-field {
  display: grid;
  gap: 0.4rem;
}

.form-field + .form-field {
  margin-top: 0.8rem;
}

select {
  width: 100%;
}
</style>