<template>
  <div v-if="open" class="modal-backdrop" @click="onBackdropClick">
    <div
      ref="dialogRef"
      class="modal"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :style="modalStyle"
      tabindex="-1"
      @click.stop
      @keydown="onKeydown"
    >
      <div class="modal-header">
        <h1 :id="titleId">{{ title }}</h1>
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
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let modalSeq = 0;

const { t } = useI18n();
const titleId = `modal-title-${++modalSeq}`;
const dialogRef = ref(null);
let previousFocus = null;

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

const focusableNodes = () => {
  const root = dialogRef.value;
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (node) => !node.hasAttribute("disabled") && node.getClientRects().length > 0,
  );
};

const focusDialog = async () => {
  await nextTick();
  const nodes = focusableNodes();
  const primary = nodes.find((node) => node.classList.contains("btn") && !node.classList.contains("btn--secondary"));
  const target = primary || nodes.find((node) => !node.classList.contains("icon-button")) || nodes[0] || dialogRef.value;
  target?.focus?.();
};

const onClose = () => {
  emit("close");
};

const onBackdropClick = () => {
  if (!props.closeOnBackdrop) return;
  onClose();
};

const onKeydown = (event) => {
  if (event.key === "Escape") {
    if (!props.closeOnBackdrop) return;
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;
  const nodes = focusableNodes();
  if (nodes.length === 0) {
    event.preventDefault();
    dialogRef.value?.focus?.();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previousFocus = document.activeElement;
      await focusDialog();
      return;
    }
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
    previousFocus = null;
  },
  { flush: "post", immediate: true },
);
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

.modal:focus {
  outline: none;
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
