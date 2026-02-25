<template>
  <hgroup>
    <div>
      <h1>{{ kanban.name || t("kanban.page.header.fallbackTitle") }}</h1>
      <p v-if="kanban.summary" class="subtitle">{{ kanban.summary }}</p>
    </div>
    <div class="actions">
      <button type="button" class="btn btn--sm" @click="openModal">
        {{ t("kanban.page.actions.createTask") }}
      </button>
      <router-link
        class="btn btn--icon"
        :aria-label="t('kanban.page.actions.settings')"
        :title="t('kanban.page.actions.settings')"
        :to="kanbanSettingsPath"
      >
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <div class="kanban">
    <section
      v-for="status in statuses"
      :key="status"
      class="kanban-column"
      @dragover.prevent
      @drop="onDrop(status)"
    >
      <header>
        <h2>{{ statusLabels[status] }}</h2>
        <span>{{ tasksByStatus(status).length }}</span>
      </header>

      <div class="kanban-cards">
        <article
          v-for="task in tasksByStatus(status)"
          :key="task.id"
          class="kanban-card"
          draggable="true"
          @dragstart="onDragStart($event, task)"
        >
          <h3>
            <router-link :to="taskDetailPath(task.id)">{{ task.title }}</router-link>
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
                :label="getRoleLabel('task_member', assignee.role_name)"
                :variant="roleVariant(assignee.role_name)"
              />
            </div>
          </div>
          <p v-else>{{ t("kanban.page.empty.assignees") }}</p>
        </article>
      </div>
    </section>
  </div>

  <CreateTaskModal
    :open="isModalOpen"
    :kanban-id="kanbanId"
    :show-status-select="true"
    :statuses="statuses"
    :default-status="'PENDING'"
    @close="closeModal"
    @created="onTaskCreated"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import CreateTaskModal from "../../components/modals/CreateTaskModal.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import Tag from "../../components/Tag.vue";
import { useRoleLabels } from "../../lib/roleLabels";
import { convertSnakeToCamel } from "../../lib/utils";
import { useProjectSearchStore } from "../../stores/projectSearchStore";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const projectSearchStore = useProjectSearchStore();

const kanban = ref({});
const tasks = ref([]);
const draggingTaskId = ref(null);
const isModalOpen = ref(false);

const statuses = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const statusLabels = computed(() => {
  const labels = {};
  statuses.forEach((status) => {
    const key = convertSnakeToCamel(status);
    labels[status] = t(`task.status.${key}`);
  });
  return labels;
});

const projectId = computed(() => route.params.projectId);
const kanbanId = computed(() => route.params.kanbanId);

const fetchKanban = async () => {
  if (!kanbanId.value) return;
  const res = await api.get(`/kanbans/${kanbanId.value}`);
  kanban.value = res.data || {};
};

const fetchTasks = async () => {
  if (!kanbanId.value) return;
  const res = await api.get(`/kanbans/${kanbanId.value}/tasks`);
  tasks.value = res.data || [];
  projectSearchStore.upsertTasks(projectId.value, tasks.value);
};

const tasksByStatus = (status) =>
  tasks.value.filter((task) => (task.status || "BACKLOG") === status);
const taskDetailPath = (taskId) =>
  `/project/${projectId.value}/kanban/${kanbanId.value}/task/${taskId}`;
const kanbanSettingsPath = computed(
  () => `/project/${projectId.value}/kanban/${kanbanId.value}/settings`
);

const roleVariant = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "REPORTER") return "info";
  if (key === "ASSIGNEE") return "success";
  if (key === "REVIEWER") return "warning";
  if (key === "WATCHER") return "default";
  return "default";
};

const onDragStart = (event, task) => {
  draggingTaskId.value = task.id;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/task-id", String(task.id));
    event.dataTransfer.setData("text/task-origin", "kanban");
  }
};

const onDrop = async (status) => {
  const taskId = draggingTaskId.value;
  if (!taskId) return;

  const currentTask = tasks.value.find((item) => item.id === taskId);
  if (!currentTask || currentTask.status === status) {
    draggingTaskId.value = null;
    return;
  }

  try {
    const res = await api.patch(`/tasks/${taskId}`, { status });
    const updated = res.data;
    tasks.value = tasks.value.map((item) =>
      item.id === taskId ? { ...item, ...updated } : item
    );
  } catch (error) {
    await fetchTasks();
  } finally {
    draggingTaskId.value = null;
  }
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onTaskCreated = async () => {
  await fetchTasks();
};

const loadKanbanData = async () => {
  await Promise.all([fetchKanban(), fetchTasks()]);
};

onMounted(loadKanbanData);

const handleExternalTaskMove = async () => {
  await fetchTasks();
};

watch(kanbanId, async (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    await loadKanbanData();
  }
});

onMounted(() => {
  window.addEventListener("task:moved", handleExternalTaskMove);
});

onBeforeUnmount(() => {
  window.removeEventListener("task:moved", handleExternalTaskMove);
});
</script>

<style scoped>
.kanban {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
  min-width: 45rem;
  min-height: 30rem;
}

.actions {
  display: inline-flex;
  gap: 8px;
}

.kanban-summary {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

/* .kanban-column + .kanban-column {
  border-left: 1px solid #ddd;
  padding-left: 8px;
  margin-left: 8px;
} */

.kanban-column header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.kanban-column header h2 {
  font-size: 14px;
  margin: 0;
  font-weight: 700;
}

.kanban-column header span {
  margin-left: 6px;
  font-size: 10px;
  color: var(--color-text);
  background-color: #e2e8f0;
  border-radius: 999px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  line-height: 1;
  align-items: center;
  justify-content: center;
}

.kanban-cards {
  display: flex;
  flex-direction: column;
  row-gap: 8px;
  height: calc(100vh - 249px);
  overflow-y: auto;
}

.kanban-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 12px 12px;
  cursor: grab;
  border-radius: 8px;
}

.kanban-card h3 {
  font-size: 14px;
  font-weight: normal;
  margin: 0;
}

.kanban-card h3 > a {
  color: var(--color-text);
  text-decoration: none;
  word-break: break-all;
}

.kanban-card h3 > a:hover {
  text-decoration: underline;
}

.kanban-card p {
  margin: 0;
  margin-top: 1rem;
  font-size: 14px;
  color: #94a3b8;
}

.assignee-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.assignee-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text);
}

.kanban-card:active {
  cursor: grabbing;
}

@media (max-width: 900px) {
  .kanban {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .kanban {
    grid-template-columns: 1fr;
  }
}
</style>

