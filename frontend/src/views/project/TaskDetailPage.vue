<template>
  <BackLinkButton @click="goBackToKanban"> {{ t("task.detail.actions.backToKanban") }} </BackLinkButton>
  <hgroup>
    <div>
      <h1 v-if="!isEditing" class="task-title-row">
        <MaterialSymbol
          v-if="getPriorityIconName(task.priority)"
          :name="getPriorityIconName(task.priority)"
          :size="20"
          class="task-priority-icon"
          :style="{ color: getPriorityColor(task.priority) }"
        />
        <span>{{ task.title || t("task.detail.header.fallbackTitle") }}</span>
      </h1>
      <input
        v-else
        v-model.trim="editForm.title"
        type="text"
        class="task-title-input"
        :placeholder="t('task.detail.fields.titlePlaceholder')"
      />
      <Tag v-if="!isEditing">{{ taskStatusLabel }}</Tag>
      <select v-else v-model="editForm.status" class="task-status-select">
        <option v-for="statusOption in allStatuses" :key="statusOption" :value="statusOption">
          {{ t(`task.status.${convertSnakeToCamel(statusOption)}`) }}
        </option>
      </select>
      <template v-if="isEditing">
        <label for="task-priority" class="task-priority-label">{{ t("task.detail.fields.priorityLabel") }}</label>
        <div class="task-priority-field">
          <MaterialSymbol
            :name="getPriorityIconName(editForm.priority)"
            :size="18"
            class="task-priority-icon"
            :style="{ color: getPriorityColor(editForm.priority) }"
          />
          <select id="task-priority" v-model.number="editForm.priority" class="task-priority-select">
            <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
              {{ t(option.labelKey) }}
            </option>
          </select>
        </div>
      </template>
    </div>
    <div class="actions">
      <button
        v-if="!isEditing"
        class="btn btn--sm"
        @click="enterTaskChatRoom"
        :disabled="isEnteringChat"
      >
        {{
          isEnteringChat
            ? t("task.detail.actions.enteringChat")
            : t("task.detail.actions.enterChat")
        }}
      </button>
      <button v-if="!isEditing" class="btn btn--sm btn--secondary" @click="startEditing">
        {{ t("task.detail.actions.edit") }}
      </button>
      <button v-else class="btn btn--sm" @click="saveTask" :disabled="isSaving">
        {{ isSaving ? t("task.detail.actions.saving") : t("task.detail.actions.save") }}
      </button>
      <button
        v-if="isEditing"
        class="btn btn--sm btn--secondary"
        @click="cancelEditing"
        :disabled="isSaving"
      >
        {{ t("task.detail.actions.cancel") }}
      </button>
      <button
        v-if="canDeleteTask"
        class="btn btn--sm btn--danger"
        @click="deleteTask"
        :disabled="isSaving || isDeleting"
      >
        {{ isDeleting ? t("task.detail.actions.deleting") : t("task.detail.actions.delete") }}
      </button>
    </div>
  </hgroup>

  <p v-if="isLoading">{{ t("task.detail.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>

  <section v-else class="task-grid">
    <div class="task-main">
      <p v-if="!isEditing && task.content">{{ task.content }}</p>
      <p v-else-if="!isEditing">{{ t("task.detail.empty.description") }}</p>
      <textarea
        v-else
        v-model.trim="editForm.content"
        class="task-content-input"
        rows="8"
        :placeholder="t('task.detail.fields.descriptionPlaceholder')"
      ></textarea>
    </div>
    <aside class="task-meta">
      <h2>{{ t("task.detail.sections.assignees") }}</h2>
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
      <div class="member-history">
        <h3>{{ t("task.detail.sections.memberHistory") }}</h3>
        <p v-if="taskMembers.length === 0" class="member-history-empty">
          {{ t("task.detail.empty.memberHistory") }}
        </p>
        <ul v-else class="member-history-list">
          <li v-for="member in taskMembers" :key="member.task_member_id">
            <span class="history-date">{{ formatDate(member.created_at) }}</span>
            <span class="history-meta">
              {{ member.name }}
              <span class="history-role">{{ member.role_name }}</span>
            </span>
          </li>
        </ul>
      </div>
    </aside>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { useAppStore } from "../../stores/appStore";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import Tag from "../../components/Tag.vue";
import RelatedMemberPicker from "../../components/RelatedMemberPicker.vue";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { convertSnakeToCamel } from "../../lib/utils";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const projectMemberStore = useProjectMemberStore();
const task = ref({});
const taskMembers = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isEditing = ref(false);
const errorMessage = ref("");
const relatedError = ref("");
const isUpdatingRelated = ref(false);
const updatingMemberId = ref(null);
const isEnteringChat = ref(false);
const editForm = ref({
  title: "",
  content: "",
  status: "BACKLOG", // Added status field
  priority: 0,
});

const allStatuses = ["BACKLOG", "PENDING", "IN_PROGRESS", "IN_REVIEW", "DONE"]; // Define all possible statuses
const priorityOptions = [
  { value: 2, labelKey: "task.priority.urgent" },
  { value: 1, labelKey: "task.priority.high" },
  { value: 0, labelKey: "task.priority.normal" },
  { value: -1, labelKey: "task.priority.relaxed" },
];

const roleOptions = ["ASSIGNEE", "REPORTER", "REVIEWER", "WATCHER"];

const projectId = computed(() => route.params.projectId);
const kanbanId = computed(() => route.params.kanbanId);
const taskId = computed(() => route.params.taskId);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));

const taskStatusLabel = computed(() => {
  const key = String(task.value?.status || "").toUpperCase();
  if (!key) return "";
  const map = {
    BACKLOG: "task.status.backlog",
    PENDING: "task.status.pending",
    IN_PROGRESS: "task.status.inProgress",
    IN_REVIEW: "task.status.inReview",
    DONE: "task.status.done",
  };
  const labelKey = map[key];
  return labelKey ? t(labelKey) : key;
});

const getPriorityIconName = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return "stat_2";
  if (parsed === 1) return "stat_1";
  if (parsed === 0) return "stat_0";
  if (parsed === -1) return "stat_minus_1";
  return "stat_0";
};

const getPriorityColor = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return "var(--color-danger)";
  if (parsed === 1) return "var(--color-warning)";
  if (parsed === 0) return "var(--color-info)";
  if (parsed === -1) return "var(--color-text-muted)";
  return "var(--color-text-muted)";
};

const roleLabel = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "ASSIGNEE") return t("task.detail.roles.assignee");
  if (key === "REPORTER") return t("task.detail.roles.reporter");
  if (key === "REVIEWER") return t("task.detail.roles.reviewer");
  if (key === "WATCHER") return t("task.detail.roles.watcher");
  return role || "";
};
const currentUserId = computed(() => appStore.currentUser?.id);
const userTaskRole = computed(() => {
  if (!currentUserId.value) return "";
  const found = taskMembers.value.find(
    (member) => String(member.member_id) === String(currentUserId.value)
  );
  return (found?.role_name || "").toUpperCase();
});
const canDeleteTask = computed(() => ["REPORTER", "REVIEWER"].includes(userTaskRole.value));

const roleMembers = (role) => {
  const key = (role || "").toUpperCase();
  return taskMembers.value.filter((member) => (member.role_name || "").toUpperCase() === key);
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const hasMemberInRole = (role, memberId) => {
  const key = (role || "").toUpperCase();
  return taskMembers.value.some((member) => {
    const memberRole = (member.role_name || "").toUpperCase();
    return memberRole === key && String(member.member_id) === String(memberId);
  });
};

const findTaskMemberByMemberId = (memberId) =>
  taskMembers.value.find((member) => String(member.member_id) === String(memberId));

const updateTaskMembers = (members) => {
  taskMembers.value = members;
};

const fetchTask = async (options = {}) => {
  const { silent = false } = options;
  if (!taskId.value) {
    task.value = {};
    return;
  }

  if (!silent) {
    isLoading.value = true;
  }
  errorMessage.value = "";

  try {
    const res = await api.get(`/tasks/${taskId.value}`);
    task.value = res.data || {};
    if (!isEditing.value) {
      editForm.value = {
        title: task.value.title || "",
        content: task.value.content || "",
        status: task.value.status || "BACKLOG",
        priority: Number.isFinite(Number(task.value.priority)) ? Number(task.value.priority) : 0,
      };
    }
  } catch (error) {
    errorMessage.value = t("task.detail.status.errorLoad");
  } finally {
    if (!silent) {
      isLoading.value = false;
    }
  }
};

const goBackToKanban = () => {
  if (projectId.value && kanbanId.value) {
    router.push(`/project/${projectId.value}/kanban/${kanbanId.value}`);
    return;
  }

  router.back();
};

onMounted(fetchTask);
watch(taskId, fetchTask);

const startEditing = () => {
  isEditing.value = true;
  editForm.value = {
    title: task.value.title || "",
    content: task.value.content || "",
    status: task.value.status || "BACKLOG", // Initialize status
    priority: Number.isFinite(Number(task.value.priority)) ? Number(task.value.priority) : 0,
  };
};

const cancelEditing = () => {
  isEditing.value = false;
  editForm.value = {
    title: task.value.title || "",
    content: task.value.content || "",
    status: task.value.status || "BACKLOG", // Reset status
    priority: Number.isFinite(Number(task.value.priority)) ? Number(task.value.priority) : 0,
  };
};

const saveTask = async () => {
  if (!taskId.value) return;
  if (!editForm.value.title) {
    errorMessage.value = t("task.detail.validation.titleRequired");
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    await api.patch(`/tasks/${taskId.value}`, {
      title: editForm.value.title,
      content: editForm.value.content,
      status: editForm.value.status,
      priority: editForm.value.priority,
    });
    task.value = {
      ...task.value,
      title: editForm.value.title,
      content: editForm.value.content,
      status: editForm.value.status,
      priority: editForm.value.priority,
    };
    isEditing.value = false;
    addToast({ message: t("task.detail.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("task.detail.status.errorUpdate");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const deleteTask = async () => {
  if (!taskId.value) return;
  if (!canDeleteTask.value) return;
  const confirmed = window.confirm(t("task.detail.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  errorMessage.value = "";

  try {
    await api.delete(`/tasks/${taskId.value}`);
    addToast({ message: t("task.detail.toast.deleted"), type: "success" });
    if (projectId.value && kanbanId.value) {
      router.push(`/project/${projectId.value}/kanban/${kanbanId.value}`);
      return;
    }
    router.back();
  } catch (error) {
    const message = error?.response?.data?.message || t("task.detail.status.errorDelete");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isDeleting.value = false;
  }
};

const enterTaskChatRoom = async () => {
  if (!taskId.value || !projectId.value) {
    return;
  }

  isEnteringChat.value = true;

  try {
    const res = await api.post(`/tasks/${taskId.value}/channel`);
    const channelId = res.data?.id;
    if (!channelId) {
      throw new Error("channel id missing");
    }
    router.push(`/project/${projectId.value}/channel/${channelId}`);
  } catch (error) {
    const message = error?.response?.data?.message || t("task.detail.status.errorEnterChat");
    addToast({ message, type: "error" });
  } finally {
    isEnteringChat.value = false;
  }
};

const fetchTaskMembers = async (options = {}) => {
  const { silent = false } = options;
  if (!taskId.value) {
    updateTaskMembers([]);
    return;
  }

  if (!silent) {
    isUpdatingRelated.value = true;
  }
  relatedError.value = "";

  try {
    const res = await api.get(`/tasks/${taskId.value}/members`);
    updateTaskMembers(res.data || []);
  } catch (error) {
    relatedError.value = t("task.detail.related.errorLoad");
  } finally {
    if (!silent) {
      isUpdatingRelated.value = false;
    }
  }
};

onMounted(fetchTaskMembers);
watch(taskId, fetchTaskMembers);

const removeRelatedMember = async (taskMemberId) => {
  const confirmed = window.confirm(t("task.detail.related.confirmRemove"));
  if (!confirmed) return;

  updatingMemberId.value = taskMemberId;
  relatedError.value = "";

  try {
    await api.delete(`/tasks/members/${taskMemberId}`);
    await fetchTaskMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || t("task.detail.related.errorRemove");
  } finally {
    updatingMemberId.value = null;
  }
};

const addRelatedMemberByRole = async (role, memberId) => {
  const resolvedMemberId = memberId;
  if (!resolvedMemberId) {
    relatedError.value = t("task.detail.related.validation.selectMember");
    return;
  }

  isUpdatingRelated.value = true;
  relatedError.value = "";

  try {
    const current = findTaskMemberByMemberId(resolvedMemberId);
    if (current) {
      const currentRole = (current.role_name || "").toUpperCase();
      const nextRole = (role || "").toUpperCase();
      if (currentRole === nextRole) {
        return;
      }
      await api.delete(`/tasks/members/${current.task_member_id}`);
    }
    if (hasMemberInRole(role, resolvedMemberId)) {
      return;
    }
    await api.post(`/tasks/${taskId.value}/members`, {
      member_id: resolvedMemberId,
      role_name: role || "ASSIGNEE",
    });
    await fetchTaskMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || t("task.detail.related.errorUpdate");
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

.task-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}

.task-main {
  grid-column: span 9;
}

.task-main p {
  white-space: pre-wrap;
  line-height: 1.5;
}

.task-meta {
  grid-column: span 3;
}

.actions {
  display: flex;
  gap: 8px;
}

.task-title-input {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 18px;
  font-weight: 600;
  margin-right: 8px;
  width: 30rem;
}

.task-title-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.task-priority-icon {
  flex-shrink: 0;
}

.task-status-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  margin-left: 8px;
  /* Adjust width as needed */
  min-width: 120px;
}

.task-priority-label {
  margin-left: 8px;
  margin-right: 4px;
  font-size: 14px;
}

.task-priority-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-priority-select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  min-width: 80px;
}

.task-content-input {
  width: 100%;
  min-height: 180px;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
  resize: vertical;
}

.task-meta h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
}

.member-history {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.member-history h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.member-history-empty {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.member-history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text);
}

.member-history-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-date {
  color: var(--color-text-muted);
}

.history-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.history-role {
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--color-border);
  font-size: 11px;
}

@media (max-width: 900px) {
  .task-main,
  .task-meta {
    grid-column: span 12;
  }
}
</style>
