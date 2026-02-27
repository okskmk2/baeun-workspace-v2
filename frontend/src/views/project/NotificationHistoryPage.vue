<template>
  <BackLinkButton @click="$router.back()">
    {{ t("messenger.settings.actions.back") }}
  </BackLinkButton>
  <hgroup>
    <div>
      <h1>{{ t("layout.project.util.notificationsHistory") }}</h1>
      <p class="subtitle">{{ t("layout.project.util.notificationsHistorySubtitle") }}</p>
    </div>
    <div class="actions">
      <button
        type="button"
        class="btn btn--secondary"
        :class="{ active: filterMode === 'all' }"
        @click="filterMode = 'all'"
      >
        {{ t("layout.project.util.notificationsFilterAll") }}
      </button>
      <button
        type="button"
        class="btn btn--secondary"
        :class="{ active: filterMode === 'unread' }"
        @click="filterMode = 'unread'"
      >
        {{ t("layout.project.util.notificationsFilterUnread") }}
      </button>
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="isMarkingAllRead || unreadCount <= 0"
        @click="markAllAsRead"
      >
        {{ t("layout.project.util.notificationsReadAll") }}
      </button>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("layout.project.util.notificationsLoading") }}</p>
  <p v-else-if="!visibleNotifications.length" class="status">
    {{ t("layout.project.util.notificationsEmpty") }}
  </p>

  <ul v-else class="notification-history">
    <li v-for="item in visibleNotifications" :key="item.id">
      <button
        type="button"
        class="notification-item"
        :class="{ unread: !item.is_read }"
        @click="onClickNotification(item)"
      >
        <div class="notification-item__title-row">
          <MaterialSymbol :name="getNotificationIcon(item)" :size="18" />
          <p class="notification-item__title">{{ item.title }}</p>
        </div>
        <p v-if="item.body" class="notification-item__body">{{ item.body }}</p>
        <p class="notification-item__meta">{{ formatDateTime(item.created_at) }}</p>
      </button>
    </li>
  </ul>

  <div v-if="hasMore" class="load-more-wrap">
    <button type="button" class="btn btn--secondary" :disabled="isLoadingMore" @click="loadMore">
      {{
        isLoadingMore
          ? t("layout.project.util.notificationsLoadingMore")
          : t("layout.project.util.notificationsLoadMore")
      }}
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import BackLinkButton from "../../components/BackLinkButton.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const PAGE_SIZE = 30;
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const notifications = ref([]);
const unreadCount = ref(0);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const isMarkingAllRead = ref(false);
const hasMore = ref(false);
const filterMode = ref("all");

const currentProjectId = computed(() => route.params.projectId);
const visibleNotifications = computed(() => {
  if (filterMode.value === "unread") {
    return notifications.value.filter((item) => !item.is_read);
  }
  return notifications.value;
});

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const resolveNotificationPath = (notification) => {
  const projectId = notification.project_id || currentProjectId.value;
  const payload = notification.payload || {};
  const channelId = payload.channel_id || notification.resource_id;
  const taskId = payload.task_id || payload.issue_id || notification.resource_id;
  const kanbanId = payload.kanban_id || payload.board_id;

  if (
    String(notification.type || "") === "issue.assigned_to_me" &&
    projectId &&
    kanbanId &&
    taskId
  ) {
    return `/project/${projectId}/kanban/${kanbanId}/task/${taskId}`;
  }

  if (notification.resource_type === "channel" && projectId && channelId) {
    return `/project/${projectId}/channel/${channelId}`;
  }

  if (notification.resource_type === "issue" && projectId) {
    return `/project/${projectId}/kanban`;
  }

  if (projectId) {
    return `/project/${projectId}/kanban`;
  }

  return "";
};

const getNotificationIcon = (notification) => {
  const type = String(notification?.type || "");
  if (type.includes("assigned")) return "assignment_ind";
  if (type.includes("status")) return "task_alt";
  if (type.includes("content")) return "edit_note";
  if (type.includes("invited")) return "group_add";
  if (type.includes("notice")) return "campaign";
  return "notifications";
};

const fetchNotifications = async ({ append = false } = {}) => {
  if (append) {
    isLoadingMore.value = true;
  } else {
    isLoading.value = true;
  }

  try {
    const beforeId = append ? notifications.value[notifications.value.length - 1]?.id : null;
    const res = await api.get("/notifications", {
      params: {
        limit: PAGE_SIZE,
        read: filterMode.value,
        ...(beforeId ? { before_id: beforeId } : {}),
      },
    });

    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    unreadCount.value = Number(res.data?.unread_count || 0);

    if (append) {
      notifications.value = [...notifications.value, ...items];
    } else {
      notifications.value = items;
    }

    hasMore.value = items.length === PAGE_SIZE;
  } catch (error) {
    if (!append) {
      notifications.value = [];
      unreadCount.value = 0;
      hasMore.value = false;
    }
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
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

  const nextPath = resolveNotificationPath(item);
  if (nextPath) {
    router.push(nextPath);
  }
};

const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return;
  await fetchNotifications({ append: true });
};

const markAllAsRead = async () => {
  if (isMarkingAllRead.value || unreadCount.value <= 0) return;
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

watch(filterMode, () => {
  hasMore.value = false;
  fetchNotifications({ append: false });
});

onMounted(() => {
  fetchNotifications();
});
</script>

<style scoped>
.notification-history {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions {
  display: inline-flex;
  gap: 6px;
}

.actions .btn.active {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
}

.notification-item {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-card-bg);
  text-align: left;
  padding: 12px;
  cursor: pointer;
}

.notification-item__title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.notification-item.unread {
  border-color: color-mix(in srgb, var(--color-primary) 60%, var(--color-border));
}

.notification-item__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.notification-item__body {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.notification-item__meta {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.status {
  margin: 10px 0 0;
  color: var(--color-text-muted);
}

.load-more-wrap {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}
</style>

