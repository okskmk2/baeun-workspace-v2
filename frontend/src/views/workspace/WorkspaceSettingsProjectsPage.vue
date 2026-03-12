<template>
  <section class="workspace-settings-projects">
    <hgroup>
      <div>
        <h1>프로젝트 관리</h1>
        <p class="subtitle">워크스페이스 프로젝트를 생성하고 멤버를 관리합니다.</p>
      </div>
      <button
        type="button"
        class="btn"
        :disabled="!canManageWorkspace"
        @click="openCreateModal"
      >
        프로젝트 생성
      </button>
    </hgroup>

    <p v-if="!canManageWorkspace" class="status muted">
      OWNER 또는 ADMIN만 프로젝트 생성과 멤버 설정을 할 수 있습니다.
    </p>

    <p v-if="isLoading" class="status">프로젝트 정보를 불러오는 중...</p>
    <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

    <section v-else class="card">
      <div class="card__header">
        <h2>프로젝트 목록</h2>
        <CountChip :count="projects.length" />
      </div>

      <p v-if="!projects.length" class="status muted">등록된 프로젝트가 없습니다.</p>

      <ul v-else class="project-list">
        <li v-for="project in projects" :key="project.id" class="project-item">
          <div class="project-info">
            <p class="project-name">{{ project.name || `Project ${project.id}` }}</p>
            <p class="project-summary">{{ project.summary || "프로젝트 설명이 없습니다." }}</p>
          </div>

          <div class="project-actions">
            <router-link class="btn btn--sm btn--secondary" :to="`/project/${project.id}`">
              프로젝트 이동
            </router-link>
            <button
              type="button"
              class="btn btn--sm"
              :disabled="!canManageWorkspace || isLoadingMemberModal(project.id)"
              @click="openMemberModal(project)"
            >
              {{ isLoadingMemberModal(project.id) ? "불러오는 중..." : "멤버 설정" }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <p v-if="memberModalError" class="status error">{{ memberModalError }}</p>

    <CreateProjectModal
      :open="isCreateModalOpen"
      :workspace-id="workspaceId || ''"
      @close="closeCreateModal"
      @created="onProjectCreated"
    />

    <AddProjectMemberModal
      :open="isMemberModalOpen"
      :project-id="selectedProjectId"
      :workspace-members="workspaceMembers"
      :project-members="selectedProjectMembers"
      @close="closeMemberModal"
      @invited="onProjectMemberInvited"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import CountChip from "../../components/CountChip.vue";
import AddProjectMemberModal from "../../components/modals/AddProjectMemberModal.vue";
import CreateProjectModal from "../../components/modals/CreateProjectModal.vue";
import { addToast } from "../../lib/toast";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const projectMemberStore = useProjectMemberStore();

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value) || []);

const workspaceRoleUpper = computed(() => String(workspace.value?.role_name || "").toUpperCase());
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));

const isLoading = ref(false);
const errorMessage = ref("");
const memberModalError = ref("");

const isCreateModalOpen = ref(false);
const isMemberModalOpen = ref(false);
const isOpeningMemberModal = ref(false);
const selectedProject = ref(null);
const workspaceMembers = ref([]);

const selectedProjectId = computed(() => String(selectedProject.value?.id || ""));
const selectedProjectMembers = computed(() => {
  if (!selectedProjectId.value) return [];
  return projectMemberStore.getProjectMembers(selectedProjectId.value);
});

const fetchData = async () => {
  if (!workspaceId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([
      workspaceStore.fetchWorkspace(workspaceId.value),
      workspaceStore.fetchProjects(workspaceId.value),
    ]);
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "프로젝트 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const openCreateModal = () => {
  if (!canManageWorkspace.value) return;
  isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};

const onProjectCreated = async () => {
  try {
    await workspaceStore.fetchProjects(workspaceId.value);
    addToast({ message: "프로젝트를 생성했습니다.", type: "success" });
  } catch (error) {
    addToast({ message: "프로젝트 목록 갱신에 실패했습니다.", type: "error" });
  }
};

const isLoadingMemberModal = (projectId) => {
  return isOpeningMemberModal.value && selectedProjectId.value === String(projectId);
};

const openMemberModal = async (project) => {
  if (!canManageWorkspace.value) return;
  if (!project?.id) return;

  selectedProject.value = project;
  isOpeningMemberModal.value = true;
  memberModalError.value = "";

  try {
    const [members] = await Promise.all([
      workspaceStore.fetchWorkspaceMembers(workspaceId.value),
      projectMemberStore.fetchProjectMembers(project.id, { force: true }),
    ]);
    workspaceMembers.value = members;
    isMemberModalOpen.value = true;
  } catch (error) {
    memberModalError.value =
      error?.response?.data?.message || "프로젝트 멤버 정보를 불러오지 못했습니다.";
    addToast({ message: memberModalError.value, type: "error" });
  } finally {
    isOpeningMemberModal.value = false;
  }
};

const closeMemberModal = () => {
  isMemberModalOpen.value = false;
};

const onProjectMemberInvited = async () => {
  if (!selectedProjectId.value) return;
  try {
    await projectMemberStore.fetchProjectMembers(selectedProjectId.value, { force: true });
    addToast({ message: "프로젝트 멤버를 추가했습니다.", type: "success" });
  } catch (error) {
    addToast({ message: "프로젝트 멤버 목록 갱신에 실패했습니다.", type: "error" });
  }
};

onMounted(fetchData);
watch(() => route.params.workspaceId, fetchData);
</script>

<style scoped>
.workspace-settings-projects {
  display: grid;
  gap: 16px;
}

hgroup {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.card__header {
  display: flex;
  align-items: center;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.muted {
  color: var(--color-text-muted);
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.project-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 12px;
}

.project-info {
  min-width: 0;
}

.project-name {
  margin: 0;
  font-weight: 600;
}

.project-summary {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 840px) {
  hgroup {
    flex-direction: column;
    align-items: flex-start;
  }

  .project-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .project-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>