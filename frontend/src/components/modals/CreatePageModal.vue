<template>
  <BaseModal :closeOnBackdrop="false" :open="open" :title="t('wiki.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="page-title">{{ t("wiki.layout.modal.titleLabel") }}</label>
        <input
          id="page-title"
          v-model.trim="form.title"
          type="text"
          :placeholder="t('wiki.layout.modal.titlePlaceholder')"
        />
      </div>
      <div class="form-field">
        <label for="page-parent">{{ t("wiki.layout.modal.parentLabel") }}</label>
        <select id="page-parent" v-model="form.parentId">
          <option :value="''">{{ t("wiki.layout.modal.parentRootOption") }}</option>
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
          {{ t("wiki.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("wiki.layout.actions.creating") : t("wiki.layout.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";
import { flattenPageTreeToOptions } from "../../lib/pageTreeText";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();
const router = useRouter();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  projectId: {
    type: [Number, String],
    required: true,
  },
  parentPageId: {
    type: [Number, String],
    default: null,
  },
  pages: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "created"]);

const form = ref({ title: "", parentId: "" });
const isCreating = ref(false);
const formError = ref("");

const parentPageOptions = computed(() => flattenPageTreeToOptions(props.pages));

const normalizeParentId = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.title) {
    formError.value = t("wiki.layout.validation.titleRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const res = await api.post("/pages", {
      project_id: props.projectId,
      title: form.value.title,
      parent_id: normalizeParentId(form.value.parentId),
    });
    const newPage = res.data;
    emit("created", newPage);
    handleClose();

    // Navigate to the new page
    if (newPage?.id) {
      router.push(`/project/${props.projectId}/wiki/${newPage.id}`);
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("wiki.layout.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = {
        title: "",
        parentId:
          props.parentPageId === null || props.parentPageId === undefined
            ? ""
            : String(props.parentPageId),
      };
      formError.value = "";
    }
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

