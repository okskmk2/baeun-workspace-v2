<template>
  <main class="workspace-settings">
    <hgroup>
      <h1>워크스페이스 설정</h1>
      <p class="subtitle">워크스페이스 정보와 멤버를 관리합니다.</p>
    </hgroup>

    <p v-if="isLoading" class="status">불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <template v-else>
      <section class="card">
        <h2>기본 정보</h2>
        <form class="inline-form" @submit.prevent="updateWorkspaceName">
          <label for="workspace-name-input">워크스페이스 이름</label>
          <div class="inline-form__row">
            <input
              id="workspace-name-input"
              v-model.trim="nameForm"
              type="text"
              :disabled="!canManageWorkspace || isUpdatingName"
              placeholder="워크스페이스 이름 입력"
            />
            <button type="submit" class="btn" :disabled="!canManageWorkspace || isUpdatingName">
              {{ isUpdatingName ? "저장 중..." : "저장" }}
            </button>
          </div>
          <p v-if="nameError" class="status error">{{ nameError }}</p>
          <p v-else-if="nameSuccess" class="status success">{{ nameSuccess }}</p>
          <p v-if="!canManageWorkspace" class="status muted">
            OWNER 또는 ADMIN만 수정할 수 있습니다.
          </p>
        </form>

        <form class="inline-form" @submit.prevent>
          <label>워크스페이스 이미지</label>
          <div class="workspace-image-row">
            <Avatar
              :text="workspaceImageFallback"
              :label="workspaceName || 'Workspace'"
              :image-url="workspaceImageUrl"
              :size="56"
            />
            <input
              ref="workspaceImageInputRef"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="workspace-image-input"
              @change="onWorkspaceImageChange"
            />
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="
                !canManageWorkspace || isUploadingWorkspaceImage || isRemovingWorkspaceImage
              "
              @click="openWorkspaceImagePicker"
            >
              {{ isUploadingWorkspaceImage ? "업로드 중..." : "이미지 변경" }}
            </button>
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="
                !canManageWorkspace ||
                !workspaceImageUrl ||
                isUploadingWorkspaceImage ||
                isRemovingWorkspaceImage
              "
              @click="removeWorkspaceImage"
            >
              {{ isRemovingWorkspaceImage ? "삭제 중..." : "이미지 삭제" }}
            </button>
          </div>
          <p v-if="workspaceImageError" class="status error">{{ workspaceImageError }}</p>
          <p v-else-if="workspaceImageSuccess" class="status success">{{ workspaceImageSuccess }}</p>
        </form>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>멤버</h2>
          <Tag variant="info">{{ members.length }}명</Tag>
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
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Avatar from "../../components/Avatar.vue";
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
const workspaceName = computed(() => workspace.value?.name || "");
const workspaceImageUrl = computed(() => String(workspace.value?.img_url || ""));
const workspaceRoleUpper = computed(() => String(workspace.value?.role_name || "").toUpperCase());
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));
const currentUserId = computed(() => appStore.currentUser?.id);

const workspaceImageFallback = computed(() => {
  const name = workspaceName.value;
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
});

const isLoading = ref(false);
const errorMessage = ref("");
const nameForm = ref("");
const isUpdatingName = ref(false);
const nameError = ref("");
const nameSuccess = ref("");
const workspaceImageInputRef = ref(null);
const isUploadingWorkspaceImage = ref(false);
const isRemovingWorkspaceImage = ref(false);
const workspaceImageError = ref("");
const workspaceImageSuccess = ref("");

const members = ref([]);
const isMembersLoading = ref(false);
const inviteForm = ref({ email: "", role: "MEMBER" });
const isInvitingMember = ref(false);
const removingMemberId = ref(null);
const memberActionError = ref("");
const memberActionSuccess = ref("");

const fetchWorkspaceDetail = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchWorkspace(workspaceId.value);
    nameForm.value = workspaceStore.workspaceById[workspaceId.value]?.name || "";
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "워크스페이스 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

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

const updateWorkspaceName = async () => {
  if (!canManageWorkspace.value) return;
  const nextName = String(nameForm.value || "").trim();
  nameError.value = "";
  nameSuccess.value = "";

  if (!nextName) {
    nameError.value = "워크스페이스 이름을 입력하세요.";
    return;
  }

  if (nextName === workspaceName.value) {
    nameSuccess.value = "변경 사항이 없습니다.";
    return;
  }

  isUpdatingName.value = true;
  try {
    await workspaceStore.updateWorkspaceName(workspaceId.value, nextName);
    nameSuccess.value = "워크스페이스 이름이 변경되었습니다.";
    await workspaceStore.fetchWorkspace(workspaceId.value);
  } catch (error) {
    nameError.value = error?.response?.data?.message || "워크스페이스 이름을 변경하지 못했습니다.";
  } finally {
    isUpdatingName.value = false;
  }
};

const openWorkspaceImagePicker = () => {
  if (
    !canManageWorkspace.value ||
    isUploadingWorkspaceImage.value ||
    isRemovingWorkspaceImage.value
  ) {
    return;
  }
  workspaceImageInputRef.value?.click();
};

const onWorkspaceImageChange = async (event) => {
  workspaceImageError.value = "";
  workspaceImageSuccess.value = "";
  const selectedFile = event?.target?.files?.[0];
  if (!selectedFile) return;

  const maxFileSize = 5 * 1024 * 1024;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  if (!allowedTypes.has(selectedFile.type)) {
    workspaceImageError.value = "jpg, png, webp, gif 파일만 허용됩니다.";
    event.target.value = "";
    return;
  }

  if (selectedFile.size > maxFileSize) {
    workspaceImageError.value = "이미지 용량은 5MB 이하여야 합니다.";
    event.target.value = "";
    return;
  }

  isUploadingWorkspaceImage.value = true;
  try {
    const response = await workspaceStore.updateWorkspaceImage(workspaceId.value, selectedFile);
    workspaceImageSuccess.value = response?.message || "워크스페이스 이미지가 변경되었습니다.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "워크스페이스 이미지를 변경하지 못했습니다.";
  } finally {
    isUploadingWorkspaceImage.value = false;
    event.target.value = "";
  }
};

const removeWorkspaceImage = async () => {
  if (!canManageWorkspace.value || !workspaceImageUrl.value) return;
  if (isUploadingWorkspaceImage.value || isRemovingWorkspaceImage.value) return;

  workspaceImageError.value = "";
  workspaceImageSuccess.value = "";
  isRemovingWorkspaceImage.value = true;

  try {
    const response = await workspaceStore.removeWorkspaceImage(workspaceId.value);
    workspaceImageSuccess.value = response?.message || "워크스페이스 이미지가 삭제되었습니다.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "워크스페이스 이미지를 삭제하지 못했습니다.";
  } finally {
    isRemovingWorkspaceImage.value = false;
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

const fetchPageData = async () => {
  await Promise.all([fetchWorkspaceDetail(), fetchMembers()]);
};

onMounted(fetchPageData);
watch(() => route.params.workspaceId, fetchPageData);
</script>

<style scoped>
.workspace-settings {
  display: grid;
  gap: 16px;
  padding: 24px;
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
  justify-content: space-between;
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

.inline-form,
.invite-form {
  display: grid;
  gap: 8px;
}

.inline-form label,
.invite-form label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.inline-form__row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.inline-form input,
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

.workspace-image-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workspace-image-input {
  display: none;
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