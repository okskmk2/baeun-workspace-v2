<template>
  <div class="toast-host">
    <transition-group name="toast" tag="div" class="toast-stack">
      <div v-for="toast in toastState.items" :key="toast.id" class="toast" :class="toast.type">
        <span class="toast-message">{{ toast.message }}</span>
        <button type="button" class="toast-close" @click="removeToast(toast.id)">
          {{ t("common.actions.close") }}
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { toastState, removeToast } from "../lib/toast";

const { t } = useI18n();
</script>

<style scoped>
.toast-host {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  pointer-events: auto;
  min-width: 240px;
  max-width: 320px;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: #111827;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.toast.success {
  background-color: #16a34a;
}

.toast.error {
  background-color: #b91c1c;
}

.toast.info {
  background-color: #0f172a;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  border: none;
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  cursor: pointer;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
