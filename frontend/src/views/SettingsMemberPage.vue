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

  <AddProjectMemberModal
    :open="isInviteOpen"
    :project-id="projectId"
    :workspace-members="workspaceMembers"
    :project-members="projectMembers"
    @close="closeInviteModal"
    @invited="onMemberInvited"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import AddProjectMemberModal from "../components/modals/AddProjectMemberModal.vue";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useRoleLabels } from "../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();

const projectId = computed(() => route.params.projectId);
const projectMemberStore = useProjectMemberStore();
const workspaceStore = useWorkspaceStore();

const workspaceId = computed(() =>
  workspaceStore.getProject(projectId.value)?.workspace_id
);

const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const workspaceMembers = ref([]);
const isLoading = ref(false);
const isInviteOpen = ref(false);
const errorMessage = ref("");
const removingMemberId = ref(null);

const fetchProjectMembers = async () => {
  if (!projectId.value) return;

  isLoading.value = true;
  errorMessage.value = "";
  try {
    await projectMemberStore.fetchProjectMembers(projectId.value);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || t("settings.member.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const fetchWorkspaceMembers = async () => {
  if (!workspaceId.value) {
    workspaceMembers.value = [];
    return;
  }

  try {
    const res = await api.get(`/workspaces/${workspaceId.value}/members`);
    workspaceMembers.value = res.data || [];
  } catch (error) {
    workspaceMembers.value = [];
  }
};

const isRemoveDisabled = (member) => {
  if (removingMemberId.value === member.id) return true;
  return String(member.role_name || "").toUpperCase() === "OWNER";
};

const openInviteModal = async () => {
  isInviteOpen.value = true;
  await fetchWorkspaceMembers();
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const onMemberInvited = async () => {
  await projectMemberStore.fetchProjectMembers(projectId.value);
};

watch(projectId, () => {
  fetchProjectMembers();
});

onMounted(() => {
  fetchProjectMembers();
});

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
  background-color: #ffffff;
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
