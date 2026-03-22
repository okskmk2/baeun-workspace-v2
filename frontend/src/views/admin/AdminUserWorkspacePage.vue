<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>User & Workspace License Assignment</h1>
        <p class="subtitle">관리자가 사용자/워크스페이스에 라이선스를 수동 지급합니다.</p>
      </div>
      <div class="actions">
        <button
          type="button"
          class="wire-button"
          :class="{ 'wire-button--active': targetType === 'MEMBER' }"
          @click="switchTargetType('MEMBER')"
        >
          사용자 지급
        </button>
        <button
          type="button"
          class="wire-button"
          :class="{ 'wire-button--active': targetType === 'WORKSPACE' }"
          @click="switchTargetType('WORKSPACE')"
        >
          워크스페이스 지급
        </button>
      </div>
    </header>

    <section class="wire-card">
      <h2>대상 검색</h2>
      <div class="wire-row">
        <input
          v-model.trim="searchKeyword"
          class="wire-input wire-input--control"
          type="text"
          placeholder="이름/이메일/워크스페이스명"
          @keyup.enter="fetchTargets({ page: 1 })"
        />
        <select v-model="selectedLicenseId" class="wire-input wire-input--control">
          <option value="">라이선스를 선택하세요</option>
          <option v-for="license in filteredLicenses" :key="license.id" :value="String(license.id)">
            {{ license.display_name || license.name }} ({{ license.billing_cycle }}, 유예 {{ Number(license.grace_period_months || 0) }}개월)
          </option>
        </select>
        <button type="button" class="wire-button" :disabled="isLoading" @click="fetchTargets({ page: 1 })">
          {{ isLoading ? "조회 중..." : "조회" }}
        </button>
      </div>
    </section>

    <section class="wire-card wire-card--tall">
      <h2>{{ targetType === "MEMBER" ? "사용자 목록" : "워크스페이스 목록" }}</h2>
      <p v-if="loadError" class="status error">{{ loadError }}</p>
      <DataTable
        :headers="tableHeaders"
        :data="targets"
        :pagination="pagination"
        empty-text="조회 결과가 없습니다."
        min-width="900px"
        @page-change="onPageChange"
      />
    </section>

    <section class="wire-card">
      <h2>수동 지급</h2>
      <p class="status">
        선택 대상:
        <strong>{{ selectedTargetLabel || "없음" }}</strong>
      </p>

      <div class="assign-grid">
        <label>
          수량
          <input v-model.number="assignForm.quantity" type="number" min="1" class="wire-input wire-input--control" />
        </label>
        <label>
          시작일 (선택)
          <input v-model="assignForm.startDate" type="datetime-local" class="wire-input wire-input--control" />
        </label>
        <label>
          종료일 (선택)
          <input v-model="assignForm.endDate" type="datetime-local" class="wire-input wire-input--control" />
        </label>
      </div>

      <p v-if="assignError" class="status error">{{ assignError }}</p>
      <p v-if="assignMessage" class="status ok">{{ assignMessage }}</p>

      <div class="actions">
        <button type="button" class="wire-button" :disabled="isAssigning || !canAssign" @click="assignLicense">
          {{ isAssigning ? "지급 중..." : "라이선스 지급" }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, h, onMounted, ref } from "vue";
import DataTable from "../../components/DataTable.vue";
import api from "../../lib/axios";

const targetType = ref("MEMBER");
const searchKeyword = ref("");
const selectedLicenseId = ref("");
const selectedTargetId = ref(null);

const licenses = ref([]);
const targets = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });

const isLoading = ref(false);
const loadError = ref("");
const isAssigning = ref(false);
const assignError = ref("");
const assignMessage = ref("");

const assignForm = ref({
  quantity: 1,
  startDate: "",
  endDate: "",
});

const filteredLicenses = computed(() =>
  licenses.value.filter((item) => {
    const resource = String(item.target_resource || "").toUpperCase();
    if (targetType.value === "MEMBER") {
      return resource === "WORKSPACE" && item.is_active;
    }
    return ["PROJECT", "WORKSPACE_MEMBER"].includes(resource) && item.is_active;
  })
);

const selectedTarget = computed(() =>
  targets.value.find((item) => String(item.id) === String(selectedTargetId.value)) || null
);

const selectedTargetLabel = computed(() => {
  if (!selectedTarget.value) return "";
  if (targetType.value === "MEMBER") {
    return `${selectedTarget.value.name || "-"} (${selectedTarget.value.email || "-"})`;
  }
  return `${selectedTarget.value.name || "-"} / owner: ${selectedTarget.value.owner_name || "-"}`;
});

const canAssign = computed(
  () =>
    Boolean(selectedLicenseId.value) &&
    Boolean(selectedTargetId.value) &&
    Number(assignForm.value.quantity || 0) > 0
);

const tableHeaders = computed(() => {
  if (targetType.value === "MEMBER") {
    return [
      { text: "ID", key: "id", align: "right" },
      { text: "이름", key: "name", align: "left" },
      { text: "이메일", key: "email", align: "left" },
      { text: "활성 라이선스", key: "active_license_quantity", align: "right" },
      {
        text: "선택",
        key: "id",
        align: "left",
        render: (_value, row) =>
          h(
            "button",
            {
              type: "button",
              class: "wire-button wire-button--sm",
              onClick: () => {
                selectedTargetId.value = row.id;
                assignMessage.value = "";
                assignError.value = "";
              },
            },
            String(selectedTargetId.value) === String(row.id) ? "선택됨" : "선택"
          ),
      },
    ];
  }

  return [
    { text: "ID", key: "id", align: "right" },
    { text: "워크스페이스", key: "name", align: "left" },
    { text: "Owner", key: "owner_name", align: "left" },
    { text: "멤버 수", key: "member_count", align: "right" },
    { text: "활성 라이선스", key: "active_license_quantity", align: "right" },
    {
      text: "선택",
      key: "id",
      align: "left",
      render: (_value, row) =>
        h(
          "button",
          {
            type: "button",
            class: "wire-button wire-button--sm",
            onClick: () => {
              selectedTargetId.value = row.id;
              assignMessage.value = "";
              assignError.value = "";
            },
          },
          String(selectedTargetId.value) === String(row.id) ? "선택됨" : "선택"
        ),
    },
  ];
});

const fetchLicenses = async () => {
  try {
    const res = await api.get("/licenses", {
      params: { activeOnly: true, page: 1, pageSize: 100 },
    });
    const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
    licenses.value = items;
  } catch (error) {
    loadError.value = error?.response?.data?.message || "라이선스 목록을 불러오지 못했습니다.";
  }
};

const fetchTargets = async ({ page = pagination.value.page } = {}) => {
  isLoading.value = true;
  loadError.value = "";

  try {
    const endpoint = targetType.value === "MEMBER" ? "/licenses/manual/users" : "/licenses/manual/workspaces";
    const res = await api.get(endpoint, {
      params: {
        q: searchKeyword.value || undefined,
        page,
        pageSize: pagination.value.pageSize,
      },
    });

    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    targets.value = items;

    const serverPagination = res.data?.pagination || {};
    pagination.value = {
      page: Number(serverPagination.page) || page,
      pageSize: Number(serverPagination.pageSize) || pagination.value.pageSize,
      total: Number(serverPagination.total) || items.length,
    };

    if (selectedTargetId.value && !items.some((item) => String(item.id) === String(selectedTargetId.value))) {
      selectedTargetId.value = null;
    }
  } catch (error) {
    targets.value = [];
    loadError.value = error?.response?.data?.message || "대상 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const assignLicense = async () => {
  assignError.value = "";
  assignMessage.value = "";

  if (!canAssign.value) {
    assignError.value = "라이선스와 대상을 선택한 뒤 수량을 확인하세요.";
    return;
  }

  isAssigning.value = true;
  try {
    const payload = {
      license_id: Number(selectedLicenseId.value),
      target_type: targetType.value,
      target_id: Number(selectedTargetId.value),
      quantity: Number(assignForm.value.quantity || 1),
      start_date: assignForm.value.startDate || null,
      end_date: assignForm.value.endDate || null,
      status: "ACTIVE",
    };

    const res = await api.post("/licenses/manual/assign", payload);
    assignMessage.value = res?.data?.message || "라이선스가 지급되었습니다.";
    await fetchTargets();
  } catch (error) {
    assignError.value = error?.response?.data?.message || "라이선스 지급에 실패했습니다.";
  } finally {
    isAssigning.value = false;
  }
};

const switchTargetType = async (nextType) => {
  if (targetType.value === nextType) return;
  targetType.value = nextType;
  selectedTargetId.value = null;
  selectedLicenseId.value = "";
  assignMessage.value = "";
  assignError.value = "";
  pagination.value = { ...pagination.value, page: 1 };
  await fetchTargets({ page: 1 });
};

const onPageChange = async ({ page }) => {
  await fetchTargets({ page });
};

onMounted(async () => {
  await fetchLicenses();
  await fetchTargets({ page: 1 });
});
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

.actions {
  display: flex;
  gap: 8px;
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
}

.wire-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.wire-input {
  border: 1px dashed var(--color-text-muted);
  border-radius: 8px;
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--color-text-muted);
}

.wire-input--control {
  border-style: solid;
  width: 100%;
  background: var(--color-input-bg);
  color: var(--color-text);
}

.wire-card--tall {
  min-height: 300px;
}

.wire-button {
  border: 1px solid var(--color-text);
  border-radius: 8px;
  background: var(--color-page-bg);
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}

.wire-button--active {
  background: color-mix(in srgb, var(--color-accent, #0b6bcb) 12%, var(--color-page-bg));
}

.wire-button--sm {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 0.8rem;
}

.assign-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.assign-grid label {
  display: grid;
  gap: 6px;
  font-size: 0.875rem;
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.ok {
  color: var(--color-success);
}

@media (max-width: 960px) {
  .admin-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .wire-row {
    grid-template-columns: 1fr;
  }

  .assign-grid {
    grid-template-columns: 1fr;
  }
}
</style>
