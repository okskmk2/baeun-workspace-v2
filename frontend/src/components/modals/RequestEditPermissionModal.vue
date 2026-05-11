<template>
  <BaseModal :open="open" :title="t('wiki.page.permissionRequest.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="request-reason">{{ t("wiki.page.permissionRequest.reasonLabel") }}</label>
        <textarea
          id="request-reason"
          v-model="reason"
          class="reason-textarea"
          rows="4"
          :placeholder="t('wiki.page.permissionRequest.reasonPlaceholder')"
        ></textarea>
      </div>
      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isSubmitting">
          {{
            isSubmitting
              ? t("wiki.page.permissionRequest.submitting")
              : t("wiki.page.permissionRequest.submit")
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
import { addToast } from "../../lib/toast";

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, required: true },
  pageId: { type: [Number, String], required: true },
});

const emit = defineEmits(["close", "submitted"]);

const reason = ref("");
const isSubmitting = ref(false);
const errorMessage = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await api.post(`/pages/${props.pageId}/permission-requests`, {
      reason: reason.value.trim() || null,
    });
    addToast({ message: t("wiki.page.permissionRequest.toast.success"), type: "success" });
    emit("submitted");
    emit("close");
  } catch (error) {
    const status = error?.response?.status;
    if (status === 409) {
      errorMessage.value = t("wiki.page.permissionRequest.toast.alreadyPending");
    } else {
      errorMessage.value = t("wiki.page.permissionRequest.toast.error");
    }
  } finally {
    isSubmitting.value = false;
  }
};

watch(
  () => props.open,
  (val) => {
    if (val) {
      reason.value = "";
      errorMessage.value = "";
    }
  }
);
</script>

<style scoped>
.reason-textarea {
  width: 100%;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  resize: vertical;
  box-sizing: border-box;
}

.form-error {
  margin: 0;
  font-size: 13px;
  color: var(--color-danger, #dc2626);
}
</style>
