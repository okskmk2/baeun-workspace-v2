<template>
  <hgroup>
    <div>
      <h1>{{ t("workspace.detail.header.title") }}</h1>
      <p class="subtitle">{{ t("workspace.detail.header.subtitle") }}</p>
    </div>
    <div class="actions">
      <router-link class="btn btn--secondary" to="/settings/workspaces">
        {{ t("workspace.detail.actions.back") }}
      </router-link>
      <router-link class="btn" :to="``">
        {{ t("workspace.detail.actions.open") }}
      </router-link>
    </div>
  </hgroup>
  <section class="workspace-detail">
    <p v-if="isLoading" class="status">{{ t("workspace.detail.status.loading") }}</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <div v-else class="detail-grid">
      <section class="card">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.summary") }}</h2>
          <Tag v-if="workspaceRoleLabel" variant="info">{{ workspaceRoleLabel }}</Tag>
        </div>
        <dl class="summary-list">
          <div>
            <dt>{{ t("workspace.detail.fields.name") }}</dt>
            <dd>{{ workspaceName || t("workspace.detail.fallback.name") }}</dd>
          </div>
          <div>
            <dt>{{ t("workspace.detail.fields.owner") }}</dt>
            <dd>{{ workspaceOwner || t("workspace.detail.fallback.owner") }}</dd>
          </div>
          <div>
            <dt>{{ t("workspace.detail.fields.created") }}</dt>
            <dd>{{ formattedCreatedAt }}</dd>
          </div>
        </dl>
      </section>

      <section class="card">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.stats") }}</h2>
        </div>
        <div class="stat-grid">
          <div class="stat">
            <p class="stat__value">{{ projectCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.projects") }}</p>
          </div>
          <div class="stat">
            <p class="stat__value">{{ memberCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.members") }}</p>
          </div>
          <div class="stat">
            <p class="stat__value">{{ licenseCount }}</p>
            <p class="stat__label">{{ t("workspace.detail.stats.licenses") }}</p>
          </div>
        </div>
      </section>

      <section class="card card--full">
        <div class="card__header">
          <h2>{{ t("workspace.detail.sections.projects") }}</h2>
        </div>
        <form v-if="canManageWorkspace" class="inline-form" @submit.prevent="createProject">
          <label for="project-name-input">Project Name</label>
          <div class="inline-form__row">
            <input
              id="project-name-input"
              v-model.trim="projectForm"
              type="text"
              :disabled="isCreatingProject"
              placeholder="Enter project name"
            />
            <button type="submit" class="btn" :disabled="isCreatingProject">
              {{ isCreatingProject ? "Creating..." : "Create" }}
            </button>
          </div>
          <p v-if="projectError" class="status error">{{ projectError }}</p>
          <p v-else-if="projectSuccess" class="status success">{{ projectSuccess }}</p>
        </form>
        <p v-if="!projects.length" class="empty">
          {{ t("workspace.detail.empty.projects") }}
        </p>
        <ul v-else class="project-list">
          <li v-for="project in projects" :key="project.id" class="project-item">
            <router-link :to="`/project/${project.id}`">
              {{ project.name }}
            </router-link>
          </li>
        </ul>
      </section>

      <section class="card card--full">
        <div class="card__header">
          <h2>Workspace Settings</h2>
        </div>
        <form class="inline-form" @submit.prevent>
          <label>Workspace Image</label>
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
              {{ isUploadingWorkspaceImage ? "Uploading..." : "Change Image" }}
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
              {{ isRemovingWorkspaceImage ? "Removing..." : "Remove Image" }}
            </button>
          </div>
          <p v-if="workspaceImageError" class="status error">{{ workspaceImageError }}</p>
          <p v-else-if="workspaceImageSuccess" class="status success">
            {{ workspaceImageSuccess }}
          </p>
          <p v-if="!canManageWorkspace" class="status muted">
            Only OWNER or ADMIN can edit workspace image.
          </p>
        </form>
        <form class="inline-form" @submit.prevent="updateWorkspaceName">
          <label for="workspace-name-input">Workspace Name</label>
          <div class="inline-form__row">
            <input
              id="workspace-name-input"
              v-model.trim="nameForm"
              type="text"
              :disabled="!canManageWorkspace || isUpdatingName"
              placeholder="Enter workspace name"
            />
            <button type="submit" class="btn" :disabled="!canManageWorkspace || isUpdatingName">
              {{ isUpdatingName ? "Saving..." : "Save" }}
            </button>
          </div>
          <p v-if="nameError" class="status error">{{ nameError }}</p>
          <p v-else-if="nameSuccess" class="status success">{{ nameSuccess }}</p>
          <p v-if="!canManageWorkspace" class="status muted">
            Only OWNER or ADMIN can edit workspace name.
          </p>
        </form>
      </section>

      <section class="card card--full">
        <div class="card__header">
          <h2>Members</h2>
          <Tag variant="info">{{ members.length }} users</Tag>
        </div>

        <form v-if="canManageWorkspace" class="invite-form" @submit.prevent="inviteMember">
          <label for="member-email-input">Invite by Email</label>
          <div class="invite-form__grid">
            <input
              id="member-email-input"
              v-model.trim="inviteForm.email"
              type="email"
              placeholder="member@example.com"
              :disabled="isInvitingMember"
            />
            <select v-model="inviteForm.role" :disabled="isInvitingMember">
              <option value="MEMBER">{{ t("roles.workspace_member.member") }}</option>
              <option value="ADMIN">{{ t("roles.workspace_member.admin") }}</option>
              <option value="OWNER">{{ t("roles.workspace_member.owner") }}</option>
            </select>
            <button type="submit" class="btn" :disabled="isInvitingMember">
              {{ isInvitingMember ? "Inviting..." : "Invite" }}
            </button>
          </div>
        </form>
        <p v-if="memberActionError" class="status error">{{ memberActionError }}</p>
        <p v-else-if="memberActionSuccess" class="status success">{{ memberActionSuccess }}</p>

        <p v-if="isMembersLoading" class="status">Loading members...</p>
        <p v-else-if="!members.length" class="empty">No members found.</p>
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
                {{ removingMemberId === member.id ? "Removing..." : "Remove" }}
              </button>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Tag from "../components/Tag.vue";
import Avatar from "../components/Avatar.vue";
import { useRoleLabels } from "../lib/roleLabels";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useAppStore } from "../stores/appStore";

const { t, locale } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();

const workspaceId = computed(() => route.params.workspaceId);

const isLoading = ref(false);
const errorMessage = ref("");
const isMembersLoading = ref(false);
const members = ref([]);

const nameForm = ref("");
const isUpdatingName = ref(false);
const nameError = ref("");
const nameSuccess = ref("");
const workspaceImageInputRef = ref(null);
const isUploadingWorkspaceImage = ref(false);
const isRemovingWorkspaceImage = ref(false);
const workspaceImageError = ref("");
const workspaceImageSuccess = ref("");

const projectForm = ref("");
const isCreatingProject = ref(false);
const projectError = ref("");
const projectSuccess = ref("");

const inviteForm = ref({ email: "", role: "MEMBER" });
const isInvitingMember = ref(false);
const removingMemberId = ref(null);
const memberActionError = ref("");
const memberActionSuccess = ref("");

const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));

const workspaceName = computed(() => workspace.value?.name || "");
const workspaceImageUrl = computed(() => String(workspace.value?.img_url || ""));
const workspaceImageFallback = computed(() => {
  const name = workspaceName.value || "";
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
});
const workspaceRole = computed(() => workspace.value?.role_name || "");
const workspaceRoleUpper = computed(() => String(workspaceRole.value || "").toUpperCase());
const workspaceRoleLabel = computed(() => getRoleLabel("workspace_member", workspaceRole.value));
const workspaceOwner = computed(() => workspace.value?.owner_name || "");
const currentUserId = computed(() => appStore.currentUser?.id);
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));

const formatCount = (value) =>
  Number.isFinite(value) ? String(value) : t("workspace.detail.fallback.count");

const projectCount = computed(() => formatCount(projects.value.length));
const memberCount = computed(() => {
  if (members.value.length) return String(members.value.length);
  return formatCount(workspace.value?.member_count);
});
const licenseCount = computed(() => formatCount(workspace.value?.license_count));

const formattedCreatedAt = computed(() => {
  const value = workspace.value?.created_at;
  if (!value) return t("workspace.detail.fallback.date");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("workspace.detail.fallback.date");
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const dateLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "2-digit" });
});

const fetchWorkspaceDetail = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchWorkspace(workspaceId.value);
    await workspaceStore.fetchProjects(workspaceId.value);
    nameForm.value = workspaceStore.workspaceById[workspaceId.value]?.name || "";
  } catch (error) {
    errorMessage.value = t("workspace.detail.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const fetchMembers = async () => {
  if (!workspaceId.value) return;
  isMembersLoading.value = true;
  try {
    members.value = await workspaceStore.fetchWorkspaceMembers(workspaceId.value);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "Failed to load members.";
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
    nameError.value = "Workspace name is required.";
    return;
  }
  if (nextName === workspaceName.value) {
    nameSuccess.value = "No changes to save.";
    return;
  }

  isUpdatingName.value = true;
  try {
    await workspaceStore.updateWorkspaceName(workspaceId.value, nextName);
    nameSuccess.value = "Workspace name updated.";
    await workspaceStore.fetchWorkspace(workspaceId.value);
  } catch (error) {
    nameError.value = error?.response?.data?.message || "Failed to update workspace name.";
  } finally {
    isUpdatingName.value = false;
  }
};

const openWorkspaceImagePicker = () => {
  if (
    !canManageWorkspace.value ||
    isUploadingWorkspaceImage.value ||
    isRemovingWorkspaceImage.value
  )
    return;
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
    workspaceImageError.value = "Only jpg, png, webp, gif files are allowed.";
    event.target.value = "";
    return;
  }

  if (selectedFile.size > maxFileSize) {
    workspaceImageError.value = "Image size must be 5MB or less.";
    event.target.value = "";
    return;
  }

  isUploadingWorkspaceImage.value = true;
  try {
    const response = await workspaceStore.updateWorkspaceImage(workspaceId.value, selectedFile);
    workspaceImageSuccess.value = response?.message || "Workspace image updated.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "Failed to update workspace image.";
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
    workspaceImageSuccess.value = response?.message || "Workspace image removed.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "Failed to remove workspace image.";
  } finally {
    isRemovingWorkspaceImage.value = false;
  }
};

const createProject = async () => {
  if (!canManageWorkspace.value) return;
  const nextName = String(projectForm.value || "").trim();
  projectError.value = "";
  projectSuccess.value = "";

  if (!nextName) {
    projectError.value = "Project name is required.";
    return;
  }

  if (!workspaceId.value) {
    projectError.value = "Workspace is required.";
    return;
  }

  isCreatingProject.value = true;
  try {
    await workspaceStore.createProject(workspaceId.value, nextName);
    projectSuccess.value = "Project created.";
    projectForm.value = "";
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    projectError.value = error?.response?.data?.message || "Failed to create project.";
  } finally {
    isCreatingProject.value = false;
  }
};

const inviteMember = async () => {
  memberActionError.value = "";
  memberActionSuccess.value = "";
  const email = String(inviteForm.value.email || "").trim();

  if (!email) {
    memberActionError.value = "Member email is required.";
    return;
  }

  isInvitingMember.value = true;
  try {
    await workspaceStore.inviteWorkspaceMember(workspaceId.value, {
      email,
      role_name: inviteForm.value.role,
    });
    inviteForm.value = { email: "", role: "MEMBER" };
    memberActionSuccess.value = "Member invited.";
    await Promise.all([fetchMembers(), workspaceStore.fetchWorkspace(workspaceId.value)]);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "Failed to invite member.";
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

  const confirmed = window.confirm(`Remove ${member.name || member.email} from this workspace?`);
  if (!confirmed) return;

  memberActionError.value = "";
  memberActionSuccess.value = "";
  removingMemberId.value = member.id;

  try {
    await workspaceStore.removeWorkspaceMember(workspaceId.value, member.id);
    memberActionSuccess.value = "Member removed.";
    await Promise.all([fetchMembers(), workspaceStore.fetchWorkspace(workspaceId.value)]);
  } catch (error) {
    memberActionError.value = error?.response?.data?.message || "Failed to remove member.";
  } finally {
    removingMemberId.value = null;
  }
};

const fetchWorkspaceData = async () => {
  await Promise.all([fetchWorkspaceDetail(), fetchMembers()]);
};

onMounted(fetchWorkspaceData);
watch(() => route.params.workspaceId, fetchWorkspaceData);
</script>

<style scoped>
.workspace-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--dl-text);
}

.status {
  color: var(--dl-text-muted);
  font-size: 14px;
}

.status.error {
  color: var(--color-danger);
}

.status.success {
  color: #166534;
}

.status.muted {
  color: var(--dl-text-muted);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-surface);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card--full {
  grid-column: 1 / -1;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card__header h2 {
  margin: 0;
  font-size: 16px;
}

.summary-list {
  margin: 0;
  display: grid;
  gap: 10px;
}

.summary-list div {
  display: grid;
  gap: 4px;
}

.summary-list dt {
  font-size: 12px;
  color: var(--dl-text-muted);
}

.summary-list dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stat {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dl-border);
  background-color: var(--dl-page-bg);
}

.stat__value {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.stat__label {
  margin: 0;
  font-size: 12px;
  color: var(--dl-text-muted);
}

.project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.project-item a {
  color: var(--dl-text);
  text-decoration: none;
  font-weight: 600;
}

.project-item a:hover {
  text-decoration: underline;
}

.empty {
  margin: 0;
  color: var(--dl-text-muted);
  font-size: 14px;
}

.inline-form,
.invite-form {
  display: grid;
  gap: 10px;
}

.inline-form label,
.invite-form label {
  font-size: 12px;
  color: var(--dl-text-muted);
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
  border: 1px solid var(--dl-border);
  background: var(--dl-page-bg);
  color: var(--dl-text);
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
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid var(--dl-border);
  background: var(--dl-page-bg);
  border-radius: 12px;
  padding: 10px 12px;
}

.member-info {
  min-width: 0;
}

.member-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.member-email {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--dl-text-muted);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 820px) {
  .invite-form__grid {
    grid-template-columns: 1fr;
  }

  .member-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
