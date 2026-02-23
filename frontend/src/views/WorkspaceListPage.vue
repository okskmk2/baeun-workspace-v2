<template>
  <hgroup>
    <div>
      <h1>{{ t("workspaceList.header.title") }}</h1>
      <p class="subtitle">{{ t("workspaceList.header.subtitle") }}</p>
    </div>
    <div>
      <button type="button" class="btn" @click="openModal">
        {{ t("workspaceList.actions.add") }}
      </button>
    </div>
  </hgroup>
  <p v-if="isLoading">{{ t("workspaceList.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status-error">{{ errorMessage }}</p>
  <section v-else-if="workspaces.length === 0" class="empty-state">
    <h2>{{ t("workspaceList.empty.title") }}</h2>
    <p>{{ t("workspaceList.empty.workspaces") }}</p>
    <button type="button" class="btn btn--secondary" @click="openModal">
      {{ t("workspaceList.empty.cta") }}
    </button>
  </section>
  <ul v-else class="workspace-list">
    <li v-for="workspace in workspaces" :key="workspace.id" class="workspace-item">
      <div class="workspace-header">
        <div class="workspace-main">
          <Avatar
            :text="getWorkspaceInitials(workspace)"
            :label="workspace.name || 'Workspace'"
            :image-url="workspace.img_url || ''"
            :size="40"
          />
          <div>
            <h2>
              <router-link :to="`/settings/workspaces/${workspace.id}`" class="workspace-link">
                {{ workspace.name }}
              </router-link>
            </h2>
            <Tag v-if="workspace.role_name">
              {{ getRoleLabel("workspace_member", workspace.role_name) }}
            </Tag>
          </div>
        </div>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          @click="openDeleteModal(workspace)"
          :disabled="deletingWorkspaceId === workspace.id"
        >
          {{
            deletingWorkspaceId === workspace.id
              ? t("workspaceList.actions.deleting")
              : t("workspaceList.actions.delete")
          }}
        </button>
      </div>

      <ul class="project-list">
        <li v-if="!getProjects(workspace.id).length" class="project-empty">
          {{ t("workspaceList.empty.projects") }}
        </li>
        <li v-for="project in getProjects(workspace.id)" :key="project.id">
          <router-link :to="`/project/${project.id}`">
            {{ project.name }}
          </router-link>
        </li>
      </ul>
    </li>
  </ul>

  <CreateWorkspaceModal :open="isModalOpen" @close="closeModal" @created="onWorkspaceCreated" />

  <BaseModal
    :open="isDeleteModalOpen"
    :title="t('workspaceList.deleteModal.title')"
    :close-on-backdrop="!isDeleting"
    @close="closeDeleteModal"
  >
    <div class="delete-modal-body">
      <p>{{ t("workspaceList.deleteModal.description", { name: deleteTargetName }) }}</p>
      <p class="delete-warning">{{ t("workspaceList.deleteModal.warning") }}</p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="closeDeleteModal"
          :disabled="isDeleting"
        >
          {{ t("workspaceList.actions.cancel") }}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          @click="confirmDeleteWorkspace"
          :disabled="isDeleting"
        >
          {{ isDeleting ? t("workspaceList.actions.deleting") : t("workspaceList.actions.delete") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import CreateWorkspaceModal from "../components/modals/CreateWorkspaceModal.vue";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";
import Tag from "../components/Tag.vue";
import Avatar from "../components/Avatar.vue";
import { useRoleLabels } from "../lib/roleLabels";
import { addToast } from "../lib/toast";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const workspaceStore = useWorkspaceStore();
const workspaces = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const deletingWorkspaceId = ref(null);
const isDeleteModalOpen = ref(false);
const deleteTarget = ref(null);

const deleteTargetName = computed(() => deleteTarget.value?.name || "");
const isDeleting = computed(
  () => !!deleteTarget.value && deletingWorkspaceId.value === deleteTarget.value.id
);

const fetchWorkspaces = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    workspaces.value = await workspaceStore.fetchWorkspaces();
    await Promise.all(
      workspaces.value.map((workspace) => workspaceStore.fetchProjects(workspace.id))
    );
  } catch (error) {
    workspaces.value = [];
    errorMessage.value = t("workspaceList.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchWorkspaces);

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onWorkspaceCreated = async () => {
  await fetchWorkspaces();
  addToast({ message: t("workspaceList.toast.created"), type: "success" });
};

const openDeleteModal = (workspace) => {
  if (!workspace?.id) return;
  deleteTarget.value = workspace;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  if (isDeleting.value) return;
  isDeleteModalOpen.value = false;
  deleteTarget.value = null;
};

const confirmDeleteWorkspace = async () => {
  const workspaceId = deleteTarget.value?.id;
  if (!workspaceId) return;

  deletingWorkspaceId.value = workspaceId;
  errorMessage.value = "";

  try {
    await workspaceStore.deleteWorkspace(workspaceId);
    await fetchWorkspaces();
    addToast({ message: t("workspaceList.toast.deleted"), type: "success" });
    deletingWorkspaceId.value = null;
    closeDeleteModal();
  } catch (error) {
    const message = error?.response?.data?.message || t("workspaceList.status.errorDelete");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    deletingWorkspaceId.value = null;
  }
};

const getProjects = (workspaceId) => workspaceStore.getProjects(workspaceId);

const getWorkspaceInitials = (workspace) => {
  const name = String(workspace?.name || "").trim();
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
};
</script>

<style scoped>
.workspace-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.workspace-item {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background-color: var(--color-card-bg);
}

.workspace-item h2 {
  margin: 0;
  font-size: 18px;
  display: inline-block;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workspace-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workspace-link {
  margin-right: 8px;
}

.workspace-link:hover {
  text-decoration: underline;
}

.project-list {
  list-style: none;
  padding-left: 8px;
  margin: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-list li a {
  color: var(--color-text);
  text-decoration: none;
  font-size: 14px;
}

.project-list li a:hover {
  text-decoration: underline;
}

.project-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.empty-state {
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  padding: 28px;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.empty-state h2 {
  margin: 0;
  font-size: 18px;
}

.empty-state p {
  margin: 0;
  color: var(--color-text-muted);
}

.status-error {
  color: var(--color-danger);
}

.delete-modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-modal-body p {
  margin: 0;
}

.delete-warning {
  color: var(--color-danger);
  font-size: 13px;
}
</style>
