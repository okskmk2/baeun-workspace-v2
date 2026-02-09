<template>
  <div v-if="open" class="modal-backdrop" @click="onClose">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button type="button" class="icon-button" @click="onClose" :aria-label="t('common.actions.close')">
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
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const onClose = () => {
  emit("close");
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 16px;
  max-width: 420px;
  width: 100%;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-button {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
</style>
