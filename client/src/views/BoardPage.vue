<template>
  <hgroup>
    <h1>{{ board.name || "Board" }}</h1>
    <button type="button" class="btn" @click="openModal">Create Issue</button>
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
        <span>{{ issuesByStatus(status).length }}</span>
      </header>

      <div class="kanban-cards">
        <article
          v-for="issue in issuesByStatus(status)"
          :key="issue.id"
          class="kanban-card"
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
                :label="assignee.role_name"
                :variant="roleVariant(assignee.role_name)"
              />
            </div>
          </div>
          <p v-else>No assignees</p>
        </article>
      </div>
    </section>
  </div>

  <BaseModal :open="isModalOpen" title="Create Issue" @close="closeModal">
    <form class="modal-form" @submit.prevent="createIssue">
      <label for="issue-title">Title</label>
      <input id="issue-title" v-model.trim="form.title" type="text" placeholder="Issue title" />

      <label for="issue-content">Description</label>
      <textarea
        id="issue-content"
        v-model.trim="form.content"
        rows="4"
        placeholder="Enter issue details"
      ></textarea>

      <label for="issue-status">Status</label>
      <select id="issue-status" v-model="form.status">
        <option v-for="status in statuses" :key="status" :value="status">
          {{ statusLabels[status] }}
        </option>
      </select>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">Cancel</button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? "Creating..." : "Create" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import Tag from "../components/Tag.vue";

const route = useRoute();

const board = ref({});
const issues = ref([]);
const draggingIssueId = ref(null);
const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({
  title: "",
  content: "",
  status: "BACKLOG",
});

const statuses = ["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const statusLabels = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const boardId = computed(() => route.params.boardId);

const fetchBoard = async () => {
  if (!boardId.value) return;
  const res = await api.get(`/boards/${boardId.value}`);
  board.value = res.data?.data || {};
};

const fetchIssues = async () => {
  if (!boardId.value) return;
  const res = await api.get(`/boards/${boardId.value}/issues`);
  issues.value = res.data?.data || [];
};

const issuesByStatus = (status) =>
  issues.value.filter((issue) => (issue.status || "BACKLOG") === status);
const issueDetailPath = (issueId) =>
  `/workspace/${workspaceId.value}/project/${projectId.value}/board/${boardId.value}/issue/${issueId}`;

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

const onDrop = async (status) => {
  const issueId = draggingIssueId.value;
  if (!issueId) return;

  const currentIssue = issues.value.find((item) => item.id === issueId);
  if (!currentIssue || currentIssue.status === status) {
    draggingIssueId.value = null;
    return;
  }

  try {
    const res = await api.patch(`/issues/${issueId}`, { status });
    const updated = res.data?.data;
    issues.value = issues.value.map((item) =>
      item.id === issueId ? { ...item, ...updated } : item
    );
  } catch (error) {
    await fetchIssues();
  } finally {
    draggingIssueId.value = null;
  }
};

const openModal = () => {
  if (!boardId.value) {
    formError.value = "Please select a board.";
    return;
  }
  form.value = { title: "", content: "", status: "BACKLOG" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createIssue = async () => {
  if (!form.value.title) {
    formError.value = "Please enter a title.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/issues", {
      title: form.value.title,
      content: form.value.content,
      board_id: boardId.value,
      status: form.value.status,
    });
    await fetchIssues();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "Failed to create issue.";
  } finally {
    isCreating.value = false;
  }
};

const loadBoardData = async () => {
  await Promise.all([fetchBoard(), fetchIssues()]);
};

onMounted(loadBoardData);

watch(boardId, async (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    await loadBoardData();
  }
});
</script>

<style scoped>
.board-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.kanban {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.kanban-column {
  border: 1px solid #e5e7eb;
  padding: 10px 10px 24px;
  min-height: 240px;
  background: #fafafa;
}

.kanban-column header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.kanban-column header h2 {
  font-size: 15px;
  margin: 0;
}

.kanban-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  border: 1px solid #e5e7eb;
  background: #fff;
  padding: 8px 10px;
  cursor: grab;
}

.kanban-card h3 {
  font-size: 14px;
  margin: 0;
}

.kanban-card p {
  margin: 0;
  margin-top: 1rem;
  font-size: 15px;
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
