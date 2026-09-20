<template>
  <section class="workspace-settings-assets">
    <hgroup>
      <div>
        <h1>워크스페이스 자산</h1>
        <p class="subtitle">프로젝트에서 승격된 워크스페이스 공용 자산을 확인합니다.</p>
      </div>
    </hgroup>

    <div class="tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'is-active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <section v-if="activeTab === 'data'" class="card">
      <div class="card__header">
        <h2>데이터 테이블</h2>
        <CountChip :count="assets.length" />
      </div>

      <p v-if="isLoading" class="status">불러오는 중...</p>
      <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

      <DataTable v-else :headers="headers" :data="assets" empty-text="워크스페이스 자산으로 승격된 테이블이 없습니다." min-width="640px" />
    </section>
  </section>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import CountChip from "../../components/CountChip.vue";
import DataTable from "../../components/DataTable.vue";
import { useDataStore } from "../../stores/dataStore";

const route = useRoute();
const dataStore = useDataStore();

const workspaceId = computed(() => route.params.workspaceId);
const assets = computed(() => dataStore.getWorkspaceAssets(workspaceId.value));

const tabs = [{ key: "data", label: "데이터" }];
const activeTab = ref("data");

const isLoading = ref(false);
const errorMessage = ref("");

const headers = [
  {
    text: "이름",
    key: "name",
    align: "left",
    render: (value, row) => h("p", { class: "asset-name" }, value || `Table ${row.id}`),
  },
  {
    text: "설명",
    key: "description",
    align: "left",
    render: (value) => h("p", { class: "asset-description" }, value || "설명이 없습니다."),
  },
  {
    text: "컬럼 수",
    key: "column_count",
    align: "left",
  },
  {
    text: "버전",
    key: "version",
    align: "left",
  },
];

const fetchAssets = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    await dataStore.fetchWorkspaceAssets(workspaceId.value);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "워크스페이스 자산을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchAssets);
watch(workspaceId, fetchAssets);
</script>

<style scoped>
.workspace-settings-assets {
  display: grid;
  gap: 16px;
}

hgroup {
  margin: 0;
}

h1 {
  margin: 0;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: 8px 14px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.is-active {
  color: var(--color-text);
  border-bottom-color: var(--color-primary, currentColor);
  font-weight: 600;
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
  gap: 8px;
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
</style>
