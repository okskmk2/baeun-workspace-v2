<template>
  <hgroup>
    <div>
      <h1>{{ t("backlog.page.header.title") }}</h1>
      <p class="subtitle">미할당된 이슈를 드래그 앤 드롭으로 보드에 할당할 수 있습니다.</p>
    </div>
  </hgroup>

  <div class="backlog-layout">
    <div class="backlog-issues">
      <div class="column-header">
        <h2 class="backlog-title-row">
          <span>{{ t("backlog.page.header.title") }}</span>
          <CountChip :count="issues.length" />
        </h2>
        <button type="button" class="btn btn--sm" @click="openModal" :disabled="!backlogKanbanId">
          {{ t("backlog.page.actions.createTask") }}
        </button>
      </div>
      <p v-if="isLoadingIssues">{{ t("backlog.page.status.loading") }}</p>
      <p v-else-if="errorMessage">{{ errorMessage }}</p>
      <p v-else-if="issues.length === 0">{{ t("backlog.page.empty.issues") }}</p>
      <article
        v-for="issue in issues"
        :key="issue.id"
        class="issue-card"
        draggable="true"
        @dragstart="onDragStart($event, issue)"
      >
        <h3 class="task-title-row">
          <MaterialSymbol
            v-if="getPriorityIconName(issue.priority)"
            :name="getPriorityIconName(issue.priority)"
            :size="18"
            class="task-priority-icon"
            :style="{ color: getPriorityColor(issue.priority) }"
          />
          <router-link :to="issueDetailPath(issue.id)">{{ issue.title }}</router-link>
        </h3>
        <div v-if="issue.assignee_members?.length" class="assignee-list">
          <div
            v-for="assignee in issue.assignee_members"
            :key="`${issue.id}-${assignee.id}-${assignee.role_name}`"
            class="assignee-item"
          >
            <span>{{ assignee.name }}</span>
            <Tag
              v-if="assignee.role_name"
              :label="getRoleLabel('issue_member', assignee.role_name)"
              :variant="roleVariant(assignee.role_name)"
            />
          </div>
        </div>
        <p v-else>{{ t("backlog.page.empty.assignees") }}</p>
      </article>
    </div>

    <div class="project-boards">
      <div class="column-header">
        <h2>{{ t("backlog.page.boardList.title") }}</h2>
        <button type="button" class="btn btn--sm" @click="openBoardModal" :disabled="!projectId">
          {{ t("kanban.layout.actions.create") }}
        </button>
      </div>
      <p v-if="isLoadingBoards">{{ t("backlog.page.status.loadingBoards") }}</p>
      <p v-else-if="boardListError">{{ boardListError }}</p>
      <p v-else-if="boardsForDisplay.length === 0">{{ t("backlog.page.boardList.empty") }}</p>
      <div v-else class="board-cards-grid">
        <article
          v-for="board in boardsForDisplay"
          :key="board.id"
          class="board-card"
          @dragover.prevent
          @drop="onDropToBoard(board.id)"
          @click="$router.push(`/project/${projectId}/kanban/${board.id}`)"
        >
          <h3>{{ board.name }}</h3>
          <p v-if="board.summary" class="board-card-summary">{{ board.summary }}</p>
          <div class="issue-counts">
            <div v-for="(count, status) in board.task_counts" :key="status" class="status-count">
              <span>{{ t(`task.status.${convertSnakeToCamel(status)}`) }}:</span>
              <span class="tabular-nums">{{ count }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

  <CreateTaskModal
    :open="isModalOpen"
    :kanban-id="backlogKanbanId"
    @close="closeModal"
    @created="onIssueCreated"
  />

  <CreateKanbanModal
    :open="isBoardModalOpen"
    :project-id="projectId"
    @close="closeBoardModal"
    @created="onBoardCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import CountChip from "../../components/CountChip.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import Tag from "../../components/Tag.vue";
import CreateTaskModal from "../../components/modals/CreateTaskModal.vue";
import CreateKanbanModal from "../../components/modals/CreateKanbanModal.vue";
import { convertSnakeToCamel } from "../../lib/utils";
import { useProjectSearchStore } from "../../stores/projectSearchStore";
import { useRoleLabels } from "../../lib/roleLabels";
import { useKanbanStore } from "../../stores/kanbanStore";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const kanbanStore = useKanbanStore();
const projectSearchStore = useProjectSearchStore();

const issues = ref([]);
const backlogKanbanId = ref(null);
const isLoadingIssues = ref(false);
const errorMessage = ref("");

const isLoadingBoards = ref(false);
const boardListError = ref("");
const draggingIssueId = ref(null); // To store the ID of the dragged issue
const isModalOpen = ref(false);
const isBoardModalOpen = ref(false);

const projectId = computed(() => route.params.projectId);

const boardsForDisplay = computed(() => {
  const allBoards = kanbanStore.getKanbans(projectId.value);
  return allBoards.filter((board) => board.type !== "BACKLOG");
});

const fetchBacklogBoard = async () => {
  if (!projectId.value) return;
  try {
    const allBoards = kanbanStore.getKanbans(projectId.value);
    const defaultBacklogBoard = allBoards.find((board) => board.type === "BACKLOG");
    if (defaultBacklogBoard) {
      backlogKanbanId.value = defaultBacklogBoard.id;
    } else {
      // Fallback: If not in store, try to fetch all boards and find it
      await kanbanStore.fetchKanbans(projectId.value);
      const fetchedBoards = kanbanStore.getKanbans(projectId.value);
      const foundBoard = fetchedBoards.find((board) => board.type === "BACKLOG");
      if (foundBoard) {
        backlogKanbanId.value = foundBoard.id;
      } else {
        errorMessage.value = t("backlog.page.status.errorBoardNotFound");
      }
    }
  } catch (error) {
    errorMessage.value = t("backlog.page.status.errorLoad");
  }
};

const fetchIssues = async () => {
  if (!backlogKanbanId.value) {
    isLoadingIssues.value = false;
    return;
  }
  isLoadingIssues.value = true;
  errorMessage.value = "";
  try {
    const res = await api.get(`/kanbans/${backlogKanbanId.value}/tasks`);
    issues.value = res.data || [];
    projectSearchStore.upsertTasks(projectId.value, issues.value);
  } catch (error) {
    errorMessage.value = t("backlog.page.status.errorLoad");
  } finally {
    isLoadingIssues.value = false;
  }
};

const fetchBoardsForDisplay = async () => {
  if (!projectId.value) return;
  isLoadingBoards.value = true;
  boardListError.value = "";
  try {
    const boardsFromStore = kanbanStore.getKanbans(projectId.value);
    if (boardsFromStore.length === 0) {
      // If boards are not yet loaded in the store for this project
      await kanbanStore.fetchKanbans(projectId.value);
    }
  } catch (error) {
    boardListError.value = error?.response?.data?.message || t("backlog.page.boardList.errorLoad");
  } finally {
    isLoadingBoards.value = false;
  }
};

const issueDetailPath = (issueId) =>
  `/project/${projectId.value}/kanban/${backlogKanbanId.value}/task/${issueId}`;

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

const onDragStart = (event, issue) => {
  draggingIssueId.value = issue.id;
  if (event?.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/task-id", String(issue.id));
    event.dataTransfer.setData("text/task-origin", "backlog");
  }
};

const onDropToBoard = async (targetBoardId) => {
  const issueId = draggingIssueId.value;
  if (!issueId) return;

  const currentIssue = issues.value.find((item) => item.id === issueId);
  if (!currentIssue || currentIssue.kanban_id === targetBoardId) {
    draggingIssueId.value = null;
    return;
  }

  try {
    await api.patch(`/tasks/${issueId}`, {
      kanban_id: targetBoardId,
      status: "PENDING", // Set status to PENDING when dropped onto a board
    });

    // Remove issue from backlog list
    issues.value = issues.value.filter((issue) => issue.id !== issueId);

    // Update counts on the target board via store
    const targetBoard = kanbanStore
      .getKanbans(projectId.value)
      .find((board) => board.id === targetBoardId);
    if (targetBoard) {
      const newIssueCounts = { ...(targetBoard.task_counts || {}) };
      newIssueCounts.PENDING = (newIssueCounts.PENDING || 0) + 1;
      kanbanStore.updateKanbanDetails(targetBoardId, projectId.value, {
        task_counts: newIssueCounts,
      });
    }
  } catch (error) {
    console.error("Failed to move issue:", error);
    // Optionally re-fetch data if update fails
    await fetchIssues();
    await fetchBoardsForDisplay();
  } finally {
    draggingIssueId.value = null;
  }
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const openBoardModal = () => {
  isBoardModalOpen.value = true;
};

const closeBoardModal = () => {
  isBoardModalOpen.value = false;
};

const onIssueCreated = async () => {
  await fetchIssues();
};

const onBoardCreated = async () => {
  await kanbanStore.fetchKanbans(projectId.value);
  await fetchBacklogBoard();
  await fetchBoardsForDisplay();
};

const initializePage = async () => {
  if (!projectId.value) return;

  await fetchBoardsForDisplay();
  await fetchBacklogBoard();
  await fetchIssues();
};

onMounted(initializePage);

watch(projectId, async () => {
  backlogKanbanId.value = null;
  issues.value = [];
  await initializePage();
});
</script>

<style scoped>
.backlog-layout {
  display: grid;
  grid-template-columns: 3fr 9fr; /* 3/9 column ratio */
  gap: 24px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.column-header h2 {
  margin: 0;
  font-size: 18px;
}

.backlog-title-row {
  display: inline-flex;
  align-items: center;
}

.task-title-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.task-priority-icon {
  flex-shrink: 0;
}

.backlog-issues {
  /* Style for the backlog issues column */
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 238px); /* Adjust height to fit layout */
  overflow-y: auto;
  padding-right: 12px; /* Add some padding for scrollbar */
}

.issue-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 12px 16px;
  border-radius: 8px;
  cursor: grab;
}

.issue-card h3 {
  font-size: 14px; /* Reduced font size for backlog list */
  font-weight: 500;
  margin: 0 0 8px 0;
}

.issue-card h3 > a {
  color: var(--color-text);
  text-decoration: none;
}

.issue-card h3 > a:hover {
  text-decoration: underline;
}

.issue-card p {
  margin: 0;
  font-size: 12px; /* Reduced font size */
  color: #94a3b8;
}

.assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px; /* Reduced gap */
  margin-top: 6px; /* Reduced margin */
}

.assignee-item {
  display: inline-flex;
  align-items: center;
  gap: 4px; /* Reduced gap */
  font-size: 10px; /* Reduced font size */
  color: var(--color-text);
}

.project-boards {
  /* Style for the project boards column */
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-boards h2 {
  font-size: 18px;
  margin-bottom: 0;
}

.board-cards-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(200px, 1fr)
  ); /* Responsive grid for board cards */
  gap: 16px;
  /* height: calc(100vh - 230px); */
  overflow-y: auto;
}

.board-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease-in-out;
}

.board-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.board-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.board-card-summary {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.issue-counts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.status-count {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
}

/* Modal specific styles, might need adjustment */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-error {
  color: var(--color-danger);
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

@media (max-width: 900px) {
  .backlog-layout {
    grid-template-columns: 1fr; /* Stack columns on smaller screens */
  }
  .backlog-issues,
  .project-boards {
    height: auto;
    max-height: 50vh; /* Limit height for stacked sections */
  }
}
</style>
