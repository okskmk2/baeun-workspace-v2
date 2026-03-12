<template>
  <BaseModal :open="open" :title="title" :close-on-backdrop="!isDeleting" @close="handleClose">
    <div class="delete-modal-body">
      <p>{{ message }}</p>
      <p v-if="warningMessage" class="delete-warning">{{ warningMessage }}</p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="handleClose"
          :disabled="isDeleting"
        >
          {{ cancelLabel }}
        </button>
        <button type="button" class="btn btn--danger" @click="handleConfirm" :disabled="isDeleting">
          {{ isDeleting ? deletingLabel : confirmLabel }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import BaseModal from "../BaseModal.vue";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  warningMessage: {
    type: String,
    default: "",
  },
  confirmLabel: {
    type: String,
    required: true,
  },
  deletingLabel: {
    type: String,
    required: true,
  },
  cancelLabel: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["close", "confirm"]);

const isDeleting = ref(false);

const handleClose = () => {
  if (!isDeleting.value) {
    emit("close");
  }
};

const handleConfirm = async () => {
  isDeleting.value = true;
  emit("confirm");
};

// Reset deleting state when modal closes
watch(
  () => props.open,
  (newVal) => {
    if (!newVal) {
      isDeleting.value = false;
    }
  }
);
</script>

<style scoped>
.delete-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.delete-warning {
  color: var(--color-danger);
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
