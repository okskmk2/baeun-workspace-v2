<template>
  <BaseModal :open="open" :title="t('wiki.page.confirm.cancel.title')" @close="handleClose">
    <p>{{ t("wiki.page.confirm.cancel.message") }}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn--secondary" @click="handleClose">
        {{ t("wiki.page.confirm.cancel.keepEditing") }}
      </button>
      <button type="button" class="btn" @click="handleConfirm">
        {{ t("wiki.page.confirm.cancel.discard") }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();

defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);

const handleClose = () => {
  emit("close");
};

const handleConfirm = () => {
  emit("confirm");
};
</script>

