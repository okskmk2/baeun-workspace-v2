<template>
  <BaseModal :open="open" :title="t('messenger.layout.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="channel-name">{{ t("messenger.layout.modal.nameLabel") }}</label>
      <input
        id="channel-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('messenger.layout.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("messenger.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{
            isCreating
              ? t("messenger.layout.actions.creating")
              : t("messenger.layout.actions.create")
          }}
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
import { addToast } from "../../lib/toast";
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
    formError.value = t("messenger.layout.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const res = await api.post("/channels", {
      name: form.value.name,
      project_id: props.projectId,
    });
    const newChannel = res.data;
    
    addToast({
      message: t("messenger.layout.status.createSuccess"),
      type: "success",
    });
    
    emit("created", newChannel);
    handleClose();
    
    // Navigate to the new channel
    if (newChannel?.id) {
      router.push(`/project/${props.projectId}/messenger/${newChannel.id}`);
    }
  } catch (error) {
    formError.value = error?.response?.data?.message || t("messenger.layout.status.errorCreate");
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
