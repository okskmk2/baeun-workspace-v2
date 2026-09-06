<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>결제</h1>
        <p class="admin-page__subtitle">Polar 결제와 수동 지급 내역을 모니터링합니다.</p>
      </div>
      <div class="admin-toolbar">
        <input
          v-model.trim="searchKeyword"
          class="admin-input"
          type="text"
          placeholder="이름 / 이메일 / 주문 ID"
          @keyup.enter="fetchPayments({ page: 1 })"
        />
        <select v-model="statusFilter" class="admin-input" @change="fetchPayments({ page: 1 })">
          <option value="">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="SUCCESS">완료</option>
          <option value="FAILED">실패</option>
          <option value="CANCELED">취소</option>
          <option value="REFUNDED">환불</option>
        </select>
        <button type="button" class="admin-button" :disabled="isLoading" @click="fetchPayments({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </header>

    <section class="admin-card">
      <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="payments"
        :pagination="pagination"
        empty-text="결제 내역이 없습니다."
        min-width="1080px"
        @page-change="onPageChange"
      />
    </section>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";
import { formatAdminDateTime, formatAdminMoney } from "../../lib/adminFormat";

const payments = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const searchKeyword = ref("");
const statusFilter = ref("");
const isLoading = ref(false);
const loadError = ref("");
const refundingId = ref(null);

const statusLabel = (status) => {
  const map = {
    PENDING: "대기",
    SUCCESS: "완료",
    FAILED: "실패",
    CANCELED: "취소",
    REFUNDED: "환불",
  };
  return map[String(status || "").toUpperCase()] || status || "-";
};

const refundPayment = async (row) => {
  if (!row?.id || String(row.status).toUpperCase() !== "SUCCESS") return;
  if (!window.confirm(`결제 #${row.id}를 환불할까요?`)) return;
  refundingId.value = row.id;
  try {
    await api.post(`/admin/payments/${row.id}/refund`);
    await fetchPayments({ page: pagination.value.page });
  } catch (error) {
    loadError.value = error?.response?.data?.message || "환불에 실패했습니다.";
  } finally {
    refundingId.value = null;
  }
};

const tableHeaders = computed(() => [
  { text: "ID", key: "id", align: "right" },
  { text: "회원", key: "member_email", align: "left" },
  { text: "제공자", key: "provider", align: "left" },
  {
    text: "상태",
    key: "status",
    align: "left",
    render: (value) => statusLabel(value),
  },
  {
    text: "금액",
    key: "total_amount",
    align: "right",
    render: (value, row) => formatAdminMoney(value, row.currency || "USD"),
  },
  {
    text: "라이선스",
    key: "licenses",
    align: "left",
    render: (value) =>
      Array.isArray(value) && value.length
        ? value.map((item) => `${item.license_name || item.target_resource} × ${item.quantity}`).join(", ")
        : "-",
  },
  {
    text: "일시",
    key: "created_at",
    align: "left",
    render: (value) => formatAdminDateTime(value),
  },
  {
    text: "환불",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "admin-button",
          disabled: String(row.status).toUpperCase() !== "SUCCESS" || refundingId.value === row.id,
          onClick: () => refundPayment(row),
        },
        refundingId.value === row.id ? "처리 중..." : "환불"
      ),
  },
]);

const fetchPayments = async ({ page } = {}) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const response = await api.get("/admin/payments", {
      params: {
        page: page || pagination.value.page,
        pageSize: pagination.value.pageSize,
        q: searchKeyword.value || undefined,
        status: statusFilter.value || undefined,
      },
    });
    payments.value = response.data?.items || [];
    pagination.value = {
      page: response.data?.pagination?.page || 1,
      pageSize: response.data?.pagination?.pageSize || 10,
      total: response.data?.pagination?.total || 0,
    };
  } catch (error) {
    loadError.value = error?.response?.data?.message || "결제 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const onPageChange = (payload) => fetchPayments(payload);

onMounted(() => fetchPayments({ page: 1 }));
</script>
