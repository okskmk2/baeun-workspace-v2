<template>
  <div class="AcountLayout">
    <aside>
      <button type="button" class="btn" @click="openModal">보드 만들기</button>
      <nav>
        <p v-if="isLoading">불러오는 중...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="boards.length === 0">보드가 없습니다.</p>
        <template v-else>
          <router-link
            v-for="board in boards"
            :key="board.id"
            :to="`/workspace/${workspaceId}/project/${projectId}/board/${board.id}`"
          >
            {{ board.name }}
          </router-link>
        </template>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <BaseModal :open="isModalOpen" title="보드 만들기" @close="closeModal">
    <form class="modal-form" @submit.prevent="createBoard">
      <label for="board-name">보드 이름</label>
      <input id="board-name" v-model.trim="form.name" type="text" placeholder="보드 이름" />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">취소</button>
        <button type="submit" class="btn" :disabled="isCreating">
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
const boards = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ name: "" });

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);

const fetchBoards = async () => {
  if (!projectId.value) {
    boards.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/project/${projectId.value}/boards`);
    boards.value = res.data?.data || [];
  } catch (error) {
    boards.value = [];
    errorMessage.value = "보드 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = "프로젝트가 선택되지 않았습니다.";
    return;
  }
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createBoard = async () => {
  if (!form.value.name) {
    formError.value = "보드 이름을 입력해주세요.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/board", {
      name: form.value.name,
      project_id: projectId.value,
      type: "KANBAN",
    });
    await fetchBoards();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "보드 생성에 실패했습니다.";
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchBoards);
watch(projectId, fetchBoards);
</script>
