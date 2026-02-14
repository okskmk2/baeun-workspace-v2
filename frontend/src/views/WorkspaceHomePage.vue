<template>
  <main>
    <hgroup>
      <h1>{{ t("workspace.home.header.title") }}</h1>
      <div class="actions">
        <button type="button" class="btn btn--secondary" @click="openMemberModal">
          {{ t("workspace.home.actions.inviteMember") }}
        </button>
        <button type="button" class="btn" @click="openModal">
          {{ t("workspace.home.actions.create") }}
        </button>
      </div>
    </hgroup>
    <p v-if="isLoading">{{ t("workspace.home.status.loading") }}</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0">{{ t("workspace.home.empty.projects") }}</p>
    <ul v-else>
      <li v-for="project in projects" :key="project.id">
        <router-link :to="`/project/${project.id}`">
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

  <CreateProjectModal
    :open="isModalOpen"
    :workspace-id="workspaceId"
    @close="closeModal"
    @created="onProjectCreated"
  />

  <InviteWorkspaceMemberModal
    :open="isMemberModalOpen"
    :workspace-id="workspaceId"
    @close="closeMemberModal"
    @invited="onMemberInvited"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import CreateProjectModal from "../components/modals/CreateProjectModal.vue";
import InviteWorkspaceMemberModal from "../components/modals/InviteWorkspaceMemberModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isMemberModalOpen = ref(false);
const deletingProjectId = ref(null);

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
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onProjectCreated = async () => {
  await fetchProjects();
};

const openMemberModal = () => {
  isMemberModalOpen.value = true;
};

const closeMemberModal = () => {
  isMemberModalOpen.value = false;
};

const onMemberInvited = () => {
  // Member invited successfully
  // You might want to fetch workspace members or show a toast
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
    errorMessage.value = error?.response?.data?.message || t("workspace.home.status.errorDelete");
  } finally {
    deletingProjectId.value = null;
  }
};

watch(workspaceId, () => {
  fetchProjects();
});

onMounted(() => {
  fetchProjects();
});
</script>

<style scoped>
hgroup {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
}

li a {
  flex: 1;
  font-weight: 500;
  color: var(--color-text);
  text-decoration: none;
}

li a:hover {
  color: var(--color-primary);
}
</style>
