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

    <hr class="card-divider" />

    <div class="meta-list">
      <template v-if="task.assignee_members?.length">
        <Tag
          v-for="assignee in task.assignee_members"
          :key="`${task.id}-${assignee.id}-${assignee.role_name}`"
          :variant="assignee.role_name ? getTaskRoleVariant(assignee.role_name) : 'default'"
          :title="assignee.role_name ? getRoleLabel(roleScope, assignee.role_name) : ''"
          :aria-label="assignee.role_name ? getRoleLabel(roleScope, assignee.role_name) : ''"
        >
          <MaterialSymbol
            v-if="assignee.role_name"
            :name="getTaskRoleIconName(assignee.role_name)"
            :size="14"
            alt=""
          />
          {{ assignee.name }}
        </Tag>
      </template>
      <p v-else class="empty-assignees">{{ emptyAssigneesText }}</p>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";
import Tag from "./Tag.vue";
import { getTaskRoleIconName, getTaskRoleVariant, useRoleLabels } from "../lib/roleLabels";

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
  return null;
};

const getPriorityLabel = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return t("task.priority.urgent");
  if (parsed === 1) return t("task.priority.high");
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

.card-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 8px 0;
}

.meta-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.task-card--kanban .meta-list {
  flex-direction: column;
  align-items: flex-start;
}

.empty-assignees {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}
</style>
