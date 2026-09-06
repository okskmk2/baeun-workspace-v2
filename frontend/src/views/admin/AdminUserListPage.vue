<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>회원</h1>
        <p class="admin-page__subtitle">계정 상태와 소속 워크스페이스를 조회합니다.</p>
      </div>
      <div class="admin-toolbar">
        <input
          v-model.trim="searchKeyword"
          class="admin-input"
          type="text"
          placeholder="이름 / 이메일"
          @keyup.enter="fetchUsers({ page: 1 })"
        />
        <select v-model="approvalStatus" class="admin-input" @change="fetchUsers({ page: 1 })">
          <option value="">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="APPROVED">승인</option>
          <option value="REJECTED">거절</option>
        </select>
        <button type="button" class="admin-button" :disabled="isLoading" @click="fetchUsers({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </header>

    <section class="admin-card">
      <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="users"
        :pagination="pagination"
        empty-text="회원이 없습니다."
        min-width="960px"
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
import { approvalLabel, approvalTone, formatAdminDateTime } from "../../lib/adminFormat";

const users = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const searchKeyword = ref("");
const approvalStatus = ref("");
const isLoading = ref(false);
const loadError = ref("");

const tableHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  { text: "이메일", key: "email", align: "left" },
  {
    text: "상태",
    key: "approval_status",
    align: "left",
    render: (value) => h("span", { class: ["admin-pill", `admin-pill--${approvalTone(value)}`] }, approvalLabel(value)),
  },
  { text: "역할", key: "role_name", align: "left" },
  { text: "워크스페이스", key: "workspace_count", align: "right" },
  { text: "활성 슬롯", key: "active_license_quantity", align: "right" },
  {
    text: "가입일",
    key: "created_at",
    align: "left",
    render: (value) => formatAdminDateTime(value),
  },
  {
    text: "상세",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(RouterLink, { class: "admin-link", to: { name: "AdminUserDetail", params: { memberId: row.id } } }, () => "보기"),
  },
]);

const fetchUsers = async ({ page = pagination.value.page } = {}) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await api.get("/admin/users", {
      params: {
        q: searchKeyword.value || undefined,
        approvalStatus: approvalStatus.value || undefined,
        page,
        pageSize: pagination.value.pageSize,
      },
    });
    users.value = Array.isArray(res.data?.items) ? res.data.items : [];
    const serverPagination = res.data?.pagination || {};
    pagination.value = {
      page: Number(serverPagination.page) || page,
      pageSize: Number(serverPagination.pageSize) || pagination.value.pageSize,
      total: Number(serverPagination.total) || users.value.length,
    };
  } catch (error) {
    users.value = [];
    loadError.value = error?.response?.data?.message || "회원 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const onPageChange = (payload) => {
  fetchUsers(payload);
};

onMounted(() => {
  fetchUsers({ page: 1 });
});
</script>
