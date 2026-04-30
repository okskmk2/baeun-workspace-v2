<template>
  <div
    class="fab-area"
    :class="{ 'fab-area--open': isOpen }"
    :style="{
      '--fab-right': `${right}px`,
      '--fab-bottom': `${bottom}px`,
    }"
  >
    <div v-if="isOpen" class="fab-menu" role="menu" :aria-label="menuAriaLabel">
      <button
        v-for="action in actions"
        :key="action.key"
        type="button"
        class="fab-menu__item"
        @click="onClickAction(action)"
      >
        <span class="fab-menu__label">{{ action.label }}</span>
        <span class="fab-menu__icon">
          <MaterialSymbol :name="action.icon || 'bolt'" :size="18" alt="" />
        </span>
      </button>
    </div>

    <button
      type="button"
      class="fab-main"
      :aria-expanded="String(isOpen)"
      :aria-label="buttonAriaLabel"
      @click="toggleOpen"
    >
      <MaterialSymbol :name="isOpen ? closeIcon : mainIcon" :size="24" alt="" />
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import MaterialSymbol from "./MaterialSymbol.vue";

defineProps({
  actions: {
    type: Array,
    default: () => [],
  },
  right: {
    type: Number,
    default: 28,
  },
  bottom: {
    type: Number,
    default: 28,
  },
  mainIcon: {
    type: String,
    default: "edit_square",
  },
  closeIcon: {
    type: String,
    default: "close",
  },
  buttonAriaLabel: {
    type: String,
    default: "빠른 액션 메뉴 열기",
  },
  menuAriaLabel: {
    type: String,
    default: "빠른 액션",
  },
});

const emit = defineEmits(["action-click", "toggle"]);
const isOpen = ref(false);

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
  emit("toggle", isOpen.value);
};

const onClickAction = (action) => {
  emit("action-click", action);
  isOpen.value = false;
  emit("toggle", isOpen.value);
};
</script>

<style scoped>
.fab-area {
  position: fixed;
  right: var(--fab-right, 28px);
  bottom: var(--fab-bottom, 28px);
  z-index: 30;
  display: grid;
  justify-items: end;
  gap: 10px;
}

.fab-main {
  width: 58px;
  height: 58px;
  border-radius: 999px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%);
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.35);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fab-main:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(14, 165, 233, 0.35);
}

.fab-area--open .fab-main {
  transform: rotate(45deg);
}

.fab-menu {
  display: grid;
  gap: 8px;
}

.fab-menu__item {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 999px;
  padding: 8px 10px 8px 14px;
  min-width: 150px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
  cursor: pointer;
}

.fab-menu__item:hover {
  background: color-mix(in srgb, var(--color-surface) 75%, var(--color-border) 25%);
}

.fab-menu__label {
  font-size: 13px;
  font-weight: 700;
}

.fab-menu__icon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-border) 75%, transparent);
}

@media (max-width: 900px) {
  .fab-area {
    right: 16px;
    bottom: 16px;
  }
}
</style>
