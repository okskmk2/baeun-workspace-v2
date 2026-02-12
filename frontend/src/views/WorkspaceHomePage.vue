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
          {{
            isCreating ? t("workspace.home.actions.creating") : t("workspace.home.actions.submit")
          }}
        </button>
      </div>
    </form>
  </BaseModal>

  <BaseModal
    :open="isMemberModalOpen"
    :title="t('workspace.home.members.modal.title')"
    @close="closeMemberModal"
  >
    <form class="modal-form" @submit.prevent="inviteMember">
      <label for="member-email">{{ t("workspace.home.members.emailLabel") }}</label>
      <input
        id="member-email"
        v-model.trim="memberForm.email"
        type="email"
        placeholder="member@example.com"
      />
      <label for="member-role">{{ t("workspace.home.members.roleLabel") }}</label>
      <select id="member-role" v-model="memberForm.role">
        <option value="OWNER">{{ t("roles.workspace_member.owner") }}</option>
        <option value="ADMIN">{{ t("roles.workspace_member.admin") }}</option>
        <option value="MEMBER">{{ t("roles.workspace_member.member") }}</option>
      </select>
      <p v-if="memberError" class="form-error">{{ memberError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeMemberModal">
          {{ t("workspace.home.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInvitingMember">
          {{
            isInvitingMember
              ? t("workspace.home.actions.invitingMember")
              : t("workspace.home.actions.submit")
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const isMemberModalOpen = ref(false);
const isInvitingMember = ref(false);
const deletingProjectId = ref(null);
const formError = ref("");
const form = ref({ name: "" });
const memberError = ref("");
const memberForm = ref({ email: "", role: "MEMBER" });

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

const openMemberModal = () => {
  memberForm.value = { email: "", role: "MEMBER" };
  memberError.value = "";
  isMemberModalOpen.value = true;
};

const closeMemberModal = () => {
  isMemberModalOpen.value = false;
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
    formError.value = error?.response?.data?.message || t("workspace.home.status.errorCreate");
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
    errorMessage.value = error?.response?.data?.message || t("workspace.home.status.errorDelete");
  } finally {
    deletingProjectId.value = null;
  }
};

const inviteMember = async () => {
  if (!memberForm.value.email) {
    memberError.value = t("workspace.home.members.validation.emailRequired");
    return;
  }

  if (!workspaceId.value) {
    memberError.value = t("workspace.home.validation.noWorkspace");
    return;
  }

  isInvitingMember.value = true;
  memberError.value = "";

  try {
    await api.post(`/workspaces/${workspaceId.value}/members`, {
      email: memberForm.value.email,
      role_name: memberForm.value.role,
    });
    closeMemberModal();
  } catch (error) {
    memberError.value =
      error?.response?.data?.message || t("workspace.home.members.status.errorInvite");
  } finally {
    isInvitingMember.value = false;
  }
};

onMounted(fetchProjects);
watch(() => route.params.workspaceId, fetchProjects);
</script>
