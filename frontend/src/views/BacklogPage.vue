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
        <h2>{{ t("backlog.page.header.title") }}</h2>
        <button type="button" class="btn btn--sm" @click="openModal" :disabled="!backlogBoardId">
          백로그 만들기
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
        @dragstart="onDragStart(issue)"
      >
        <h3>
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
          보드 만들기
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
          @click="$router.push(`/project/${projectId}/board/${board.id}`)"
        >
          <h3>{{ board.name }}</h3>
          <p v-if="board.summary" class="board-card-summary">{{ board.summary }}</p>
          <div class="issue-counts">
            <div v-for="(count, status) in board.issue_counts" :key="status" class="status-count">
              <span>{{ t(`issue.status.${convertSnakeToCamel(status)}`) }}:</span>
              <span class="tabular-nums">{{ count }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

  <BaseModal
    :open="isModalOpen"
    :title="t('backlog.page.modal.title')"
    :closeOnBackdrop="false"
    @close="closeModal"
  >
    <form class="modal-form" @submit.prevent="createIssue">
      <label for="issue-title">{{ t("backlog.page.modal.titleLabel") }}</label>
      <input
        id="issue-title"
        v-model.trim="form.title"
        type="text"
        :placeholder="t('backlog.page.modal.titlePlaceholder')"
      />

      <label for="issue-content">{{ t("backlog.page.modal.descriptionLabel") }}</label>
      <textarea
        id="issue-content"
        v-model.trim="form.content"
        rows="10"
        :placeholder="t('backlog.page.modal.descriptionPlaceholder')"
      ></textarea>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("backlog.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("backlog.page.actions.creating") : t("backlog.page.actions.create") }}
        </button>
      </div>
    </form>
  </BaseModal>

  <BaseModal :open="isBoardModalOpen" :title="t('board.layout.modal.title')" @close="closeBoardModal">
    <form class="modal-form" @submit.prevent="createBoard">
      <label for="board-name">{{ t("board.layout.modal.nameLabel") }}</label>
      <input
        id="board-name"
        v-model.trim="boardForm.name"
        type="text"
        :placeholder="t('board.layout.modal.namePlaceholder')"
      />

      <label for="board-summary">{{ t("board.layout.modal.summaryLabel") }}</label>
      <input
        id="board-summary"
        v-model.trim="boardForm.summary"
        type="text"
        maxlength="80"
        :placeholder="t('board.layout.modal.summaryPlaceholder')"
      />

      <p v-if="boardFormError" class="form-error">{{ boardFormError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeBoardModal">
          {{ t("board.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isBoardCreating">
          {{ isBoardCreating ? t("board.layout.actions.creating") : t("board.layout.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import Tag from "../components/Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";
import { useBoardStore } from "../stores/boardStore";
import { convertSnakeToCamel } from "../lib/utils";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const boardStore = useBoardStore();

const issues = ref([]);
const backlogBoardId = ref(null);
const isLoadingIssues = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({
  title: "",
  content: "",
  status: "BACKLOG", // Default to BACKLOG status
});

const boardsForDisplay = ref([]);
const isLoadingBoards = ref(false);
const boardListError = ref("");
const draggingIssueId = ref(null); // To store the ID of the dragged issue
const isBoardModalOpen = ref(false);
const isBoardCreating = ref(false);
const boardFormError = ref("");
const boardForm = ref({ name: "", summary: "" });


const projectId = computed(() => route.params.projectId);

const fetchBacklogBoard = async () => {
  if (!projectId.value) return;
  try {
    const allBoards = boardStore.getBoards(projectId.value);
    const defaultBacklogBoard = allBoards.find((board) => board.type === "BACKLOG");
    if (defaultBacklogBoard) {
      backlogBoardId.value = defaultBacklogBoard.id;
    } else {
      // Fallback: If not in store, try to fetch all boards and find it
      await boardStore.fetchBoards(projectId.value);
      const fetchedBoards = boardStore.getBoards(projectId.value);
      const foundBoard = fetchedBoards.find((board) => board.type === "BACKLOG");
      if (foundBoard) {
        backlogBoardId.value = foundBoard.id;
      } else {
        errorMessage.value = t("backlog.page.status.errorBoardNotFound");
      }
    }
  } catch (error) {
    errorMessage.value = t("backlog.page.status.errorLoad");
  }
};

const fetchIssues = async () => {
  if (!backlogBoardId.value) {
    isLoadingIssues.value = false;
    return;
  }
  isLoadingIssues.value = true;
  errorMessage.value = "";
  try {
    const res = await api.get(`/boards/${backlogBoardId.value}/issues`);
    issues.value = res.data || [];
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
    let boardsFromStore = boardStore.getBoards(projectId.value);
    if (boardsFromStore.length === 0) {
      // If boards are not yet loaded in the store for this project
      await boardStore.fetchBoards(projectId.value);
      boardsFromStore = boardStore.getBoards(projectId.value);
    }

    boardsForDisplay.value = boardsFromStore.filter((board) => board.type !== "BACKLOG");
  } catch (error) {
    boardListError.value = error?.response?.data?.message || t("backlog.page.boardList.errorLoad");
  } finally {
    isLoadingBoards.value = false;
  }
};

const issueDetailPath = (issueId) =>
  `/project/${projectId.value}/board/${backlogBoardId.value}/issue/${issueId}`;

const roleVariant = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "REPORTER") return "info";
  if (key === "ASSIGNEE") return "success";
  if (key === "REVIEWER") return "warning";
  if (key === "WATCHER") return "default";
  return "default";
};

const onDragStart = (issue) => {
  draggingIssueId.value = issue.id;
};

const onDropToBoard = async (targetBoardId) => {
  const issueId = draggingIssueId.value;
  if (!issueId) return;

  const currentIssue = issues.value.find((item) => item.id === issueId);
  if (!currentIssue || currentIssue.board_id === targetBoardId) {
    draggingIssueId.value = null;
    return;
  }

  try {
    const res = await api.patch(`/issues/${issueId}`, {
      board_id: targetBoardId,
      status: "PENDING", // Set status to PENDING when dropped onto a board
    });
    const updated = res.data;

    // Remove issue from backlog list
    issues.value = issues.value.filter((issue) => issue.id !== issueId);

    // Update counts on the target board
    const targetBoardIndex = boardsForDisplay.value.findIndex(
      (board) => board.id === targetBoardId
    );
    if (targetBoardIndex !== -1) {
      const board = boardsForDisplay.value[targetBoardIndex];
      const newIssueCounts = { ...board.issue_counts };

      // Decrement BACKLOG count from the original board (if it was from the backlog board)
      // This is implicit, as we filter issues out of the backlog issues list
      // So no need to decrease backlog counts, as this issue was originally a backlog issue

      // Increment PENDING count for the target board
      newIssueCounts.PENDING = (newIssueCounts.PENDING || 0) + 1;

      boardsForDisplay.value[targetBoardIndex] = {
        ...board,
        issue_counts: newIssueCounts,
      };
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
  if (!backlogBoardId.value) {
    formError.value = t("backlog.page.validation.noBoard");
    return;
  }
  form.value = { title: "", content: "", status: "BACKLOG" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const openBoardModal = () => {
  if (!projectId.value) {
    boardFormError.value = t("board.layout.validation.noProject");
    return;
  }
  boardForm.value = { name: "", summary: "" };
  boardFormError.value = "";
  isBoardModalOpen.value = true;
};

const closeBoardModal = () => {
  isBoardModalOpen.value = false;
};

const createBoard = async () => {
  if (!boardForm.value.name) {
    boardFormError.value = t("board.layout.validation.nameRequired");
    return;
  }

  isBoardCreating.value = true;
  boardFormError.value = "";

  try {
    await api.post("/boards", {
      name: boardForm.value.name,
      summary: boardForm.value.summary,
      project_id: projectId.value,
      type: "KANBAN",
    });
    await boardStore.fetchBoards(projectId.value);
    await fetchBoardsForDisplay();
    closeBoardModal();
  } catch (error) {
    boardFormError.value = error?.response?.data?.message || t("board.layout.status.errorCreate");
  } finally {
    isBoardCreating.value = false;
  }
};

const createIssue = async () => {
  if (!form.value.title) {
    formError.value = t("backlog.page.validation.titleRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/issues", {
      title: form.value.title,
      content: form.value.content,
      board_id: backlogBoardId.value,
      status: form.value.status,
    });
    await fetchIssues(); // Re-fetch issues after creation
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("backlog.page.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchBacklogBoard(), fetchBoardsForDisplay()]);
  await fetchIssues(); // Fetch issues after backlogBoardId is set
});

watch(projectId, async (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    await Promise.all([fetchBacklogBoard(), fetchBoardsForDisplay()]);
    await fetchIssues();
  }
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
