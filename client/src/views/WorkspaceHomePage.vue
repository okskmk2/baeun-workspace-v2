<template>
  <main>
    <hgroup>
      <h1>Projects</h1>
      <button type="button" class="btn" @click="openModal">Create Project</button>
    </hgroup>
    <p v-if="isLoading">Loading...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0">No projects.</p>
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
          {{ deletingProjectId === project.id ? "Deleting..." : "Delete" }}
        </button>
      </li>
    </ul>
  </main>

  <BaseModal :open="isModalOpen" title="Create Project" @close="closeModal">
    <form class="modal-form" @submit.prevent="createProject">
      <label for="project-name">Project Name</label>
      <input
        id="project-name"
        v-model.trim="form.name"
        type="text"
        placeholder="Project name"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">Cancel</button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? "Creating..." : "Create" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

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
    errorMessage.value = "Failed to load projects.";
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
    formError.value = "Please enter a project name.";
    return;
  }

  if (!workspaceId.value) {
    formError.value = "No workspace selected.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await workspaceStore.createProject(workspaceId.value, form.value.name);
    await fetchProjects();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "Failed to create project.";
  } finally {
    isCreating.value = false;
  }
};

const deleteProject = async (projectId) => {
  if (!projectId) return;
  const confirmed = window.confirm("Delete this project?");
  if (!confirmed) return;

  deletingProjectId.value = projectId;
  errorMessage.value = "";

  try {
    await api.delete(`/projects/${projectId}`);
    await fetchProjects();
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "Failed to delete project.";
  } finally {
    deletingProjectId.value = null;
  }
};

onMounted(fetchProjects);
watch(() => route.params.workspaceId, fetchProjects);
</script>
