<template>
  <hgroup>
    <h1>{{ board.name || t("board.page.header.fallbackTitle") }}</h1>
    <div class="actions">
      <button type="button" class="btn btn--sm" @click="openModal">
        {{ t("board.page.actions.createIssue") }}
      </button>
      <router-link
        class="btn btn--icon"
        :aria-label="t('board.page.actions.settings')"
        :title="t('board.page.actions.settings')"
        :to="boardSettingsPath"
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
                :label="getRoleLabel('issue_member', assignee.role_name)"
                :variant="roleVariant(assignee.role_name)"
              />
            </div>
          </div>
          <p v-else>{{ t("board.page.empty.assignees") }}</p>
        </article>
      </div>
    </section>
  </div>

  <BaseModal :open="isModalOpen" :title="t('board.page.modal.title')" @close="closeModal">
    <form class="modal-form" @submit.prevent="createIssue">
      <label for="issue-title">{{ t("board.page.modal.titleLabel") }}</label>
      <input
        id="issue-title"
        v-model.trim="form.title"
        type="text"
        :placeholder="t('board.page.modal.titlePlaceholder')"
      />

      <label for="issue-content">{{ t("board.page.modal.descriptionLabel") }}</label>
      <textarea
        id="issue-content"
        v-model.trim="form.content"
        rows="4"
        :placeholder="t('board.page.modal.descriptionPlaceholder')"
      ></textarea>

      <label for="issue-status">{{ t("board.page.modal.statusLabel") }}</label>
      <select id="issue-status" v-model="form.status">
        <option v-for="status in statuses" :key="status" :value="status">
          {{ statusLabels[status] }}
        </option>
      </select>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("board.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("board.page.actions.creating") : t("board.page.actions.create") }}
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
import MaterialSymbol from "../components/MaterialSymbol.vue";
import Tag from "../components/Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
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

const statuses = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const statusLabels = computed(() => ({
  BACKLOG: t("issue.status.backlog"),
  PENDING: t("issue.status.pending"),
  IN_PROGRESS: t("issue.status.inProgress"),
  IN_REVIEW: t("issue.status.inReview"),
  DONE: t("issue.status.done"),
}));

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
const boardSettingsPath = computed(
  () => `/workspace/${workspaceId.value}/project/${projectId.value}/board/${boardId.value}/settings`
);

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
    formError.value = t("board.page.validation.noBoard");
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
    formError.value = t("board.page.validation.titleRequired");
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
    formError.value = error?.response?.data?.message || t("board.page.status.errorCreate");
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
