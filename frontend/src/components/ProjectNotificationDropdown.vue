<template>
  <div class="notification-menu" ref="menuRef">
    <button
      type="button"
      class="btn btn--icon"
      :aria-label="t('layout.project.util.notifications')"
      :title="t('layout.project.util.notifications')"
      :aria-expanded="isOpen ? 'true' : 'false'"
      @click="toggleMenu"
    >
      <MaterialSymbol name="notifications" :size="18" alt="" />
    </button>

    <div v-if="isOpen" class="notification-menu__panel" role="menu">
      <p class="notification-menu__title">{{ t("layout.project.util.notifications") }}</p>
      <p class="notification-menu__empty">{{ t("layout.project.util.notificationsEmpty") }}</p>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";

const { t } = useI18n();
const menuRef = ref(null);
const isOpen = ref(false);

const closeMenu = () => {
  isOpen.value = false;
  document.removeEventListener("click", onDocumentClick);
};

const onDocumentClick = (event) => {
  if (!isOpen.value) return;
  const target = event.target;
  if (!menuRef.value || menuRef.value.contains(target)) return;
  closeMenu();
};

const toggleMenu = () => {
  if (isOpen.value) {
    closeMenu();
    return;
  }
  isOpen.value = true;
  document.removeEventListener("click", onDocumentClick);
  document.addEventListener("click", onDocumentClick);
};

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<style scoped>
.notification-menu {
  position: relative;
}

.notification-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 280px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: 12px;
  z-index: 30;
}

.notification-menu__title {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.notification-menu__empty {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
