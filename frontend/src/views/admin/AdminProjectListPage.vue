<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>프로젝트</h1>
        <p class="admin-page__subtitle">크로스-테넌트 프로젝트 조회입니다. 위키·칸반 콘텐츠는 열지 않습니다.</p>
      </div>
      <div class="admin-toolbar">
        <input
          v-model.trim="searchKeyword"
          class="admin-input"
          type="text"
          placeholder="프로젝트 / 워크스페이스"
          @keyup.enter="fetchProjects({ page: 1 })"
        />
        <select v-model="isPublic" class="admin-input" @change="fetchProjects({ page: 1 })">
          <option value="">공개 여부 전체</option>
          <option value="true">공개</option>
          <option value="false">비공개</option>
        </select>
        <button type="button" class="admin-button" :disabled="isLoading" @click="fetchProjects({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </header>

    <section class="admin-card">
      <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="projects"
        :pagination="pagination"
        empty-text="프로젝트가 없습니다."
        min-width="1080px"
        @page-change="onPageChange"
      />
    </section>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";
import { formatAdminDateTime } from "../../lib/adminFormat";

const projects = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const searchKeyword = ref("");
const isPublic = ref("");
const isLoading = ref(false);
const loadError = ref("");

const tableHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  {
    text: "워크스페이스",
    key: "workspace_name",
    align: "left",
    render: (value, row) =>
      h(
        RouterLink,
        { class: "admin-link", to: { name: "AdminWorkspaceDetail", params: { workspaceId: row.workspace_id } } },
        () => value || "-"
      ),
  },
  { text: "멤버", key: "member_count", align: "right" },
  {
    text: "공개",
    key: "is_public",
    align: "left",
    render: (value) =>
      h("span", { class: ["admin-pill", value ? "admin-pill--warn" : "admin-pill--muted"] }, value ? "공개" : "비공개"),
  },
  {
    text: "생성일",
    key: "created_at",
    align: "left",
    render: (value) => formatAdminDateTime(value),
  },
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
]);

const fetchProjects = async ({ page = pagination.value.page } = {}) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await api.get("/admin/projects", {
      params: {
        q: searchKeyword.value || undefined,
        isPublic: isPublic.value || undefined,
        page,
        pageSize: pagination.value.pageSize,
      },
    });
    projects.value = Array.isArray(res.data?.items) ? res.data.items : [];
    const serverPagination = res.data?.pagination || {};
    pagination.value = {
      page: Number(serverPagination.page) || page,
      pageSize: Number(serverPagination.pageSize) || pagination.value.pageSize,
      total: Number(serverPagination.total) || projects.value.length,
    };
  } catch (error) {
    projects.value = [];
    loadError.value = error?.response?.data?.message || "프로젝트 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const onPageChange = (payload) => {
  fetchProjects(payload);
};

onMounted(() => {
  fetchProjects({ page: 1 });
});
</script>
