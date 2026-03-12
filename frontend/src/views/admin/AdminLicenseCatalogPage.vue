<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>License Management</h1>
        <p class="subtitle">판매 중인 라이선스와 누적 판매량을 관리합니다.</p>
      </div>
      <button type="button" class="wire-button" @click="isCreateModalOpen = true">
        라이선스 추가
      </button>
    </header>

    <section class="wire-card">
      <h2>라이선스 목록</h2>
      <p v-if="isLoading" class="status">라이선스 목록을 불러오는 중...</p>
      <p v-else-if="loadError" class="status error">{{ loadError }}</p>
      <DataTable
        v-else
        :headers="licenseHeaders"
        :data="licenses"
        :pagination="pagination"
        empty-text="등록된 라이선스가 없습니다."
        min-width="960px"
        @page-change="onLicensePageChange"
      />
    </section>

    <BaseModal
      :open="isCreateModalOpen"
      title="신규 라이선스 추가"
      max-width="760px"
      @close="closeCreateModal"
    >
      <form class="create-form" @submit.prevent="addLicenseType">
        <label>
          표시 이름 (fallback)
          <input
            v-model.trim="createForm.name"
            type="text"
            placeholder="예: Project Slot Monthly"
          />
        </label>
        <label>
          i18n 키 (선택)
          <input
            v-model.trim="createForm.nameI18nKey"
            type="text"
            placeholder="예: license.project.monthly"
          />
        </label>
        <label>
          리소스 타입
          <select v-model="createForm.targetResource">
            <option value="WORKSPACE">WORKSPACE</option>
            <option value="PROJECT">PROJECT</option>
            <option value="WORKSPACE_MEMBER">WORKSPACE_MEMBER</option>
          </select>
        </label>
        <label>
          과금 주기
          <select v-model="createForm.billingCycle">
            <option value="MONTHLY">MONTHLY</option>
            <option value="YEARLY">YEARLY</option>
            <option value="LIFETIME">LIFETIME</option>
          </select>
        </label>
        <label>
          가격
          <input v-model.number="createForm.price" type="number" min="0" step="100" />
        </label>
        <label>
          통화
          <select v-model="createForm.currency">
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </form>
      <p v-if="formError" class="status error">{{ formError }}</p>
      <div class="modal-actions">
        <button
          type="button"
          class="wire-button wire-button--secondary"
          :disabled="isCreating"
          @click="closeCreateModal"
        >
          취소
        </button>
        <button type="button" class="wire-button" :disabled="isCreating" @click="addLicenseType">
          {{ isCreating ? "추가 중..." : "추가" }}
        </button>
      </div>
    </BaseModal>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import BaseModal from "../../components/BaseModal.vue";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";

const licenses = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });

const createForm = ref({
  name: "",
  nameI18nKey: "",
  targetResource: "PROJECT",
  billingCycle: "MONTHLY",
  price: 0,
  currency: "KRW",
});
const isCreateModalOpen = ref(false);

const resourceDetailRoute = {
  WORKSPACE: "AdminLicenseWorkspaceSlotDetail",
  PROJECT: "AdminLicenseProjectSlotDetail",
  WORKSPACE_MEMBER: "AdminLicenseWorkspaceMemberSlotDetail",
};

const formError = ref("");
const isLoading = ref(false);
const loadError = ref("");
const isCreating = ref(false);
const updatingLicenseId = ref(null);

const fetchLicenses = async ({ page = pagination.value.page, pageSize = pagination.value.pageSize } = {}) => {
  isLoading.value = true;
  loadError.value = "";
  pagination.value = {
    ...pagination.value,
    page,
    pageSize,
  };

  try {
    const res = await api.get("/licenses", {
      params: {
        page,
        pageSize,
      },
    });

    if (Array.isArray(res.data)) {
      licenses.value = res.data;
      pagination.value = {
        ...pagination.value,
        page,
        pageSize,
        total: res.data.length,
      };
      return;
    }

    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    const serverPagination = res.data?.pagination || {};

    const nextPage = Number(serverPagination.page);
    const nextPageSize = Number(serverPagination.pageSize);
    const nextTotal = Number(serverPagination.total);

    licenses.value = items;
    pagination.value = {
      ...pagination.value,
      page: Number.isInteger(nextPage) && nextPage > 0 ? nextPage : page,
      pageSize: Number.isInteger(nextPageSize) && nextPageSize > 0 ? nextPageSize : pageSize,
      total: Number.isInteger(nextTotal) && nextTotal >= 0 ? nextTotal : items.length,
    };
  } catch (error) {
    loadError.value =
      error?.response?.data?.message || "라이선스 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
  } finally {
    isLoading.value = false;
  }
};

const formatPrice = (value, currency) => {
  const locale = currency === "KRW" ? "ko-KR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value || 0);
};

const licenseHeaders = computed(() => [
  {
    text: "이름",
    key: "display_name",
    align: "left",
    render: (_value, row) => row.name || row.display_name || row.name_i18n_key || "-",
  },
  {
    text: "리소스",
    key: "target_resource",
    align: "left",
  },
  {
    text: "주기",
    key: "billing_cycle",
    align: "left",
  },
  {
    text: "가격",
    key: "price",
    align: "right",
    render: (value, row) => formatPrice(value, row.currency),
  },
  {
    text: "판매 수량",
    key: "sold_quantity",
    align: "right",
    render: (value) => String(Number(value || 0)),
  },
  {
    text: "상태",
    key: "is_active",
    align: "left",
    render: (value) =>
      h("span", { class: ["status-pill", value ? "ok" : "muted"] }, value ? "판매중" : "중단"),
  },
  {
    text: "관리",
    key: "id",
    align: "left",
    render: (_value, row) =>
      h(
        "button",
        {
          type: "button",
          class: "wire-button wire-button--sm",
          disabled: updatingLicenseId.value === row.id,
          onClick: () => toggleLicenseActive(row),
        },
        updatingLicenseId.value === row.id ? "처리 중..." : row.is_active ? "중단" : "재개"
      ),
  },
  {
    text: "상세",
    key: "target_resource",
    align: "left",
    render: (_value, row) => {
      const routeName = resourceDetailRoute[row.target_resource];
      if (!routeName) return h("span", { class: "status muted" }, "-");

      return h(
        RouterLink,
        {
          class: "link",
          to: {
            name: routeName,
            query: { licenseId: row.id },
          },
        },
        () => "보기"
      );
    },
  },
]);

const addLicenseType = async () => {
  formError.value = "";
  if (!createForm.value.name && !createForm.value.nameI18nKey) {
    formError.value = "표시 이름 또는 i18n 키 중 하나를 입력하세요.";
    return;
  }

  isCreating.value = true;
  try {
    await api.post("/licenses", {
      name: createForm.value.name || null,
      name_i18n_key: createForm.value.nameI18nKey || null,
      target_resource: createForm.value.targetResource,
      billing_cycle: createForm.value.billingCycle,
      price: Number(createForm.value.price || 0),
      currency: createForm.value.currency,
    });

    createForm.value = {
      name: "",
      nameI18nKey: "",
      targetResource: "PROJECT",
      billingCycle: "MONTHLY",
      price: 0,
      currency: "KRW",
    };

    isCreateModalOpen.value = false;
    await fetchLicenses({ page: 1, pageSize: pagination.value.pageSize });
  } catch (error) {
    formError.value = error?.response?.data?.message || "라이선스 추가에 실패했습니다.";
  } finally {
    isCreating.value = false;
  }
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
  formError.value = "";
};

const toggleLicenseActive = async (license) => {
  updatingLicenseId.value = license.id;
  loadError.value = "";

  try {
    await api.patch(`/licenses/${license.id}`, {
      is_active: !Boolean(license.is_active),
    });
    await fetchLicenses();
  } catch (error) {
    loadError.value =
      error?.response?.data?.message || "라이선스 상태 변경에 실패했습니다. 잠시 후 다시 시도하세요.";
  } finally {
    updatingLicenseId.value = null;
  }
};

const onLicensePageChange = async ({ page, pageSize }) => {
  await fetchLicenses({ page, pageSize });
};

onMounted(fetchLicenses);
</script>

<style scoped>
.admin-page {
  display: grid;
  gap: 16px;
}

.admin-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 6px 0 0;
  color: var(--color-text-muted);
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-page-bg);
  padding: 14px;
  display: grid;
  gap: 12px;
}

.wire-card h2 {
  margin: 0;
  font-size: 1rem;
}

.create-form {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.create-form label {
  display: grid;
  gap: 4px;
  font-size: 0.875rem;
}

.create-form input,
.create-form select {
  width: 100%;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  background: var(--color-input-bg);
  color: var(--color-text);
  padding: 6px 10px;
}

.wire-button {
  border: 1px solid var(--color-text);
  border-radius: 8px;
  background: var(--color-page-bg);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  min-height: 36px;
}

.wire-button--secondary {
  opacity: 0.9;
}

.wire-button--sm {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 0.8rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.status-pill.ok {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
}

.status-pill.muted {
  color: var(--color-text-muted);
}

.link {
  color: var(--color-link, var(--color-text));
  text-decoration: underline;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1200px) {
  .create-form {
    grid-template-columns: 1fr;
  }
}
</style>
