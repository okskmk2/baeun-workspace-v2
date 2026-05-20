<template>
  <article
    :class="cardClass"
    :style="priorityBorderStyle"
    :draggable="draggable"
    @dragstart="handleDragStart"
  >
    <div class="card-top">
      <h3 class="task-title-row">
        <router-link :to="detailPath">{{ task.title }}</router-link>
      </h3>
      <!-- TODO: 우선순위 태그 임시 숨김
      <Tag
        v-if="getPriorityIconName(task.priority)"
        variant="default"
        :style="priorityTagStyle"
      >
        <MaterialSymbol :name="getPriorityIconName(task.priority)" :size="14" alt="" />
        {{ getPriorityLabel(task.priority) }}
      </Tag>
      -->
    </div>

    <!-- <hr class="card-divider" /> -->

    <div class="meta-list">
      <div v-if="sortedMembers.length" class="avatar-group">
        <Avatar
          v-for="(member, index) in sortedMembers"
          :key="`${task.id}-${member.id}-${member.role_name}`"
          :text="getAvatarText(member.name)"
          :size="22"
          :image-url="getMemberImageUrl(member.id)"
          :label="`${member.name} · ${getRoleLabel(roleScope, member.role_name)}`"
          :title="`${member.name} · ${getRoleLabel(roleScope, member.role_name)}`"
          :style="{ zIndex: sortedMembers.length - index }"
          class="avatar-item"
        />
      </div>
      <p v-else class="empty-assignees">{{ emptyAssigneesText }}</p>
      <span v-if="task.due_date" :class="dueDateClass" class="due-date">
        <MaterialSymbol name="schedule" :size="12" alt="" />
        {{ formatDueDate(task.due_date) }}
      </span>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Avatar from "./Avatar.vue";
import MaterialSymbol from "./MaterialSymbol.vue";
import { useRoleLabels } from "../lib/roleLabels";

const props = defineProps({
  task: { type: Object, required: true },
  detailPath: { type: String, required: true },
  emptyAssigneesText: { type: String, default: "" },
  roleScope: { type: String, default: "task_member" },
  variant: { type: String, default: "kanban" },
  draggable: { type: Boolean, default: false },
});

const emit = defineEmits(["dragstart"]);
const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();

const ROLE_PRIORITY = { ASSIGNEE: 0, REPORTER: 1, REVIEWER: 2, WATCHER: 3 };

const sortedMembers = computed(() => {
  const members = props.task.assignee_members || [];
  return [...members].sort((a, b) => {
    const pa = ROLE_PRIORITY[(a.role_name || "").toUpperCase()] ?? 99;
    const pb = ROLE_PRIORITY[(b.role_name || "").toUpperCase()] ?? 99;
    return pa - pb;
  });
});

const getMemberImageUrl = (memberId) => (memberId ? `/api/members/${memberId}/profile/image` : "");

const formatDueDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const dueDateClass = computed(() => {
  if (!props.task.due_date) return "";
  const now = new Date();
  const due = new Date(props.task.due_date);
  if (Number.isNaN(due.getTime())) return "";
  const diffMs = due - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "due-date--overdue";
  if (diffDays < 2) return "due-date--soon";
  return "";
});

const getAvatarText = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase();
};

const cardClass = computed(() => ["task-card", `task-card--${props.variant}`]);

const getPriorityIconName = (priority) => {
  const parsed = Number(priority);
  if (Number.isNaN(parsed)) return "";
  if (parsed === 1) return "stat_1";
  if (parsed === 0) return "stat_0";
  if (parsed === -1) return "stat_minus_1";
  return "";
};

const getPriorityColor = (priority) => {
  const parsed = Number(priority);
  if (parsed === 1) return "var(--color-danger)";
  if (parsed === 0) return "var(--color-info)";
  if (parsed === -1) return "var(--color-text-muted)";
  return null;
};

const getPriorityLabel = (priority) => {
  const parsed = Number(priority);
  if (parsed === 1) return t("task.priority.urgent");
  if (parsed === 0) return t("task.priority.normal");
  if (parsed === -1) return t("task.priority.relaxed");
  return "";
};

const priorityBorderStyle = computed(() => {
  const color = getPriorityColor(props.task.priority);
  return color ? { borderLeftColor: color } : {};
});

const priorityTagStyle = computed(() => {
  const color = getPriorityColor(props.task.priority);
  return color
    ? {
        borderColor: `color-mix(in srgb, ${color} 40%, var(--color-border) 60%)`,
        backgroundColor: `color-mix(in srgb, ${color} 20%, white 80%)`,
        color: `color-mix(in srgb, ${color} 65%, var(--color-text) 35%)`,
      }
    : {};
});

const handleDragStart = (event) => {
  emit("dragstart", event, props.task);
};
</script>

<style scoped>
.task-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left-width: 3px;
  border-radius: 8px;
}

.task-card[draggable="true"] {
  cursor: grab;
}

.task-card[draggable="true"]:active {
  cursor: grabbing;
}

.task-card--backlog {
  padding: 12px 16px;
}

.task-card--kanban {
  padding: 12px;
}

.task-title-row {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

.task-title-row > a {
  color: var(--color-text);
  text-decoration: none;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.task-title-row > a:hover {
  text-decoration: underline;
}

.card-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.meta-list {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 22px;
  gap: 6px;
}

.avatar-group {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.avatar-item {
  margin-left: -6px;
  border: 2px solid var(--color-surface);
  box-sizing: content-box;
}

.avatar-item:first-child {
  margin-left: 0;
}

.empty-assignees {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.due-date {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.due-date--soon {
  color: var(--color-warning);
}

.due-date--overdue {
  color: var(--color-danger);
}
</style>
