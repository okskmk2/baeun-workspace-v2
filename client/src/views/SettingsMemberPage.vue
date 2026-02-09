<template>
  <hgroup>
    <h1>{{ t("settings.member.header.title") }}</h1>
    <button type="button" class="btn" @click="openInviteModal">
      {{ t("settings.member.actions.invite") }}
    </button>
  </hgroup>

  <p v-if="isLoading">{{ t("settings.member.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>

  <ul v-else class="member-list">
    <li v-for="member in projectMembers" :key="member.id" class="member-row">
      <div class="member-info">
        <strong>{{ member.name }}</strong>
        <span>{{ member.email }}</span>
      </div>
      <div class="member-actions">
        <span class="role">{{ getRoleLabel("project_member", member.role_name) }}</span>
        <button
          type="button"
          class="btn btn--danger btn--sm"
          :disabled="isRemoveDisabled(member)"
          @click="removeMember(member.id)"
        >
          {{
            removingMemberId === member.id
              ? t("settings.member.actions.removing")
              : t("settings.member.actions.remove")
          }}
        </button>
      </div>
    </li>
  </ul>

  <BaseModal
    :open="isInviteOpen"
    :title="t('settings.member.modal.title')"
    @close="closeInviteModal"
  >
    <form class="modal-form" @submit.prevent="inviteMember">
      <label for="workspace-member">{{ t("settings.member.modal.membersLabel") }}</label>
      <select id="workspace-member" v-model="selectedMemberId">
        <option value="">{{ t("settings.member.modal.selectPlaceholder") }}</option>
        <option
          v-for="member in workspaceMembers"
          :key="member.id"
          :value="member.id"
          :disabled="isAlreadyProjectMember(member.id)"
        >
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <p v-if="inviteError" class="form-error">{{ inviteError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeInviteModal">
          {{ t("settings.member.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{
            isInviting
              ? t("settings.member.actions.inviting")
              : t("settings.member.actions.submitInvite")
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useRoleLabels } from "../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const projectMemberStore = useProjectMemberStore();

const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const workspaceMembers = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const removingMemberId = ref(null);

const isInviteOpen = ref(false);
const isInviting = ref(false);
const inviteError = ref("");
const selectedMemberId = ref("");

const fetchWorkspaceMembers = async () => {
  if (!workspaceId.value) {
    workspaceMembers.value = [];
    return;
  }

  try {
    const res = await api.get(`/workspaces/${workspaceId.value}/members`);
    workspaceMembers.value = res.data?.data || [];
  } catch (error) {
    workspaceMembers.value = [];
  }
};

const isAlreadyProjectMember = (memberId) =>
  projectMembers.value.some((member) => String(member.id) === String(memberId));

const isRemoveDisabled = (member) => {
  if (removingMemberId.value === member.id) return true;
  return String(member.role_name || "").toUpperCase() === "OWNER";
};

const openInviteModal = async () => {
  inviteError.value = "";
  selectedMemberId.value = "";
  isInviteOpen.value = true;
  await fetchWorkspaceMembers();
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const inviteMember = async () => {
  if (!selectedMemberId.value) {
    inviteError.value = t("settings.member.validation.selectMember");
    return;
  }

  if (!projectId.value) {
    inviteError.value = t("settings.member.validation.noProject");
    return;
  }

  isInviting.value = true;
  inviteError.value = "";

  try {
    await api.post(`/projects/${projectId.value}/members`, {
      member_id: selectedMemberId.value,
    });
    const invited = workspaceMembers.value.find(
      (member) => String(member.id) === String(selectedMemberId.value)
    );
    if (invited) {
      const current = projectMemberStore.getProjectMembers(projectId.value);
      projectMemberStore.setProjectMembers(projectId.value, [
        ...current,
        { ...invited, role_name: "MEMBER" },
      ]);
    }
    closeInviteModal();
  } catch (error) {
    inviteError.value = error?.response?.data?.message || t("settings.member.status.errorInvite");
  } finally {
    isInviting.value = false;
  }
};

const removeMember = async (memberId) => {
  if (!projectId.value || !memberId) return;
  const confirmed = window.confirm(t("settings.member.confirm.remove"));
  if (!confirmed) return;

  removingMemberId.value = memberId;
  errorMessage.value = "";

  try {
    await api.delete(`/projects/${projectId.value}/members/${memberId}`);
    const current = projectMemberStore.getProjectMembers(projectId.value);
    projectMemberStore.setProjectMembers(
      projectId.value,
      current.filter((member) => String(member.id) !== String(memberId))
    );
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("settings.member.status.errorRemove");
  } finally {
    removingMemberId.value = null;
  }
};
</script>

<style scoped>
.settings-member {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-info span {
  font-size: 12px;
  color: #6b7280;
}

.member-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.role {
  font-size: 12px;
  color: #6b7280;
}
</style>
