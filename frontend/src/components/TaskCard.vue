<template>
  <article :class="cardClass" :draggable="draggable" @dragstart="handleDragStart">
    <h3 class="task-title-row">
      <MaterialSymbol
        v-if="getPriorityIconName(task.priority)"
        :name="getPriorityIconName(task.priority)"
        :size="18"
        class="task-priority-icon"
        :style="{ color: getPriorityColor(task.priority) }"
      />
      <router-link :to="detailPath">{{ task.title }}</router-link>
    </h3>

    <div v-if="task.assignee_members?.length" class="assignee-list">
      <div
        v-for="assignee in task.assignee_members"
        :key="`${task.id}-${assignee.id}-${assignee.role_name}`"
        class="assignee-item"
      >
        <span>{{ assignee.name }}</span>
        <Tag
          v-if="assignee.role_name"
          :label="getRoleLabel(roleScope, assignee.role_name)"
          :variant="roleVariant(assignee.role_name)"
        />
      </div>
    </div>
    <p v-else class="empty-assignees">{{ emptyAssigneesText }}</p>
  </article>
</template>

<script setup>
import { computed } from "vue";
import MaterialSymbol from "./MaterialSymbol.vue";
import Tag from "./Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";

const props = defineProps({
  task: { type: Object, required: true },
  detailPath: { type: String, required: true },
  emptyAssigneesText: { type: String, default: "" },
  roleScope: { type: String, default: "issue_member" },
  variant: { type: String, default: "kanban" },
  draggable: { type: Boolean, default: false },
});

const emit = defineEmits(["dragstart"]);
const { getRoleLabel } = useRoleLabels();

const cardClass = computed(() => ["task-card", `task-card--${props.variant}`]);

const getPriorityIconName = (priority) => {
  const parsed = Number(priority);
  if (Number.isNaN(parsed)) return "";
  if (parsed === 2) return "stat_2";
  if (parsed === 1) return "stat_1";
  if (parsed === 0) return "stat_0";
  if (parsed === -1) return "stat_minus_1";
  return "";
};

const getPriorityColor = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return "var(--color-danger)";
  if (parsed === 1) return "var(--color-warning)";
  if (parsed === 0) return "var(--color-info)";
  if (parsed === -1) return "var(--color-text-muted)";
  return "var(--color-text-muted)";
};

const roleVariant = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "REPORTER") return "info";
  if (key === "ASSIGNEE") return "success";
  if (key === "REVIEWER") return "warning";
  if (key === "WATCHER") return "default";
  return "default";
};

const handleDragStart = (event) => {
  emit("dragstart", event, props.task);
};
</script>

<style scoped>
.task-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.task-priority-icon {
  flex-shrink: 0;
}

.task-title-row > a {
  color: var(--color-text);
  text-decoration: none;
}

.task-title-row > a:hover {
  text-decoration: underline;
}

.assignee-list {
  display: flex;
}

.assignee-item {
  display: inline-flex;
  align-items: center;
  color: var(--color-text);
}

.task-card--backlog .task-title-row {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 8px;
}

.task-card--backlog .empty-assignees {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.task-card--backlog .assignee-list {
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.task-card--backlog .assignee-item {
  gap: 4px;
  font-size: 10px;
}

.task-card--kanban .task-title-row {
  font-size: 14px;
  font-weight: 400;
  margin: 0;
}

.task-card--kanban .task-title-row > a {
  word-break: break-all;
}

.task-card--kanban .empty-assignees {
  margin: 1rem 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.task-card--kanban .assignee-list {
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.task-card--kanban .assignee-item {
  gap: 6px;
  font-size: 12px;
}
</style>