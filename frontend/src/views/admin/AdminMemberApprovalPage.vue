<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>Member Approvals</h1>
        <p class="subtitle">퍼블릭 사이트에서 신청된 회원가입을 승인하거나 거절합니다.</p>
      </div>
      <div class="actions">
        <input
          v-model.trim="searchKeyword"
          class="wire-input"
          type="text"
          placeholder="이름 / 이메일 검색"
          @keyup.enter="fetchPendingSignups({ page: 1 })"
        />
        <button type="button" class="wire-button" :disabled="isLoading" @click="fetchPendingSignups({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </header>

    <section class="wire-card">
      <p v-if="loadError" class="status error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="pendingSignups"
        :pagination="pagination"
        empty-text="승인 대기 중인 회원가입이 없습니다."
        min-width="980px"
        @page-change="onPageChange"
      />
    </section>

    <section v-if="actionMessage || actionError" class="wire-card wire-card--notice">
      <p v-if="actionError" class="status error">{{ actionError }}</p>
      <p v-if="actionMessage" class="status ok">{{ actionMessage }}</p>
    </section>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";

const pendingSignups = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const searchKeyword = ref("");
const isLoading = ref(false);
const loadError = ref("");
const actionMessage = ref("");
const actionError = ref("");

const tableHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "이름", key: "name", align: "left" },
  { text: "이메일", key: "email", align: "left" },
  { text: "신청일", key: "created_at", align: "left" },
  {
    text: "승인",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "wire-button wire-button--sm",
          onClick: () => updateSignupStatus(row.id, "APPROVE"),
        },
        "승인"
      ),
  },
  {
    text: "거절",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "wire-button wire-button--sm wire-button--ghost",
          onClick: () => updateSignupStatus(row.id, "REJECT"),
        },
        "거절"
      ),
  },
]);

const fetchPendingSignups = async ({ page = pagination.value.page } = {}) => {
  isLoading.value = true;
  loadError.value = "";

  try {
    const res = await api.get("/members/admin/signups", {
      params: {
        q: searchKeyword.value || undefined,
        page,
        pageSize: pagination.value.pageSize,
      },
    });

    pendingSignups.value = Array.isArray(res.data?.items) ? res.data.items : [];
    const serverPagination = res.data?.pagination || {};
    pagination.value = {
      page: Number(serverPagination.page) || page,
      pageSize: Number(serverPagination.pageSize) || pagination.value.pageSize,
      total: Number(serverPagination.total) || pendingSignups.value.length,
    };
  } catch (error) {
    pendingSignups.value = [];
    loadError.value = error?.response?.data?.message || "승인 대기 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const updateSignupStatus = async (memberId, action) => {
  actionError.value = "";
  actionMessage.value = "";

  try {
    const res = await api.patch(`/members/admin/signups/${memberId}`, { action });
    actionMessage.value = res.data?.message || "처리가 완료되었습니다.";
    await fetchPendingSignups({ page: pagination.value.page });
  } catch (error) {
    actionError.value = error?.response?.data?.message || "처리에 실패했습니다.";
  }
};

const onPageChange = (payload) => {
  fetchPendingSignups(payload);
};

onMounted(() => {
  fetchPendingSignups({ page: 1 });
});
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 14px;
}

.wire-card--notice {
  padding: 12px 14px;
}

.wire-input {
  min-width: 240px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-page-bg);
  padding: 9px 12px;
  color: var(--color-text);
}

.wire-button {
  border: 1px solid var(--color-text);
  border-radius: 8px;
  background: var(--color-page-bg);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}

.wire-button--sm {
  padding: 6px 10px;
  font-size: 13px;
}

.wire-button--ghost {
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.status {
  margin: 0 0 12px;
}

.status.error {
  color: #c2410c;
}

.status.ok {
  color: #15803d;
}

@media (max-width: 960px) {
  .admin-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .actions {
    width: 100%;
  }

  .wire-input {
    min-width: 0;
    flex: 1 1 220px;
  }
}
</style>
