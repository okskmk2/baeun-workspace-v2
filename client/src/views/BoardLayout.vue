<template>
  <div class="LnbLayout BoardLayout">
    <aside>
      <button type="button" class="btn" @click="openModal">
        {{ t("board.layout.actions.create") }}
      </button>
      <nav>
        <p v-if="isLoading">{{ t("board.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="boards.length === 0">{{ t("board.layout.empty.boards") }}</p>
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

  <BaseModal :open="isModalOpen" :title="t('board.layout.modal.title')" @close="closeModal">
    <form class="modal-form" @submit.prevent="createBoard">
      <label for="board-name">{{ t("board.layout.modal.nameLabel") }}</label>
      <input
        id="board-name"
        v-model.trim="form.name"
        type="text"
        :placeholder="t('board.layout.modal.namePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("board.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("board.layout.actions.creating") : t("board.layout.actions.submit") }}
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

const { t } = useI18n();
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
    errorMessage.value = t("board.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = t("board.layout.validation.noProject");
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
    formError.value = t("board.layout.validation.nameRequired");
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
    formError.value = error?.response?.data?.message || t("board.layout.status.errorCreate");
  } finally {
    isCreating.value = false;
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
