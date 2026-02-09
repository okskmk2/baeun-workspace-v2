<template>
  <main>
    <hgroup>
      <h1>{{ t("workspace.home.header.title") }}</h1>
      <button type="button" class="btn" @click="openModal">
        {{ t("workspace.home.actions.create") }}
      </button>
    </hgroup>
    <p v-if="isLoading">{{ t("workspace.home.status.loading") }}</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0">{{ t("workspace.home.empty.projects") }}</p>
    <ul v-else>
      <li v-for="project in projects" :key="project.id">
        <router-link :to="`/workspace/${workspaceId}/project/${project.id}`">
          {{ project.name }}
        </router-link>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          @click="deleteProject(project.id)"
          :disabled="deletingProjectId === project.id"
        >
          {{
            deletingProjectId === project.id
              ? t("workspace.home.actions.deleting")
              : t("workspace.home.actions.delete")
          }}
        </button>
      </li>
    </ul>
  </main>

  <BaseModal :open="isModalOpen" :title="t('workspace.home.modal.title')" @close="closeModal">
    <form class="modal-form" @submit.prevent="createProject">
      <label for="project-name">{{ t("workspace.home.modal.nameLabel") }}</label>
      <input
        id="project-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('workspace.home.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("workspace.home.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("workspace.home.actions.creating") : t("workspace.home.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const deletingProjectId = ref(null);
const formError = ref("");
const form = ref({ name: "" });
const workspaceId = computed(() => route.params.workspaceId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));

const fetchProjects = async () => {
  //   const workspaceId = route.params.workspaceId;
  if (!workspaceId.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    errorMessage.value = t("workspace.home.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createProject = async () => {
  if (!form.value.name) {
    formError.value = t("workspace.home.validation.nameRequired");
    return;
  }

  if (!workspaceId.value) {
    formError.value = t("workspace.home.validation.noWorkspace");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await workspaceStore.createProject(workspaceId.value, form.value.name);
    await fetchProjects();
    closeModal();
  } catch (error) {
    formError.value =
      error?.response?.data?.message || t("workspace.home.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

const deleteProject = async (projectId) => {
  if (!projectId) return;
  const confirmed = window.confirm(t("workspace.home.confirm.delete"));
  if (!confirmed) return;

  deletingProjectId.value = projectId;
  errorMessage.value = "";

  try {
    await api.delete(`/projects/${projectId}`);
    await fetchProjects();
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || t("workspace.home.status.errorDelete");
  } finally {
    deletingProjectId.value = null;
  }
};

onMounted(fetchProjects);
watch(() => route.params.workspaceId, fetchProjects);
</script>
