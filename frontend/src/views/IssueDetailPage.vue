<template>
  <BackLinkButton @click="$router.back()"> 보드로 돌아가기 </BackLinkButton>
  <hgroup>
    <div>
      <h1 v-if="!isEditing">{{ issue.title || t("issue.detail.header.fallbackTitle") }}</h1>
      <input
        v-else
        v-model.trim="editForm.title"
        type="text"
        class="issue-title-input"
        :placeholder="t('issue.detail.fields.titlePlaceholder')"
      />
      <Tag v-if="!isEditing">{{ issueStatusLabel }}</Tag>
      <select v-else v-model="editForm.status" class="issue-status-select">
        <option v-for="statusOption in allStatuses" :key="statusOption" :value="statusOption">
          {{ t(`issue.status.${convertSnakeToCamel(statusOption)}`) }}
        </option>
      </select>
    </div>
    <div class="actions">
      <button v-if="!isEditing" class="btn btn--sm btn--secondary" @click="startEditing">
        {{ t("issue.detail.actions.edit") }}
      </button>
      <button v-else class="btn btn--sm" @click="saveIssue" :disabled="isSaving">
        {{ isSaving ? t("issue.detail.actions.saving") : t("issue.detail.actions.save") }}
      </button>
      <button
        v-if="isEditing"
        class="btn btn--sm btn--ghost"
        @click="cancelEditing"
        :disabled="isSaving"
      >
        {{ t("issue.detail.actions.cancel") }}
      </button>
      <button
        v-if="canDeleteIssue"
        class="btn btn--sm btn--danger"
        @click="deleteIssue"
        :disabled="isSaving || isDeleting"
      >
        {{ isDeleting ? t("issue.detail.actions.deleting") : t("issue.detail.actions.delete") }}
      </button>
    </div>
  </hgroup>

  <p v-if="isLoading">{{ t("issue.detail.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>

  <section v-else class="issue-grid">
    <div class="issue-main">
      <p v-if="!isEditing && issue.content">{{ issue.content }}</p>
      <p v-else-if="!isEditing">{{ t("issue.detail.empty.description") }}</p>
      <textarea
        v-else
        v-model.trim="editForm.content"
        class="issue-content-input"
        rows="8"
        :placeholder="t('issue.detail.fields.descriptionPlaceholder')"
      ></textarea>
    </div>
    <aside class="issue-meta">
      <h2>{{ t("issue.detail.sections.assignees") }}</h2>
      <div class="role-picker">
        <RelatedMemberPicker
          v-for="role in roleOptions"
          :key="role"
          :role="role"
          :label="roleLabel(role)"
          :members="projectMembers"
          :selected="roleMembers(role)"
          :is-updating="isUpdatingRelated"
          :updating-member-id="updatingMemberId"
          @add="(memberId) => addRelatedMemberByRole(role, memberId)"
          @remove="removeRelatedMember"
        />
        <p v-if="relatedError" class="role-error">{{ relatedError }}</p>
      </div>
    </aside>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import { addToast } from "../lib/toast";
import { useAppStore } from "../stores/appStore";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import Tag from "../components/Tag.vue";
import RelatedMemberPicker from "../components/RelatedMemberPicker.vue";
import BackLinkButton from "../components/BackLinkButton.vue";
import { convertSnakeToCamel } from "../lib/utils";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const projectMemberStore = useProjectMemberStore();
const issue = ref({});
const issueMembers = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isEditing = ref(false);
const errorMessage = ref("");
const relatedError = ref("");
const isUpdatingRelated = ref(false);
const updatingMemberId = ref(null);
const editForm = ref({
  title: "",
  content: "",
  status: "BACKLOG", // Added status field
});

const allStatuses = ["BACKLOG", "PENDING", "IN_PROGRESS", "IN_REVIEW", "DONE"]; // Define all possible statuses

const roleOptions = ["ASSIGNEE", "REPORTER", "REVIEWER", "WATCHER"];

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const boardId = computed(() => route.params.boardId);
const issueId = computed(() => route.params.issueId);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));

const issueStatusLabel = computed(() => {
  const key = String(issue.value?.status || "").toUpperCase();
  if (!key) return "";
  const map = {
    BACKLOG: "issue.status.backlog",
    PENDING: "issue.status.pending",
    IN_PROGRESS: "issue.status.inProgress",
    IN_REVIEW: "issue.status.inReview",
    DONE: "issue.status.done",
  };
  const labelKey = map[key];
  return labelKey ? t(labelKey) : key;
});

const roleLabel = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "ASSIGNEE") return t("issue.detail.roles.assignee");
  if (key === "REPORTER") return t("issue.detail.roles.reporter");
  if (key === "REVIEWER") return t("issue.detail.roles.reviewer");
  if (key === "WATCHER") return t("issue.detail.roles.watcher");
  return role || "";
};
const currentUserId = computed(() => appStore.currentUser?.id);
const userIssueRole = computed(() => {
  if (!currentUserId.value) return "";
  const found = issueMembers.value.find(
    (member) => String(member.member_id) === String(currentUserId.value)
  );
  return (found?.role_name || "").toUpperCase();
});
const canDeleteIssue = computed(() => ["REPORTER", "REVIEWER"].includes(userIssueRole.value));

const roleMembers = (role) => {
  const key = (role || "").toUpperCase();
  return issueMembers.value.filter((member) => (member.role_name || "").toUpperCase() === key);
};

const hasMemberInRole = (role, memberId) => {
  const key = (role || "").toUpperCase();
  return issueMembers.value.some((member) => {
    const memberRole = (member.role_name || "").toUpperCase();
    return memberRole === key && String(member.member_id) === String(memberId);
  });
};

const findIssueMemberByMemberId = (memberId) =>
  issueMembers.value.find((member) => String(member.member_id) === String(memberId));

const updateIssueMembers = (members) => {
  issueMembers.value = members;
};

const fetchIssue = async (options = {}) => {
  const { silent = false } = options;
  if (!issueId.value) {
    issue.value = {};
    return;
  }

  if (!silent) {
    isLoading.value = true;
  }
  errorMessage.value = "";

  try {
    const res = await api.get(`/issues/${issueId.value}`);
    issue.value = res.data?.data || {};
    if (!isEditing.value) {
      editForm.value = {
        title: issue.value.title || "",
        content: issue.value.content || "",
      };
    }
  } catch (error) {
    errorMessage.value = t("issue.detail.status.errorLoad");
  } finally {
    if (!silent) {
      isLoading.value = false;
    }
  }
};

onMounted(fetchIssue);
watch(issueId, fetchIssue);

const startEditing = () => {
  isEditing.value = true;
  editForm.value = {
    title: issue.value.title || "",
    content: issue.value.content || "",
    status: issue.value.status || "BACKLOG", // Initialize status
  };
};

const cancelEditing = () => {
  isEditing.value = false;
  editForm.value = {
    title: issue.value.title || "",
    content: issue.value.content || "",
    status: issue.value.status || "BACKLOG", // Reset status
  };
};

const saveIssue = async () => {
  if (!issueId.value) return;
  if (!editForm.value.title) {
    errorMessage.value = t("issue.detail.validation.titleRequired");
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    await api.patch(`/issues/${issueId.value}`, {
      title: editForm.value.title,
      content: editForm.value.content,
      status: editForm.value.status,
    });
    issue.value = {
      ...issue.value,
      title: editForm.value.title,
      content: editForm.value.content,
      status: editForm.value.status,
    };
    isEditing.value = false;
    addToast({ message: t("issue.detail.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("issue.detail.status.errorUpdate");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const deleteIssue = async () => {
  if (!issueId.value) return;
  if (!canDeleteIssue.value) return;
  const confirmed = window.confirm(t("issue.detail.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  errorMessage.value = "";

  try {
    await api.delete(`/issues/${issueId.value}`);
    addToast({ message: t("issue.detail.toast.deleted"), type: "success" });
    if (workspaceId.value && projectId.value && boardId.value) {
      router.push(
        `/workspace/${workspaceId.value}/project/${projectId.value}/board/${boardId.value}`
      );
      return;
    }
    router.back();
  } catch (error) {
    const message = error?.response?.data?.message || t("issue.detail.status.errorDelete");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isDeleting.value = false;
  }
};

const fetchIssueMembers = async (options = {}) => {
  const { silent = false } = options;
  if (!issueId.value) {
    updateIssueMembers([]);
    return;
  }

  if (!silent) {
    isUpdatingRelated.value = true;
  }
  relatedError.value = "";

  try {
    const res = await api.get(`/issues/${issueId.value}/members`);
    updateIssueMembers(res.data?.data || []);
  } catch (error) {
    relatedError.value = t("issue.detail.related.errorLoad");
  } finally {
    if (!silent) {
      isUpdatingRelated.value = false;
    }
  }
};

onMounted(fetchIssueMembers);
watch(issueId, fetchIssueMembers);

const removeRelatedMember = async (issueMemberId) => {
  const confirmed = window.confirm(t("issue.detail.related.confirmRemove"));
  if (!confirmed) return;

  updatingMemberId.value = issueMemberId;
  relatedError.value = "";

  try {
    await api.delete(`/issues/members/${issueMemberId}`);
    await fetchIssueMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || t("issue.detail.related.errorRemove");
  } finally {
    updatingMemberId.value = null;
  }
};

const addRelatedMemberByRole = async (role, memberId) => {
  const resolvedMemberId = memberId;
  if (!resolvedMemberId) {
    relatedError.value = t("issue.detail.related.validation.selectMember");
    return;
  }

  isUpdatingRelated.value = true;
  relatedError.value = "";

  try {
    const current = findIssueMemberByMemberId(resolvedMemberId);
    if (current) {
      const currentRole = (current.role_name || "").toUpperCase();
      const nextRole = (role || "").toUpperCase();
      if (currentRole === nextRole) {
        return;
      }
      await api.delete(`/issues/members/${current.issue_member_id}`);
    }
    if (hasMemberInRole(role, resolvedMemberId)) {
      return;
    }
    await api.post(`/issues/${issueId.value}/members`, {
      member_id: resolvedMemberId,
      role_name: role || "ASSIGNEE",
    });
    await fetchIssueMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || t("issue.detail.related.errorUpdate");
  } finally {
    isUpdatingRelated.value = false;
  }
};
</script>

<style scoped>
.role-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.role-error {
  color: #d12020;
  margin: 0;
}

.issue-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}

.issue-main {
  grid-column: span 9;
}

.issue-main p {
  white-space: pre-wrap;
}

.issue-meta {
  grid-column: span 3;
}

.actions {
  display: flex;
  gap: 8px;
}

.issue-title-input {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 18px;
  font-weight: 600;
  margin-right: 8px;
}

.issue-status-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  margin-left: 8px;
  /* Adjust width as needed */
  min-width: 120px;
}

.issue-content-input {
  width: 100%;
  min-height: 180px;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  resize: vertical;
}

.issue-meta h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

@media (max-width: 900px) {
  .issue-main,
  .issue-meta {
    grid-column: span 12;
  }
}
</style>
