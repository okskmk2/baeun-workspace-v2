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
      <span v-if="unreadCount > 0" class="notification-menu__badge">{{
        unreadCount > 99 ? "99+" : unreadCount
      }}</span>
    </button>

    <div v-if="isOpen" class="notification-menu__panel" role="menu">
      <div class="notification-menu__header">
        <p class="notification-menu__title">{{ t("layout.project.util.notifications") }}</p>
        <button
          type="button"
          class="notification-menu__read-all"
          :disabled="isMarkingAllRead || !hasUnread"
          @click="markAllAsRead"
        >
          {{ t("layout.project.util.notificationsReadAll") }}
        </button>
      </div>
      <p v-if="isLoading" class="notification-menu__empty">
        {{ t("layout.project.util.notificationsLoading") }}
      </p>
      <ul v-else-if="notifications.length" class="notification-menu__list">
        <li v-for="item in notifications" :key="item.id">
          <button
            type="button"
            class="notification-menu__item"
            :class="{ unread: !item.is_read }"
            @click="onClickNotification(item)"
          >
            <p class="notification-menu__item-title">{{ item.title }}</p>
            <p v-if="item.body" class="notification-menu__item-body">{{ item.body }}</p>
            <p class="notification-menu__item-meta">{{ formatDateTime(item.created_at) }}</p>
          </button>
        </li>
      </ul>
      <p v-else class="notification-menu__empty">
        {{ t("layout.project.util.notificationsEmpty") }}
      </p>
      <div class="notification-menu__footer">
        <router-link
          class="notification-menu__history-link"
          :to="`/project/${route.params.projectId}/settings/notifications`"
          @click="closeMenu"
        >
          {{ t("layout.project.util.notificationsHistory") }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import { GNB_OVERLAYS, useGnbOverlayStore } from "../stores/gnbOverlayStore";
import { useRealtimeStore } from "../stores/realtimeStore";
import { useAppStore } from "../stores/appStore";
import { resolveNotificationPath } from "../lib/notificationNav";
import MaterialSymbol from "./MaterialSymbol.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const gnbOverlayStore = useGnbOverlayStore();
const { isProjectNotificationsOpen: isOpen } = storeToRefs(gnbOverlayStore);
const realtimeStore = useRealtimeStore();
const appStore = useAppStore();
const menuRef = ref(null);
const notifications = ref([]);
const unreadCount = ref(0);
const isLoading = ref(false);
const isMarkingAllRead = ref(false);
let unsubscribeNotification = null;

const hasUnread = computed(() => unreadCount.value > 0);

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};


const loadNotifications = async () => {
  if (!appStore.currentUser) return;
  try {
    isLoading.value = true;
    const res = await api.get("/notifications", {
      params: { limit: 20 },
    });
    unreadCount.value = Number(res.data?.unread_count || 0);
    notifications.value = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (error) {
    notifications.value = [];
    unreadCount.value = 0;
  } finally {
    isLoading.value = false;
  }
};

const markAsRead = async (notificationId) => {
  try {
    await api.patch(`/notifications/${notificationId}/read`);
    notifications.value = notifications.value.map((item) =>
      String(item.id) === String(notificationId)
        ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }
        : item
    );
    unreadCount.value = notifications.value.filter((item) => !item.is_read).length;
  } catch (error) {
    // noop
  }
};

const onClickNotification = async (item) => {
  if (!item?.is_read) {
    await markAsRead(item.id);
  }
  const nextPath = resolveNotificationPath(item, route.params.projectId);
  closeMenu();
  if (nextPath) {
    router.push(nextPath);
  }
};

const markAllAsRead = async () => {
  if (!hasUnread.value || isMarkingAllRead.value) return;
  try {
    isMarkingAllRead.value = true;
    await api.post("/notifications/read-all");
    notifications.value = notifications.value.map((item) => ({
      ...item,
      is_read: true,
      read_at: item.read_at || new Date().toISOString(),
    }));
    unreadCount.value = 0;
  } finally {
    isMarkingAllRead.value = false;
  }
};

const closeMenu = () => {
  gnbOverlayStore.close(GNB_OVERLAYS.PROJECT_NOTIFICATIONS);
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
  gnbOverlayStore.open(GNB_OVERLAYS.PROJECT_NOTIFICATIONS);
  loadNotifications();
  document.removeEventListener("click", onDocumentClick);
  document.addEventListener("click", onDocumentClick);
};

onMounted(() => {
  if (!appStore.currentUser) return;
  loadNotifications();
  unsubscribeNotification = realtimeStore.subscribe("notification", () => {
    loadNotifications();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  if (unsubscribeNotification) unsubscribeNotification();
  unsubscribeNotification = null;
});
</script>

<style scoped>
.notification-menu {
  position: relative;
}

.notification-menu .btn {
  position: relative;
}

.notification-menu__badge {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(35%, -35%);
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-sizing: border-box;
}

.notification-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 320px;
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: 12px;
  z-index: 30;
}

.notification-menu__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.notification-menu__title {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.notification-menu__read-all {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.notification-menu__read-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.notification-menu__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-menu__item {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  text-align: left;
  padding: 10px;
  cursor: pointer;
}

.notification-menu__item.unread {
  border-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border));
}

.notification-menu__item-title {
  margin: 0;
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-menu__item-body {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.notification-menu__item-meta {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.notification-menu__empty {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.notification-menu__footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.utilnav .notification-menu__history-link {
  font-size: 13px;
  color: var(--color-text);
  text-decoration: none;
}

.utilnav .notification-menu__history-link:hover {
  text-decoration: underline;
}
</style>
