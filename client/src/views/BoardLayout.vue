<template>
  <div class="AcountLayout">
    <aside>
      <button type="button" class="btn" @click="openModal">Create Board</button>
      <nav>
        <p v-if="isLoading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="boards.length === 0">No boards yet.</p>
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

  <BaseModal :open="isModalOpen" title="Create Board" @close="closeModal">
    <form class="modal-form" @submit.prevent="createBoard">
      <label for="board-name">Board Name</label>
      <input id="board-name" v-model.trim="form.name" type="text" placeholder="Board name" />
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
    const res = await api.get(`/boards`, { params: { projectId: projectId.value } });
    boards.value = res.data?.data || [];
  } catch (error) {
    boards.value = [];
    errorMessage.value = "Failed to load boards.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = "No project selected.";
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
    formError.value = "Please enter a board name.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/boards", {
      name: form.value.name,
      project_id: projectId.value,
      type: "KANBAN",
    });
    await fetchBoards();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "Failed to create board.";
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchBoards);
watch(projectId, fetchBoards);
</script>
