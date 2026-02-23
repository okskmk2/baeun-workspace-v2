<template>
  <BaseModal :open="open" :title="t('wiki.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="page-title">{{ t("wiki.layout.modal.titleLabel") }}</label>
      <input
        id="page-title"
        v-model.trim="form.title"
        type="text"
        :placeholder="t('wiki.layout.modal.titlePlaceholder')"
      />
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
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";
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
});

const emit = defineEmits(["close", "created"]);

const form = ref({ title: "" });
const isCreating = ref(false);
const formError = ref("");

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
      parent_id: props.parentPageId,
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
      form.value = { title: "" };
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-error {
  color: var(--color-danger);
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
