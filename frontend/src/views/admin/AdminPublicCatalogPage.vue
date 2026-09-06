<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>공개 카탈로그 검수</h1>
        <p class="admin-page__subtitle">
          퍼블릭 `/open-projects`에 노출된 워크스페이스·프로젝트를 내리고, 연쇄 공개를 확인합니다.
        </p>
      </div>
      <a class="admin-link" href="/open-projects" target="_blank" rel="noreferrer">카탈로그 미리보기</a>
    </header>

    <p v-if="actionMessage" class="admin-status admin-status--ok">{{ actionMessage }}</p>
    <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>

    <section class="admin-card">
      <h2>공개 워크스페이스</h2>
      <p class="admin-page__subtitle">워크스페이스를 내리면 하위 프로젝트도 함께 비공개됩니다.</p>
      <DataTable
        :headers="workspaceHeaders"
        :data="workspaces"
        :pagination="workspacePagination"
        empty-text="공개 워크스페이스가 없습니다."
        min-width="880px"
        @page-change="onWorkspacePageChange"
      />
    </section>

    <section class="admin-card">
      <h2>공개 프로젝트</h2>
      <DataTable
        :headers="projectHeaders"
        :data="projects"
        :pagination="projectPagination"
        empty-text="공개 프로젝트가 없습니다."
        min-width="880px"
        @page-change="onProjectPageChange"
      />
    </section>

    <ConfirmDeleteModal
      :open="Boolean(pendingUnpublish)"
      :title="unpublishTitle"
      :message="unpublishMessage"
      :warning-message="unpublishWarning"
      confirm-label="비공개"
      deleting-label="처리 중..."
      cancel-label="취소"
      @close="pendingUnpublish = null"
      @confirm="confirmUnpublish"
    />
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";

const workspaces = ref([]);
const projects = ref([]);
const workspacePagination = ref({ page: 1, pageSize: 10, total: 0 });
const projectPagination = ref({ page: 1, pageSize: 10, total: 0 });
const loadError = ref("");
const actionMessage = ref("");
const pendingUnpublish = ref(null);

const unpublishTitle = computed(() =>
  pendingUnpublish.value?.type === "workspace" ? "워크스페이스 강제 비공개" : "프로젝트 강제 비공개"
);
const unpublishMessage = computed(() =>
  pendingUnpublish.value
    ? `"${pendingUnpublish.value.name}"을(를) 공개 카탈로그에서 내립니다.`
    : ""
);
const unpublishWarning = computed(() =>
  pendingUnpublish.value?.type === "workspace"
    ? "하위 프로젝트도 함께 비공개됩니다."
    : "워크스페이스가 공개여도 이 프로젝트만 내립니다."
);

const workspaceHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  { text: "소유자", key: "owner_name", align: "left" },
  { text: "멤버", key: "member_count", align: "right" },
  { text: "프로젝트", key: "project_count", align: "right" },
  {
    text: "상세",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        RouterLink,
        { class: "admin-link", to: { name: "AdminWorkspaceDetail", params: { workspaceId: row.id } } },
        () => "보기"
      ),
  },
  {
    text: "조치",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "admin-button admin-button--sm admin-button--danger",
          onClick: () => {
            pendingUnpublish.value = { type: "workspace", id: row.id, name: row.name };
          },
        },
        "내리기"
      ),
  },
]);

const projectHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  { text: "워크스페이스", key: "workspace_name", align: "left" },
  { text: "멤버", key: "member_count", align: "right" },
  {
    text: "상세",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        RouterLink,
        { class: "admin-link", to: { name: "AdminProjectDetail", params: { projectId: row.id } } },
        () => "보기"
      ),
  },
  {
    text: "조치",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "admin-button admin-button--sm admin-button--danger",
          onClick: () => {
            pendingUnpublish.value = { type: "project", id: row.id, name: row.name };
          },
        },
        "내리기"
      ),
  },
]);

const applyPagination = (target, payload, fallbackPage) => {
  const serverPagination = payload || {};
  target.value = {
    page: Number(serverPagination.page) || fallbackPage,
    pageSize: Number(serverPagination.pageSize) || target.value.pageSize,
    total: Number(serverPagination.total) || 0,
  };
};

const fetchWorkspaces = async ({ page = workspacePagination.value.page } = {}) => {
  const res = await api.get("/admin/workspaces", {
    params: { isPublic: true, page, pageSize: workspacePagination.value.pageSize },
  });
  workspaces.value = Array.isArray(res.data?.items) ? res.data.items : [];
  applyPagination(workspacePagination, res.data?.pagination, page);
};

const fetchProjects = async ({ page = projectPagination.value.page } = {}) => {
  const res = await api.get("/admin/projects", {
    params: { isPublic: true, page, pageSize: projectPagination.value.pageSize },
  });
  projects.value = Array.isArray(res.data?.items) ? res.data.items : [];
  applyPagination(projectPagination, res.data?.pagination, page);
};

const fetchCatalog = async () => {
  loadError.value = "";
  try {
    await Promise.all([fetchWorkspaces({ page: 1 }), fetchProjects({ page: 1 })]);
  } catch (error) {
    loadError.value = error?.response?.data?.message || "공개 카탈로그를 불러오지 못했습니다.";
  }
};

const onWorkspacePageChange = (payload) => fetchWorkspaces(payload);
const onProjectPageChange = (payload) => fetchProjects(payload);

const confirmUnpublish = async () => {
  if (!pendingUnpublish.value) return;
  loadError.value = "";
  actionMessage.value = "";
  try {
    if (pendingUnpublish.value.type === "workspace") {
      await api.patch(`/admin/workspaces/${pendingUnpublish.value.id}`, { is_public: false });
    } else {
      await api.patch(`/admin/projects/${pendingUnpublish.value.id}`, { is_public: false });
    }
    actionMessage.value = "공개 카탈로그에서 내렸습니다.";
    pendingUnpublish.value = null;
    await fetchCatalog();
  } catch (error) {
    loadError.value = error?.response?.data?.message || "비공개 처리에 실패했습니다.";
  }
};

onMounted(fetchCatalog);
</script>
