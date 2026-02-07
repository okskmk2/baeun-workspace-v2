<template>
  <div class="AcountLayout">
    <aside>
      <button>보드 만들기</button>
      <div>
        보드 목록
        <nav>
          <p v-if="isLoading">불러오는 중...</p>
          <p v-else-if="errorMessage">{{ errorMessage }}</p>
          <p v-else-if="boards.length === 0">보드가 없습니다.</p>
          <ul v-else>
            <li v-for="board in boards" :key="board.id">
              <router-link :to="`/workspace/${workspaceId}/project/${projectId}/board/${board.id}`">
                {{ board.name }}
              </router-link>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const route = useRoute();
const boards = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");

const workspaceId = route.params.workspaceId;
const projectId = route.params.projectId;

const fetchBoards = async () => {
  if (!projectId) {
    boards.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/project/${projectId}/boards`);
    boards.value = res.data?.data || [];
  } catch (error) {
    boards.value = [];
    errorMessage.value = "보드 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchBoards);
watch(() => route.params.projectId, fetchBoards);
</script>
