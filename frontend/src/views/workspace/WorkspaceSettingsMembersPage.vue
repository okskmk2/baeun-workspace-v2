<template>
  <section class="workspace-settings">
    <hgroup>
      <h1>워크스페이스 멤버</h1>
      <p class="subtitle">워크스페이스 멤버를 초대하고 관리합니다.</p>
    </hgroup>

    <section class="card">
      <div class="card__header">
        <h2>멤버</h2>
        <CountChip :count="members.length" />
      </div>

      <form v-if="canManageWorkspace" class="invite-form" @submit.prevent="inviteMember">
        <label for="member-email-input">이메일로 초대</label>
        <div class="invite-form__grid">
          <input
            id="member-email-input"
            v-model.trim="inviteForm.email"
            type="email"
            placeholder="member@example.com"
            :disabled="isInvitingMember"
          />
          <select v-model="inviteForm.role" :disabled="isInvitingMember">
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OWNER">OWNER</option>
          </select>
          <button type="submit" class="btn" :disabled="isInvitingMember">
            {{ isInvitingMember ? "초대 중..." : "초대" }}
          </button>
        </div>
      </form>

      <p v-if="memberActionError" class="status error">{{ memberActionError }}</p>
      <p v-else-if="memberActionSuccess" class="status success">{{ memberActionSuccess }}</p>
      <p v-if="isMembersLoading" class="status">멤버 정보를 불러오는 중...</p>
      <p v-else-if="!members.length" class="status muted">멤버가 없습니다.</p>

      <ul v-else class="member-list">
        <li v-for="member in members" :key="member.id" class="member-item">
          <div class="member-info">
            <p class="member-name">{{ member.name }}</p>
            <p class="member-email">{{ member.email }}</p>
          </div>
          <div class="member-actions">
            <Tag>{{ getRoleLabel("workspace_member", member.role_name) }}</Tag>
            <button
              v-if="canRemoveMember(member)"
              type="button"
              class="btn btn--danger btn--sm"
              :disabled="removingMemberId === member.id"
              @click="removeMember(member)"
            >
              {{ removingMemberId === member.id ? "삭제 중..." : "삭제" }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import CountChip from "../../components/CountChip.vue";
import Tag from "../../components/Tag.vue";
import { useRoleLabels } from "../../lib/roleLabels";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAppStore } from "../../stores/appStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();
const { getRoleLabel } = useRoleLabels();

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const workspaceRoleUpper = computed(() => String(workspace.value?.role_name || "").toUpperCase());
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));
const currentUserId = computed(() => appStore.currentUser?.id);

const members = ref([]);
const isMembersLoading = ref(false);
const inviteForm = ref({ email: "", role: "MEMBER" });
const isInvitingMember = ref(false);
const removingMemberId = ref(null);
const memberActionError = ref("");
const memberActionSuccess = ref("");

const fetchMembers = async () => {
  if (!workspaceId.value) return;
  isMembersLoading.value = true;
  memberActionError.value = "";

  try {
    members.value = await workspaceStore.fetchWorkspaceMembers(workspaceId.value);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "멤버 정보를 불러오지 못했습니다.";
  } finally {
    isMembersLoading.value = false;
  }
};

const inviteMember = async () => {
  memberActionError.value = "";
  memberActionSuccess.value = "";

  const email = String(inviteForm.value.email || "").trim();
  if (!email) {
    memberActionError.value = "초대할 이메일을 입력하세요.";
    return;
  }

  isInvitingMember.value = true;
  try {
    await workspaceStore.inviteWorkspaceMember(workspaceId.value, {
      email,
      role_name: inviteForm.value.role,
    });
    inviteForm.value = { email: "", role: "MEMBER" };
    memberActionSuccess.value = "멤버를 초대했습니다.";
    await Promise.all([fetchMembers(), workspaceStore.fetchWorkspace(workspaceId.value)]);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "멤버 초대에 실패했습니다.";
  } finally {
    isInvitingMember.value = false;
  }
};

const canRemoveMember = (member) => {
  if (!canManageWorkspace.value) return false;
  if (!member?.id || String(member.id) === String(currentUserId.value)) return false;
  if (workspaceRoleUpper.value === "ADMIN") {
    return String(member.role_name || "").toUpperCase() === "MEMBER";
  }
  return true;
};

const removeMember = async (member) => {
  if (!canRemoveMember(member)) return;

  const confirmed = window.confirm(`${member.name || member.email} 멤버를 제거하시겠습니까?`);
  if (!confirmed) return;

  memberActionError.value = "";
  memberActionSuccess.value = "";
  removingMemberId.value = member.id;

  try {
    await workspaceStore.removeWorkspaceMember(workspaceId.value, member.id);
    memberActionSuccess.value = "멤버를 제거했습니다.";
    await Promise.all([fetchMembers(), workspaceStore.fetchWorkspace(workspaceId.value)]);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "멤버 제거에 실패했습니다.";
  } finally {
    removingMemberId.value = null;
  }
};

onMounted(fetchMembers);
watch(() => route.params.workspaceId, fetchMembers);
</script>

<style scoped>
.workspace-settings {
  display: grid;
  gap: 16px;
}

hgroup {
  margin: 0;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.card__header {
  display: flex;
  align-items: center;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.success {
  color: var(--color-success);
}

.status.muted {
  color: var(--color-text-muted);
}

.invite-form {
  display: grid;
  gap: 8px;
}

.invite-form label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.invite-form input,
.invite-form select {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid var(--color-input-border);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: 8px 10px;
}

.invite-form__grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr auto;
  gap: 8px;
}

.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 10px 12px;
}

.member-name {
  margin: 0;
  font-weight: 600;
}

.member-email {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 840px) {
  .invite-form__grid {
    grid-template-columns: 1fr;
  }

  .member-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
