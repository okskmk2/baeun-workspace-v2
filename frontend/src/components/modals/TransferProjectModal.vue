<template>
  <BaseModal :open="open" :title="t('settings.home.transferModal.title')" :close-on-backdrop="!isTransferring" @close="handleClose">
    <div class="transfer-modal-body">
      <p class="transfer-desc">{{ t("settings.home.transferModal.description") }}</p>

      <p v-if="isLoadingWorkspaces" class="status">{{ t("settings.home.transferModal.loading") }}</p>
      <p v-else-if="!candidates.length" class="status muted">
        {{ t("settings.home.transferModal.empty") }}
      </p>

      <ul v-else class="workspace-list">
        <li v-for="workspace in candidates" :key="workspace.id">
          <label class="workspace-option" :class="{ disabled: !hasSlot(workspace) }">
            <input
              type="radio"
              name="target-workspace"
              :value="workspace.id"
              :disabled="!hasSlot(workspace)"
              v-model="selectedWorkspaceId"
            />
            <span class="workspace-name">{{ workspace.name }}</span>
            <span class="workspace-slot" :class="{ error: !hasSlot(workspace) }">
              {{
                t("settings.home.transferModal.slotRemaining", {
                  remaining: workspace.project_slot_remaining ?? 0,
                  granted: workspace.project_slot_total ?? 0,
                })
              }}
            </span>
          </label>
        </li>
      </ul>

      <template v-if="selectedWorkspaceId">
        <p class="transfer-warning">{{ t("settings.home.transferModal.warning") }}</p>
        <label for="transfer-confirm-name">
          {{ t("settings.home.transferModal.confirmLabel", { name: projectName }) }}
        </label>
        <input
          id="transfer-confirm-name"
          v-model.trim="confirmName"
          type="text"
          :placeholder="projectName"
          :disabled="isTransferring"
        />
      </template>

      <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>

      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" :disabled="isTransferring" @click="handleClose">
          {{ t("settings.home.actions.cancel") }}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          :disabled="!canSubmit || isTransferring"
          @click="handleConfirm"
        >
          {{ isTransferring ? t("settings.home.actions.transferring") : t("settings.home.actions.transfer") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseModal from "../BaseModal.vue";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  projectId: {
    type: [String, Number],
    default: "",
  },
  projectName: {
    type: String,
    default: "",
  },
  currentWorkspaceId: {
    type: [String, Number],
    default: "",
  },
});

const emit = defineEmits(["close", "transferred"]);

const { t } = useI18n();
const workspaceStore = useWorkspaceStore();

const isLoadingWorkspaces = ref(false);
const isTransferring = ref(false);
const errorMessage = ref("");
const selectedWorkspaceId = ref("");
const confirmName = ref("");

const candidates = computed(() =>
  workspaceStore.workspaces
    .filter((workspace) => {
      if (String(workspace.id) === String(props.currentWorkspaceId)) return false;
      return ["OWNER", "ADMIN"].includes(String(workspace.role_name || "").toUpperCase());
    })
    // "/workspaces/my" doesn't include slot counts, so merge in the per-workspace detail.
    .map((workspace) => ({ ...workspace, ...(workspaceStore.workspaceById[workspace.id] || {}) }))
);

const hasSlot = (workspace) => Number(workspace.project_slot_remaining ?? 0) > 0;

const canSubmit = computed(
  () => Boolean(selectedWorkspaceId.value) && confirmName.value === props.projectName
);

const resetState = () => {
  selectedWorkspaceId.value = "";
  confirmName.value = "";
  errorMessage.value = "";
  isTransferring.value = false;
};

const handleClose = () => {
  if (isTransferring.value) return;
  emit("close");
};

const handleConfirm = async () => {
  if (!canSubmit.value) return;

  isTransferring.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.transferProject(props.projectId, selectedWorkspaceId.value);
    emit("transferred", { targetWorkspaceId: selectedWorkspaceId.value });
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || t("settings.home.transferModal.errorTransfer");
  } finally {
    isTransferring.value = false;
  }
};

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      resetState();
      return;
    }

    isLoadingWorkspaces.value = true;
    try {
      await workspaceStore.fetchWorkspaces({ force: true });
      const targets = workspaceStore.workspaces.filter(
        (workspace) =>
          String(workspace.id) !== String(props.currentWorkspaceId) &&
          ["OWNER", "ADMIN"].includes(String(workspace.role_name || "").toUpperCase())
      );
      // Slot counts only come from the per-workspace detail endpoint, not the list one.
      await Promise.all(targets.map((workspace) => workspaceStore.fetchWorkspace(workspace.id)));
    } finally {
      isLoadingWorkspaces.value = false;
    }
  }
);
</script>

<style scoped>
.transfer-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.transfer-desc {
  margin: 0;
  color: var(--color-text-muted);
}

.workspace-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.workspace-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.workspace-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workspace-name {
  flex: 1;
}

.workspace-slot {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.workspace-slot.error {
  color: var(--color-danger);
}

.transfer-warning {
  color: var(--color-danger);
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.muted {
  color: var(--color-text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

#transfer-confirm-name {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid var(--color-input-border);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: 8px 10px;
}
</style>
