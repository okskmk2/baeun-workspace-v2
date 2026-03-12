<template>
  <BaseModal :open="open" :title="t('kanban.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="kanban-name">{{ t("kanban.layout.modal.nameLabel") }}</label>
        <input
          id="kanban-name"
          v-model.trim="form.name"
          type="text"
          :placeholder="t('kanban.layout.modal.namePlaceholder')"
        />
      </div>

      <div class="form-field">
        <label for="kanban-summary">{{ t("kanban.layout.modal.summaryLabel") }}</label>
        <input
          id="kanban-summary"
          v-model.trim="form.summary"
          type="text"
          maxlength="80"
          :placeholder="t('kanban.layout.modal.summaryPlaceholder')"
        />
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("kanban.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("kanban.layout.actions.creating") : t("kanban.layout.actions.submit") }}
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
    formError.value = t("kanban.layout.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/kanbans", {
      name: form.value.name,
      summary: form.value.summary,
      project_id: props.projectId,
      type: "KANBAN",
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("kanban.layout.status.errorCreate");
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

