<template>
  <main>
    <hgroup>
      <h1>프로젝트 목록</h1>
      <button type="button" @click="openModal">프로젝트 만들기</button>
    </hgroup>
    <p v-if="isLoading">Loading...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>
    <p v-else-if="projects.length === 0">No projects.</p>
    <ul v-else>
      <li v-for="project in projects" :key="project.id">
        <router-link :to="`/workspace/${workspaceId}/project/${project.id}`">
          {{ project.name }}
        </router-link>
        <button
          type="button"
          @click="deleteProject(project.id)"
          :disabled="deletingProjectId === project.id"
        >
          {{ deletingProjectId === project.id ? "삭제 중..." : "삭제" }}
        </button>
      </li>
    </ul>
  </main>

  <BaseModal :open="isModalOpen" title="프로젝트 만들기" @close="closeModal">
    <form class="modal-form" @submit.prevent="createProject">
      <label for="project-name">프로젝트 이름</label>
      <input
        id="project-name"
        v-model.trim="form.name"
        type="text"
        placeholder="프로젝트 이름"
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import BaseModal from "../components/BaseModal.vue";
import { useWorkspaceStore } from "../stores/workspaceStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);
const isCreating = ref(false);
const deletingProjectId = ref(null);
const formError = ref("");
const form = ref({ name: "" });
const workspaceId = computed(() => route.params.workspaceId);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value));

const fetchProjects = async () => {
  //   const workspaceId = route.params.workspaceId;
  if (!workspaceId.value) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchProjects(workspaceId.value);
  } catch (error) {
    errorMessage.value = "Failed to load projects.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  form.value = { name: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const createProject = async () => {
  if (!form.value.name) {
    formError.value = "프로젝트 이름을 입력해주세요.";
    return;
  }

  if (!workspaceId.value) {
    formError.value = "워크스페이스가 선택되지 않았습니다.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await workspaceStore.createProject(workspaceId.value, form.value.name);
    await fetchProjects();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "프로젝트 생성에 실패했습니다.";
  } finally {
    isCreating.value = false;
  }
};

const deleteProject = async (projectId) => {
  if (!projectId) return;
  const confirmed = window.confirm("프로젝트를 삭제할까요?");
  if (!confirmed) return;

  deletingProjectId.value = projectId;
  errorMessage.value = "";

  try {
    await api.delete(`/project/${projectId}`);
    await fetchProjects();
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "프로젝트 삭제에 실패했습니다.";
  } finally {
    deletingProjectId.value = null;
  }
};

onMounted(fetchProjects);
watch(() => route.params.workspaceId, fetchProjects);
</script>
