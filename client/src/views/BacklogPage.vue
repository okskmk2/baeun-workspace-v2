<template>
  <hgroup>
    <h1>{{ t("backlog.page.header.title") }}</h1>
    <div class="actions">
      <button type="button" class="btn btn--sm" @click="openModal" :disabled="!backlogBoardId">
        {{ t("backlog.page.actions.createIssue") }}
      </button>
    </div>
  </hgroup>

  <div class="issue-list">
    <p v-if="isLoadingIssues">{{ t("backlog.page.status.loading") }}</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="issues.length === 0">{{ t("backlog.page.empty.issues") }}</p>
    <article v-for="issue in issues" :key="issue.id" class="issue-card">
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

  <BaseModal :open="isModalOpen" :title="t('backlog.page.modal.title')" @close="closeModal">
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
        rows="4"
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
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import Tag from "../components/Tag.vue";
import { useRoleLabels } from "../lib/roleLabels";
import { useBoardStore } from "../stores/boardStore"; // Import boardStore

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

const workspaceId = computed(() => route.params.workspaceId);
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
    issues.value = res.data?.data || [];
  } catch (error) {
    errorMessage.value = t("backlog.page.status.errorLoad");
  } finally {
    isLoadingIssues.value = false;
  }
};

const issueDetailPath = (issueId) =>
  `/workspace/${workspaceId.value}/project/${projectId.value}/board/${backlogBoardId.value}/issue/${issueId}`;

const roleVariant = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "REPORTER") return "info";
  if (key === "ASSIGNEE") return "success";
  if (key === "REVIEWER") return "warning";
  if (key === "WATCHER") return "default";
  return "default";
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
  await fetchBacklogBoard();
  // await fetchIssues();
});

watch(projectId, async (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    await fetchBacklogBoard();
    await fetchIssues();
  }
});

watch(backlogBoardId, async (newBoardId, oldBoardId) => {
  if (newBoardId && newBoardId !== oldBoardId) {
    await fetchIssues();
  }
});
</script>

<style scoped>
.issue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.issue-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 12px 16px;
  border-radius: 8px;
}

.issue-card h3 {
  font-size: 16px;
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
  font-size: 14px;
  color: #94a3b8;
}

.assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.assignee-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text);
}
</style>
