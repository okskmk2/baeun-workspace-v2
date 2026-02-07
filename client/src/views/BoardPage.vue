<template>
  <hgroup>
    <h1>{{ board.name || "Board" }}</h1>
    <button type="button" @click="openModal">이슈 만들기</button>
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
        <h2>{{ status }}</h2>
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
          <strong>{{ issue.title }}</strong>
          <p v-if="issue.content">{{ issue.content }}</p>
        </article>
      </div>
    </section>
  </div>

  <BaseModal :open="isModalOpen" title="이슈 만들기" @close="closeModal">
    <form class="modal-form" @submit.prevent="createIssue">
      <label for="issue-title">제목</label>
      <input id="issue-title" v-model.trim="form.title" type="text" placeholder="이슈 제목" />

      <label for="issue-content">내용</label>
      <textarea
        id="issue-content"
        v-model.trim="form.content"
        rows="4"
        placeholder="이슈 내용을 입력하세요"
      ></textarea>

      <label for="issue-status">상태</label>
      <select id="issue-status" v-model="form.status">
        <option v-for="status in statuses" :key="status" :value="status">
          {{ status }}
        </option>
      </select>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" @click="closeModal">취소</button>
        <button type="submit" :disabled="isCreating">
          {{ isCreating ? "저장 중..." : "저장" }}
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
  status: "백로그",
});

const statuses = ["백로그", "진행중", "검토중", "완료"];

const boardId = computed(() => route.params.boardId);

const fetchBoard = async () => {
  if (!boardId.value) return;
  const res = await api.get(`/board/${boardId.value}`);
  board.value = res.data?.data || {};
};

const fetchIssues = async () => {
  if (!boardId.value) return;
  const res = await api.get(`/board/${boardId.value}/issue`);
  issues.value = res.data?.data || [];
};

const issuesByStatus = (status) =>
  issues.value.filter((issue) => (issue.status || "백로그") === status);

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
    const res = await api.patch(`/issue/${issueId}`, { status });
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
    formError.value = "보드를 선택해주세요.";
    return;
  }
  form.value = { title: "", content: "", status: "백로그" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createIssue = async () => {
  if (!form.value.title) {
    formError.value = "제목을 입력해주세요.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const res = await api.post("/issue", {
      title: form.value.title,
      content: form.value.content,
      board_id: boardId.value,
      status: form.value.status,
    });
    const created = res.data?.data;
    if (created) {
      issues.value = [...issues.value, created];
    } else {
      await fetchIssues();
    }
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "이슈 생성에 실패했습니다.";
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
  padding: 10px;
  min-height: 240px;
  background: #fafafa;
}

.kanban-column header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
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
