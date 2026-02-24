<template>
  <div class="LnbLayout BoardLayout">
    <aside>
      <button type="button" class="btn" @click="openModal">
        {{ t("board.layout.actions.create") }}
      </button>
      <nav>
        <!-- <span class="lnb-item">
          <MaterialSymbol name="view_kanban" :size="18" alt="" />
          보드 목록
        </span> -->
        <p v-if="isLoading">{{ t("board.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="boards.length === 0">{{ t("board.layout.empty.boards") }}</p>
        <template v-else>
          <router-link
            v-for="board in boards.filter((b) => b.type !== 'BACKLOG')"
            :key="board.id"
            :to="`/project/${projectId}/board/${board.id}`"
            @dragover.prevent
            @drop.prevent.stop="moveIssueToBoard($event, board.id)"
          >
            {{ board.name }}
          </router-link>
        </template>
        <hr />
        <router-link
          class="lnb-item"
          :to="`/project/${projectId}/board/backlog`"
          @dragover.prevent
          @drop.prevent.stop="moveIssueToBacklog"
        >
          <!-- <MaterialSymbol name="low_priority" size="18" /> -->
          {{ t("backlog.page.header.title") }}
        </router-link>
        <router-link class="lnb-item" :to="`/project/${projectId}/board/gantt`">
          간트차트
        </router-link>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <CreateBoardModal
    :open="isModalOpen"
    :project-id="projectId"
    @close="closeModal"
    @created="onBoardCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import CreateBoardModal from "../../components/modals/CreateBoardModal.vue";
import { useBoardStore } from "../../stores/boardStore";
import { useProjectSearchStore } from "../../stores/projectSearchStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const boardStore = useBoardStore();
const projectSearchStore = useProjectSearchStore();
const boards = computed(() => boardStore.getBoards(projectId.value));
const backlogBoard = computed(() => boards.value.find((board) => board.type === "BACKLOG") || null);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);

const projectId = computed(() => route.params.projectId);

const fetchBoards = async () => {
  if (!projectId.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await boardStore.fetchBoards(projectId.value);
    projectSearchStore.upsertBoards(projectId.value, boardStore.getBoards(projectId.value));
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    errorMessage.value = t("board.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onBoardCreated = async () => {
  await fetchBoards();
};

const getDraggedIssueId = (event) => {
  const value = event?.dataTransfer?.getData("text/issue-id");
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getDraggedIssueOrigin = (event) => {
  return event?.dataTransfer?.getData("text/issue-origin") || "";
};

const moveIssueToBoard = async (event, targetBoardId) => {
  const issueId = getDraggedIssueId(event);
  if (!issueId || !targetBoardId) return;

  const origin = getDraggedIssueOrigin(event);
  const payload = { board_id: targetBoardId };
  if (origin === "backlog") {
    payload.status = "PENDING";
  }

  try {
    await api.patch(`/issues/${issueId}`, payload);
    await boardStore.fetchBoards(projectId.value);
    window.dispatchEvent(
      new CustomEvent("issue:moved", {
        detail: { issueId, boardId: targetBoardId, status: payload.status },
      })
    );
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("board.layout.status.errorLoad");
  }
};

const moveIssueToBacklog = async (event) => {
  const issueId = getDraggedIssueId(event);
  if (!issueId) return;

  try {
    await api.patch(`/issues/${issueId}`, { status: "BACKLOG" });
    await boardStore.fetchBoards(projectId.value);
    window.dispatchEvent(
      new CustomEvent("issue:moved", {
        detail: { issueId, boardId: backlogBoard.value?.id || null, status: "BACKLOG" },
      })
    );
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("board.layout.status.errorLoad");
  }
};

onMounted(fetchBoards);
watch(projectId, fetchBoards);
</script>
<style scoped>
.BoardLayout aside nav {
  /* font-size: 14px; */
  gap: 4px;
}
.BoardLayout main {
  padding: 18px 24px 3rem;
}
</style>

