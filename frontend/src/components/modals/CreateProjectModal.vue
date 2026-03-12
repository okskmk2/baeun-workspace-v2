<template>
  <BaseModal :open="open" :title="t('workspace.home.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="project-name">{{ t("workspace.home.modal.nameLabel") }}</label>
        <input
          id="project-name"
          v-model.trim="form.name"
          type="text"
          :placeholder="t('workspace.home.modal.namePlaceholder')"
        />
      </div>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("workspace.home.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{
            isCreating ? t("workspace.home.actions.creating") : t("workspace.home.actions.submit")
          }}
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
  workspaceId: {
    type: [Number, String],
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
    formError.value = t("workspace.home.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/projects", {
      name: form.value.name,
      workspace_id: props.workspaceId,
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("workspace.home.status.errorCreate");
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

