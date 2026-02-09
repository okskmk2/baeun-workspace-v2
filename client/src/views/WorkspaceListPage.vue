<template>
  <hgroup>
    <h1>{{ t("workspaceList.header.title") }}</h1>
    <div>
      <button type="button" class="btn" @click="openModal">{{ t("workspaceList.actions.add") }}</button>
    </div>
  </hgroup>
  <p v-if="isLoading">{{ t("workspaceList.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <p v-else-if="workspaces.length === 0">{{ t("workspaceList.empty.workspaces") }}</p>
  <ul v-else class="workspace-list">
    <li v-for="workspace in workspaces" :key="workspace.id" class="workspace-item">
      <div class="workspace-header">
        <div>
          <h2>
            <router-link :to="`/workspace/${workspace.id}`" class="workspace-link">
              {{ workspace.name }}
            </router-link>
          </h2>
          <Tag v-if="workspace.role_name">
            {{ getRoleLabel("workspace_member", workspace.role_name) }}
          </Tag>
        </div>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          @click="deleteWorkspace(workspace.id)"
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
          <router-link :to="`/workspace/${workspace.id}/project/${project.id}`">
            {{ project.name }}
          </router-link>
        </li>
      </ul>
    </li>
  </ul>

  <BaseModal :open="isModalOpen" :title="t('workspaceList.modal.title')" @close="closeModal">
    <form class="modal-form" @submit.prevent="createWorkspace">
      <label for="workspace-name">{{ t("workspaceList.modal.nameLabel") }}</label>
      <input
        id="workspace-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('workspaceList.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("workspaceList.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("workspaceList.actions.creating") : t("workspaceList.actions.create") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";
import Tag from "../components/Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const workspaceStore = useWorkspaceStore();
const workspaces = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ name: "" });
const deletingWorkspaceId = ref(null);

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
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createWorkspace = async () => {
  if (!form.value.name) {
    formError.value = t("workspaceList.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await workspaceStore.createWorkspace({ name: form.value.name });
    await fetchWorkspaces();
    closeModal();
  } catch (error) {
    formError.value =
      error?.response?.data?.message || t("workspaceList.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

const deleteWorkspace = async (workspaceId) => {
  if (!workspaceId) return;
  const confirmed = window.confirm(t("workspaceList.confirm.delete"));
  if (!confirmed) return;

  deletingWorkspaceId.value = workspaceId;
  errorMessage.value = "";

  try {
    await workspaceStore.deleteWorkspace(workspaceId);
    await fetchWorkspaces();
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || t("workspaceList.status.errorDelete");
  } finally {
    deletingWorkspaceId.value = null;
  }
};

const getProjects = (workspaceId) => workspaceStore.getProjects(workspaceId);
</script>

<style scoped>
.workspace-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workspace-item {
  padding: 16px;
  border-bottom: 1px solid #ddd;
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

.workspace-link {
  margin-right: 8px;
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
  /* color: #374151; */
  /* text-decoration: none; */
  font-size: 14px;
}

.project-empty {
  color: #9ca3af;
  font-size: 13px;
}
</style>
