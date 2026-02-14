<template>
  <BaseModal :open="open" :title="t('board.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="board-name">{{ t("board.layout.modal.nameLabel") }}</label>
      <input
        id="board-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('board.layout.modal.namePlaceholder')"
      />

      <label for="board-summary">{{ t("board.layout.modal.summaryLabel") }}</label>
      <input
        id="board-summary"
        v-model.trim="form.summary"
        type="text"
        maxlength="80"
        :placeholder="t('board.layout.modal.summaryPlaceholder')"
      />

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("board.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("board.layout.actions.creating") : t("board.layout.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  projectId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(["close", "created"]);

const form = ref({ name: "", summary: "" });
const isCreating = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.name) {
    formError.value = t("board.layout.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/boards", {
      name: form.value.name,
      summary: form.value.summary,
      project_id: props.projectId,
      type: "KANBAN",
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("board.layout.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { name: "", summary: "" };
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
