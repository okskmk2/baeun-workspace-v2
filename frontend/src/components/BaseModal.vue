<template>
  <div v-if="open" class="modal-backdrop" @click="onBackdropClick">
    <div class="modal" :style="modalStyle" @click.stop>
      <div class="modal-header">
        <h1>{{ title }}</h1>
        <button
          type="button"
          class="icon-button"
          @click="onClose"
          :aria-label="t('common.actions.close')"
        >
          <MaterialSymbol name="close" :size="20" />
        </button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  closeOnBackdrop: { type: Boolean, default: true },
  maxWidth: { type: String, default: "420px" },
});

const modalStyle = computed(() => ({
  maxWidth: props.maxWidth,
}));

const emit = defineEmits(["close"]);

const onClose = () => {
  emit("close");
};

const onBackdropClick = () => {
  if (!props.closeOnBackdrop) return;
  onClose();
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  background-color: var(--color-page-bg);
  border: 1px solid var(--color-border);
  padding: 16px 24px 18px;
  width: 100%;
  border-radius: 8px;
  max-height: 80%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.modal-header h1 {
  font-size: 16px;
  margin: 0;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.icon-button {
  color: var(--text-color);
  border: none;
  background-color: transparent;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
</style>
