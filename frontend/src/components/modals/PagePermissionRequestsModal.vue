<template>
  <BaseModal
    :open="open"
    :title="t('wiki.page.permissionRequestsModal.title')"
    max-width="560px"
    @close="handleClose"
  >
    <p v-if="isLoading" class="status-text">{{ t("wiki.page.status.loading") }}</p>
    <p v-else-if="!requests.length" class="status-text muted">
      {{ t("wiki.page.permissionRequestsModal.empty") }}
    </p>
    <ul v-else class="request-list">
      <li v-for="req in requests" :key="req.id" class="request-row">
        <div class="request-info">
          <span class="requester">{{ req.requester_name }}</span>
          <span class="reason">{{
            req.reason || t("wiki.page.permissionRequestsModal.noReason")
          }}</span>
        </div>
        <div class="request-actions">
          <button
            type="button"
            class="btn btn--sm"
            :disabled="processingId === req.id"
            @click="handleAction(req.id, 'APPROVED')"
          >
            {{ t("wiki.page.permissionRequestsModal.approve") }}
          </button>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="processingId === req.id"
            @click="handleAction(req.id, 'REJECTED')"
          >
            {{ t("wiki.page.permissionRequestsModal.reject") }}
          </button>
        </div>
      </li>
    </ul>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";
import { addToast } from "../../lib/toast";

const { t } = useI18n();

const props = defineProps({
  open: { type: Boolean, required: true },
  pageId: { type: [Number, String], required: true },
});

const emit = defineEmits(["close", "updated"]);

const requests = ref([]);
const isLoading = ref(false);
const processingId = ref(null);

const fetchRequests = async () => {
  if (!props.pageId) return;
  isLoading.value = true;
  try {
    const res = await api.get(`/pages/${props.pageId}/permission-requests`);
    requests.value = res.data || [];
  } catch {
    requests.value = [];
  } finally {
    isLoading.value = false;
  }
};

const handleAction = async (requestId, status) => {
  processingId.value = requestId;
  try {
    await api.patch(`/pages/${props.pageId}/permission-requests/${requestId}`, { status });
    const key =
      status === "APPROVED"
        ? "wiki.page.permissionRequestsModal.toast.approved"
        : "wiki.page.permissionRequestsModal.toast.rejected";
    addToast({ message: t(key), type: "success" });
    requests.value = requests.value.filter((r) => r.id !== requestId);
    emit("updated");
  } catch {
    addToast({ message: t("wiki.page.permissionRequestsModal.toast.error"), type: "error" });
  } finally {
    processingId.value = null;
  }
};

const handleClose = () => {
  emit("close");
};

watch(
  () => props.open,
  (val) => {
    if (val) fetchRequests();
  }
);
</script>

<style scoped>
.status-text {
  margin: 0;
  font-size: 14px;
}

.muted {
  color: var(--color-text-muted);
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
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.requester {
  font-size: 14px;
  font-weight: 500;
}

.reason {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.request-actions {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}
</style>
