<template>
  <div class="permissions-page">
    <hgroup>
      <h1>{{ t("settings.member.permissionRequests.title") }}</h1>
    </hgroup>

    <section class="request-section">
      <p v-if="isLoading" class="status-text">{{ t("settings.member.status.loading") }}</p>
      <p v-else-if="loadError" class="status-text status-text--error">{{ loadError }}</p>
      <template v-else>
        <p v-if="!permissionRequests.length" class="status-text status-text--muted">
          {{ t("settings.member.permissionRequests.empty") }}
        </p>
        <ul v-else class="request-list">
          <li v-for="req in permissionRequests" :key="req.id" class="request-row">
            <div class="request-info">
              <router-link
                class="page-name page-name--link"
                :to="`/project/${projectId}/wiki/${req.page_id}`"
              >{{ req.page_title }}</router-link>
              <div class="request-meta">
                <span class="requester">{{ req.requester_name }}</span>
                <span class="separator">·</span>
                <span class="reason">{{
                  req.reason || t("settings.member.permissionRequests.noReason")
                }}</span>
              </div>
            </div>
            <div class="request-actions">
              <button
                type="button"
                class="btn btn--sm"
                :disabled="processingId === req.id"
                @click="handleAction(req.id, req.page_id, 'APPROVED')"
              >
                {{ t("settings.member.permissionRequests.approve") }}
              </button>
              <button
                type="button"
                class="btn btn--secondary btn--sm"
                :disabled="processingId === req.id"
                @click="handleAction(req.id, req.page_id, 'REJECTED')"
              >
                {{ t("settings.member.permissionRequests.reject") }}
              </button>
            </div>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { useRealtimeStore } from "../../stores/realtimeStore";

const { t } = useI18n();
const route = useRoute();
const realtimeStore = useRealtimeStore();

const projectId = computed(() => route.params.projectId);

const permissionRequests = ref([]);
const isLoading = ref(false);
const loadError = ref("");
const processingId = ref(null);

const fetchRequests = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await api.get(`/projects/${projectId.value}/permission-requests`);
    permissionRequests.value = res.data || [];
  } catch {
    loadError.value = t("settings.member.permissionRequests.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const handleAction = async (requestId, pageId, status) => {
  processingId.value = requestId;
  try {
    await api.patch(`/pages/${pageId}/permission-requests/${requestId}`, { status });
    const toastKey =
      status === "APPROVED"
        ? "settings.member.permissionRequests.toast.approved"
        : "settings.member.permissionRequests.toast.rejected";
    addToast({ message: t(toastKey), type: "success" });
    permissionRequests.value = permissionRequests.value.filter((r) => r.id !== requestId);
  } catch {
    addToast({ message: t("settings.member.permissionRequests.toast.error"), type: "error" });
  } finally {
    processingId.value = null;
  }
};

let unsubscribeRealtime = null;

onMounted(() => {
  fetchRequests();
  unsubscribeRealtime = realtimeStore.subscribe("notification", (data) => {
    if (data?.notification_type === "page_permission_request") {
      fetchRequests();
    }
  });
});

onBeforeUnmount(() => {
  if (unsubscribeRealtime) unsubscribeRealtime();
  unsubscribeRealtime = null;
});

watch(projectId, fetchRequests);
</script>

<style scoped>
.permissions-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.request-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-text {
  margin: 0;
  font-size: 14px;
}

.status-text--muted {
  color: var(--color-text-muted);
}

.status-text--error {
  color: var(--color-danger, #dc2626);
}

.request-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border, #e5e7eb);
  background-color: var(--color-page-bg, #ffffff);
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.page-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-name--link {
  color: var(--color-text);
  text-decoration: none;
}

.page-name--link:hover {
  text-decoration: underline;
}

.request-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.requester {
  font-size: 12px;
  color: var(--color-text-muted, #6b7280);
}

.separator {
  font-size: 12px;
  color: var(--color-text-muted, #9ca3af);
}

.reason {
  font-size: 12px;
  color: var(--color-text-muted, #9ca3af);
  word-break: break-word;
}

.request-actions {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
