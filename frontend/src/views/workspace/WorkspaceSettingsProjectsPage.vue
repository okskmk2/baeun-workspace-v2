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
        :disabled="!canManageWorkspace || projectRemaining < 1"
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
        <CountChip :count="projectTotal" />
      </div>

      <DataTable
        :headers="projectHeaders"
        :data="projects"
        :pagination="projectPagination"
        empty-text="등록된 프로젝트가 없습니다."
        min-width="720px"
        @page-change="onProjectPageChange"
      />
    </section>

    <p v-if="memberModalError" class="status error">{{ memberModalError }}</p>

    <p v-if="canManageWorkspace && projectRemaining < 1" class="status error">
      프로젝트 슬롯이 없습니다.
      <router-link :to="projectCartTo">슬롯 구매</router-link>
    </p>

    <CreateProjectModal
      :open="isCreateModalOpen"
      :workspace-id="workspaceId || ''"
      :remaining="projectRemaining"
      :granted="projectGranted"
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
import { computed, h, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import CountChip from "../../components/CountChip.vue";
import DataTable from "../../components/DataTable.vue";
import AddProjectMemberModal from "../../components/modals/AddProjectMemberModal.vue";
import CreateProjectModal from "../../components/modals/CreateProjectModal.vue";
import { addToast } from "../../lib/toast";
import { monthlyCartTo } from "../../lib/slots";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const route = useRoute();
const workspaceStore = useWorkspaceStore();
const projectMemberStore = useProjectMemberStore();

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const projects = computed(() => workspaceStore.getProjects(workspaceId.value, { paginated: true }) || []);
const projectTotal = computed(() => Number(projectPagination.value.total || projects.value.length));

const workspaceRoleUpper = computed(() => String(workspace.value?.role_name || "").toUpperCase());
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));
const projectRemaining = computed(() => Number(workspace.value?.project_slot_remaining ?? 0));
const projectGranted = computed(() => Number(workspace.value?.project_slot_total ?? 0));
const projectCartTo = computed(() => monthlyCartTo("PROJECT", workspaceId.value));

const isLoading = ref(false);
const errorMessage = ref("");
const memberModalError = ref("");
const projectPagination = ref({ page: 1, pageSize: 10, total: 0 });

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

const projectHeaders = computed(() => [
  {
    text: "프로젝트",
    key: "name",
    align: "left",
    render: (value, row) => h("p", { class: "project-name" }, value || `Project ${row.id}`),
  },
  {
    text: "설명",
    key: "summary",
    align: "left",
    render: (value) => h("p", { class: "project-summary" }, value || "프로젝트 설명이 없습니다."),
  },
  {
    text: "관리",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h("div", { class: "project-actions" }, [
        h(
          RouterLink,
          {
            class: "btn btn--sm btn--secondary",
            to: `/project/${row.id}`,
          },
          () => "프로젝트 이동"
        ),
        h(
          "button",
          {
            type: "button",
            class: "btn btn--sm",
            disabled: !canManageWorkspace.value || isLoadingMemberModal(row.id),
            onClick: () => openMemberModal(row),
          },
          isLoadingMemberModal(row.id) ? "불러오는 중..." : "멤버 설정"
        ),
      ]),
  },
]);

const syncPagination = () => {
  const pagination = workspaceStore.getProjectPagination(workspaceId.value);
  if (pagination) {
    projectPagination.value = {
      page: Number(pagination.page) > 0 ? Number(pagination.page) : projectPagination.value.page,
      pageSize:
        Number(pagination.pageSize) > 0
          ? Number(pagination.pageSize)
          : projectPagination.value.pageSize,
      total: Number(pagination.total) >= 0 ? Number(pagination.total) : projects.value.length,
    };
    return;
  }

  projectPagination.value = {
    ...projectPagination.value,
    total: projects.value.length,
  };
};

const fetchData = async () => {
  if (!workspaceId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await Promise.all([
      workspaceStore.fetchWorkspace(workspaceId.value),
      workspaceStore.fetchProjects(workspaceId.value, {
        page: projectPagination.value.page,
        pageSize: projectPagination.value.pageSize,
      }),
    ]);
    syncPagination();
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
    await Promise.all([
      workspaceStore.fetchWorkspace(workspaceId.value),
      workspaceStore.fetchProjects(workspaceId.value, {
        page: projectPagination.value.page,
        pageSize: projectPagination.value.pageSize,
      }),
    ]);
    syncPagination();
    addToast({ message: "프로젝트를 생성했습니다.", type: "success" });
  } catch (error) {
    addToast({ message: "프로젝트 목록 갱신에 실패했습니다.", type: "error" });
  }
};

const onProjectPageChange = async ({ page, pageSize }) => {
  projectPagination.value = {
    ...projectPagination.value,
    page,
    pageSize,
  };

  try {
    await workspaceStore.fetchProjects(workspaceId.value, { page, pageSize });
    syncPagination();
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

.project-name {
  margin: 0;
  font-weight: 600;
}

.project-summary {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.project-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 840px) {
  hgroup {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>