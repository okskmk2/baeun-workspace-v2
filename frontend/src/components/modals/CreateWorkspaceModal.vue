<template>
  <BaseModal :open="open" :title="t('workspaceList.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="workspace-name">{{ t("workspaceList.modal.nameLabel") }}</label>
      <input
        id="workspace-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('workspaceList.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("workspaceList.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("workspaceList.actions.creating") : t("workspaceList.actions.create") }}
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
});

const emit = defineEmits(["close", "created"]);

const form = ref({ name: "" });
const isCreating = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.name) {
    formError.value = t("workspaceList.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/workspaces", {
      name: form.value.name,
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("workspaceList.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { name: "" };
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
