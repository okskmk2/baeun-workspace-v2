<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>워크스페이스</h1>
        <p class="admin-page__subtitle">조직 단위 테넌트를 조회합니다. 멤버 초대는 워크스페이스 설정에서 합니다.</p>
      </div>
      <div class="admin-toolbar">
        <input
          v-model.trim="searchKeyword"
          class="admin-input"
          type="text"
          placeholder="이름 / 소유자"
          @keyup.enter="fetchWorkspaces({ page: 1 })"
        />
        <select v-model="isPublic" class="admin-input" @change="fetchWorkspaces({ page: 1 })">
          <option value="">공개 여부 전체</option>
          <option value="true">공개</option>
          <option value="false">비공개</option>
        </select>
        <button type="button" class="admin-button" :disabled="isLoading" @click="fetchWorkspaces({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </header>

    <section class="admin-card">
      <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="workspaces"
        :pagination="pagination"
        empty-text="워크스페이스가 없습니다."
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

const workspaces = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const searchKeyword = ref("");
const isPublic = ref("");
const isLoading = ref(false);
const loadError = ref("");

const tableHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  { text: "소유자", key: "owner_name", align: "left" },
  { text: "멤버", key: "member_count", align: "right" },
  { text: "프로젝트", key: "project_count", align: "right" },
  {
    text: "공개",
    key: "is_public",
    align: "left",
    render: (value) =>
      h("span", { class: ["admin-pill", value ? "admin-pill--warn" : "admin-pill--muted"] }, value ? "공개" : "비공개"),
  },
  {
    text: "기본",
    key: "is_default",
    align: "left",
    render: (value) => (value ? "기본" : "-"),
  },
  { text: "활성 슬롯", key: "active_license_quantity", align: "right" },
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
        { class: "admin-link", to: { name: "AdminWorkspaceDetail", params: { workspaceId: row.id } } },
        () => "보기"
      ),
  },
]);

const fetchWorkspaces = async ({ page = pagination.value.page } = {}) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await api.get("/admin/workspaces", {
      params: {
        q: searchKeyword.value || undefined,
        isPublic: isPublic.value || undefined,
        page,
        pageSize: pagination.value.pageSize,
      },
    });
    workspaces.value = Array.isArray(res.data?.items) ? res.data.items : [];
    const serverPagination = res.data?.pagination || {};
    pagination.value = {
      page: Number(serverPagination.page) || page,
      pageSize: Number(serverPagination.pageSize) || pagination.value.pageSize,
      total: Number(serverPagination.total) || workspaces.value.length,
    };
  } catch (error) {
    workspaces.value = [];
    loadError.value = error?.response?.data?.message || "워크스페이스 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const onPageChange = (payload) => {
  fetchWorkspaces(payload);
};

onMounted(() => {
  fetchWorkspaces({ page: 1 });
});
</script>
