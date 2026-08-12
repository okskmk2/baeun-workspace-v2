<template>
  <div class="LnbLayout DataLayout">
    <aside>
      <div class="lnb-shell">
        <div class="data-header">
          <strong>데이터</strong>
          <div class="data-header__actions">
            <button type="button" class="icon-btn" @click="openCreateModal">
              <MaterialSymbol name="add" :size="18" alt="" />
            </button>
            <button type="button" class="icon-btn" @click="refreshTables">
              <MaterialSymbol name="upload" :size="18" alt="" />
            </button>
          </div>
        </div>

        <nav class="lnb-scroll data-nav">
          <section class="nav-section">
            <h3>Workspace Assets</h3>
            <p v-if="assets.length === 0" class="empty-text">워크스페이스 공용 자산이 없습니다</p>
            <div v-else class="section-list">
              <router-link
                v-for="table in assets"
                :key="`asset-${table.id}`"
                class="lnb-item"
                :to="tablePath(table.id, 'list')"
              >
                <span>{{ table.name }}</span>
                <span class="category-badge is-asset">Asset</span>
              </router-link>
            </div>
          </section>

          <section class="nav-section">
            <h3>Project Assets</h3>
            <p v-if="localTables.length === 0" class="empty-text">
              프로젝트 임시 테이블이 없습니다
            </p>
            <div v-else class="section-list">
              <router-link
                v-for="table in localTables"
                :key="`local-${table.id}`"
                class="lnb-item"
                :to="tablePath(table.id, 'list')"
              >
                <span>{{ table.name }}</span>
                <span class="category-badge is-local">Local</span>
              </router-link>
            </div>
          </section>
        </nav>
      </div>
    </aside>
    <main>
      <router-view />
    </main>

    <BaseModal
      :closeOnBackdrop="false"
      :open="isCreateModalOpen"
      title="임시 테이블 생성"
      maxWidth="760px"
      @close="closeCreateModal"
    >
      <form class="create-form" @submit.prevent="submitCreateTable">
        <label>
          테이블 이름
          <input v-model.trim="createForm.name" type="text" required />
        </label>
        <label>
          설명
          <input v-model.trim="createForm.description" type="text" />
        </label>

        <div class="column-editor">
          <div class="column-editor__header">
            <strong>컬럼 정의</strong>
            <button type="button" class="btn" @click="appendColumn">컬럼 추가</button>
          </div>

          <div
            v-for="(column, index) in createForm.columns"
            :key="`new-col-${index}`"
            class="column-row"
          >
            <input v-model.trim="column.name" type="text" placeholder="컬럼명" required />
            <select v-model="column.type">
              <option value="TEXT">Text</option>
              <option value="NUMBER">Number</option>
              <option value="DATE">Date</option>
              <option value="SELECT">Select</option>
            </select>
            <label class="required-check">
              <input v-model="column.is_required" type="checkbox" />
              <span>필수</span>
            </label>
            <input
              v-if="column.type === 'SELECT'"
              v-model="column.optionsText"
              type="text"
              placeholder="옵션(쉼표 구분)"
            />
            <button type="button" class="btn btn--danger" @click="removeColumn(index)">삭제</button>
          </div>
        </div>

        <p v-if="createError" class="status error">{{ createError }}</p>

        <div class="create-actions">
          <button type="submit" class="btn" :disabled="isCreating">
            {{ isCreating ? "생성 중..." : "생성" }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import BaseModal from "../../components/BaseModal.vue";
import { addToast } from "../../lib/toast";
import { useDataStore } from "../../stores/dataStore";

const route = useRoute();
const router = useRouter();
const dataStore = useDataStore();
const { tablesByProject } = storeToRefs(dataStore);

const projectId = computed(() => route.params.projectId);
const assets = computed(() => tablesByProject.value[projectId.value]?.assets || []);
const localTables = computed(() => tablesByProject.value[projectId.value]?.locals || []);

const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const createError = ref("");
const createForm = ref({
  name: "",
  description: "",
  columns: [{ name: "name", type: "TEXT", optionsText: "", is_required: false }],
});

const tablePath = (tableId, pageType = "list", viewId = "") => {
  const base = `/project/${projectId.value}/data/${tableId}/${pageType}`;
  return viewId ? `${base}?view=${encodeURIComponent(viewId)}` : base;
};

const refreshTables = async () => {
  if (!projectId.value) return;
  await dataStore.fetchTables(projectId.value);
  addToast({ message: "데이터 목록을 새로고침했습니다.", type: "success" });
};

const openCreateModal = () => {
  isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
  isCreateModalOpen.value = false;
  createError.value = "";
};

const appendColumn = () => {
  createForm.value.columns.push({ name: "", type: "TEXT", optionsText: "", is_required: false });
};

const removeColumn = (index) => {
  createForm.value.columns.splice(index, 1);
  if (createForm.value.columns.length === 0) {
    createForm.value.columns.push({ name: "", type: "TEXT", optionsText: "", is_required: false });
  }
};

const submitCreateTable = async () => {
  if (!projectId.value) return;
  if (!createForm.value.name) {
    createError.value = "테이블 이름을 입력하세요.";
    return;
  }
  if (createForm.value.columns.some((column) => !String(column.name || "").trim())) {
    createError.value = "모든 컬럼에 이름이 필요합니다.";
    return;
  }

  isCreating.value = true;
  createError.value = "";
  try {
    const payload = {
      name: createForm.value.name,
      description: createForm.value.description || null,
      columns: createForm.value.columns.map((column, index) => ({
        name: column.name,
        type: column.type,
        is_required: column.is_required === true,
        sort_order: index,
        options:
          column.type === "SELECT"
            ? String(column.optionsText || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
      })),
    };
    const created = await dataStore.createAdhocTable(projectId.value, payload);
    await dataStore.fetchTables(projectId.value);
    closeCreateModal();
    addToast({ message: "임시 테이블이 생성되었습니다.", type: "success" });
    router.push(tablePath(created.id, "list"));
  } catch (error) {
    createError.value = error?.response?.data?.message || "테이블 생성 중 오류가 발생했습니다.";
  } finally {
    isCreating.value = false;
  }
};

onMounted(async () => {
  if (!projectId.value) return;
  await dataStore.fetchTables(projectId.value);
});
</script>

<style scoped>
.DataLayout main {
  padding: 18px 24px 3rem;
}

.data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.data-header__actions {
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e4e4e7);
  background: var(--color-surface, #fff);
  color: var(--color-text-secondary, #71717a);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.data-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nav-section h3 {
  margin: 0 0 0.4rem;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-tertiary, #a1a1aa);
}

.empty-text {
  margin: 0.15rem 0 0.4rem;
  color: var(--color-text-secondary, #71717a);
  font-size: 13px;
}

.favorite-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lnb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-decoration: none;
}

.category-badge {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  line-height: 1.2;
  border: 1px solid transparent;
  text-decoration: none;
  flex-shrink: 0;
}

.category-badge.is-asset {
  color: #186339;
  background: #e9f9ef;
  border-color: #b8ebca;
}

.category-badge.is-local {
  color: #6d28d9;
  background: #f3e8ff;
  border-color: #ddd6fe;
}

.create-form {
  display: grid;
  gap: 0.75rem;
}

.create-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 13px;
}

.create-form input,
.create-form select {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  background: var(--color-surface, #fff);
}

.column-editor {
  display: grid;
  gap: 0.45rem;
}

.column-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.column-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 72px minmax(0, 1fr) 70px;
  gap: 0.35rem;
}

.required-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 8px;
  padding: 0 0.45rem;
  font-size: 12px;
  white-space: nowrap;
}

.required-check input {
  width: 14px;
  height: 14px;
}

.status.error {
  color: #dc2626;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
