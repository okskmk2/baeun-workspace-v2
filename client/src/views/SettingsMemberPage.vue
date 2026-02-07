<template>
  <div class="settings-member">
    <hgroup>
      <h1>프로젝트 맴버 관리</h1>
      <button type="button" class="btn" @click="openInviteModal">
        프로젝트 맴버 초대하기
      </button>
    </hgroup>

    <p v-if="isLoading">불러오는 중...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>

    <ul v-else class="member-list">
      <li v-for="member in projectMembers" :key="member.id" class="member-row">
        <div class="member-info">
          <strong>{{ member.name }}</strong>
          <span>{{ member.email }}</span>
        </div>
        <div class="member-actions">
          <span class="role">{{ member.role_name }}</span>
          <button
            type="button"
            class="btn btn--danger btn--sm"
            :disabled="isRemoveDisabled(member)"
            @click="removeMember(member.id)"
          >
            {{ removingMemberId === member.id ? "제외 중..." : "구성원 제외" }}
          </button>
        </div>
      </li>
    </ul>
  </div>

  <BaseModal :open="isInviteOpen" title="프로젝트 맴버 초대" @close="closeInviteModal">
    <form class="modal-form" @submit.prevent="inviteMember">
      <label for="workspace-member">워크스페이스 맴버</label>
      <select id="workspace-member" v-model="selectedMemberId">
        <option value="">선택하세요</option>
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
          취소
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{ isInviting ? "초대 중..." : "초대" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);

const projectMembers = ref([]);
const workspaceMembers = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const removingMemberId = ref(null);

const isInviteOpen = ref(false);
const isInviting = ref(false);
const inviteError = ref("");
const selectedMemberId = ref("");

const fetchProjectMembers = async () => {
  if (!projectId.value) {
    projectMembers.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/project/${projectId.value}/members`);
    projectMembers.value = res.data?.data || [];
  } catch (error) {
    projectMembers.value = [];
    errorMessage.value = "프로젝트 맴버를 불러오지 못했습니다.";
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
    const res = await api.get(`/workspace/${workspaceId.value}/members`);
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
    inviteError.value = "초대할 맴버를 선택해주세요.";
    return;
  }

  if (!projectId.value) {
    inviteError.value = "프로젝트가 선택되지 않았습니다.";
    return;
  }

  isInviting.value = true;
  inviteError.value = "";

  try {
    await api.post(`/project/${projectId.value}/member`, {
      member_id: selectedMemberId.value,
    });
    await fetchProjectMembers();
    closeInviteModal();
  } catch (error) {
    inviteError.value = error?.response?.data?.message || "초대에 실패했습니다.";
  } finally {
    isInviting.value = false;
  }
};

const removeMember = async (memberId) => {
  if (!projectId.value || !memberId) return;
  const confirmed = window.confirm("구성원을 제외할까요?");
  if (!confirmed) return;

  removingMemberId.value = memberId;
  errorMessage.value = "";

  try {
    await api.delete(`/project/${projectId.value}/member/${memberId}`);
    await fetchProjectMembers();
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "구성원 제외에 실패했습니다.";
  } finally {
    removingMemberId.value = null;
  }
};

onMounted(fetchProjectMembers);
watch(projectId, fetchProjectMembers);
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
