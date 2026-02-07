<template>
  <hgroup>
    <h1>워크스페이스 목록</h1>
    <div>
      <button type="button" @click="openModal">워크스페이스 추가</button>
    </div>
  </hgroup>
  <p v-if="isLoading">불러오는 중...</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <p v-else-if="workspaces.length === 0">워크스페이스가 없습니다.</p>
  <ul v-else>
    <li v-for="workspace in workspaces" :key="workspace.id">
      <router-link :to="`/workspace/${workspace.id}`">
        <strong>{{ workspace.name }}</strong>
        <span v-if="workspace.role_name"> ({{ workspace.role_name }})</span>
      </router-link>
      <button
        type="button"
        @click="deleteWorkspace(workspace.id)"
        :disabled="deletingWorkspaceId === workspace.id"
      >
        {{ deletingWorkspaceId === workspace.id ? "삭제 중..." : "삭제" }}
      </button>
    </li>
  </ul>

  <BaseModal :open="isModalOpen" title="워크스페이스 추가" @close="closeModal">
    <form class="modal-form" @submit.prevent="createWorkspace">
      <label for="workspace-name">워크스페이스 이름</label>
      <input
        id="workspace-name"
        v-model.trim="form.name"
        type="text"
        placeholder="워크스페이스 이름"
      />
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
import { onMounted, ref } from "vue";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

const workspaceStore = useWorkspaceStore();
const workspaces = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ name: "" });
const deletingWorkspaceId = ref(null);

const fetchWorkspaces = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    workspaces.value = await workspaceStore.fetchWorkspaces();
  } catch (error) {
    workspaces.value = [];
    errorMessage.value = "워크스페이스 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchWorkspaces);

const openModal = () => {
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createWorkspace = async () => {
  if (!form.value.name) {
    formError.value = "워크스페이스 이름을 입력해주세요.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await workspaceStore.createWorkspace({ name: form.value.name });
    await fetchWorkspaces();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "워크스페이스 생성에 실패했습니다.";
  } finally {
    isCreating.value = false;
  }
};

const deleteWorkspace = async (workspaceId) => {
  if (!workspaceId) return;
  const confirmed = window.confirm("워크스페이스를 삭제할까요?");
  if (!confirmed) return;

  deletingWorkspaceId.value = workspaceId;
  errorMessage.value = "";

  try {
    await workspaceStore.deleteWorkspace(workspaceId);
    await fetchWorkspaces();
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "워크스페이스 삭제에 실패했습니다.";
  } finally {
    deletingWorkspaceId.value = null;
  }
};
</script>
