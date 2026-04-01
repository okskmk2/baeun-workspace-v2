<template>
  <div class="LnbLayout DataLayout">
    <aside>
      <div class="lnb-shell">
        <div class="data-header">
          <strong>데이터</strong>
          <div class="data-header__actions">
            <button type="button" class="icon-btn" @click="notifyPending('새 테이블')">
              <MaterialSymbol name="add" :size="18" alt="" />
            </button>
            <button type="button" class="icon-btn" @click="notifyPending('가져오기')">
              <MaterialSymbol name="upload" :size="18" alt="" />
            </button>
          </div>
        </div>

        <nav class="lnb-scroll data-nav">
          <section class="nav-section">
            <h3>즐겨찾기</h3>
            <p v-if="favorites.length === 0" class="empty-text">즐겨찾는 항목을 고정하세요</p>
            <div v-else class="favorite-list">
              <router-link
                v-for="item in favorites"
                :key="item.id"
                class="lnb-item favorite-item"
                :to="tablePath(item.tableId, item.kind, item.viewId)"
              >
                <span class="favorite-name">{{ item.name }}</span>
                <span class="favorite-tag" :class="`is-${item.kind}`">{{ kindLabel(item.kind) }}</span>
              </router-link>
            </div>
          </section>

          <section class="nav-section">
            <h3>데이터 목록</h3>
            <p v-if="tables.length === 0" class="empty-text">테이블을 만들어 보세요</p>
            <div v-else class="section-list">
              <router-link
                v-for="table in tables"
                :key="`list-${table.id}`"
                class="lnb-item"
                :to="tablePath(table.id, 'list')"
              >
                {{ table.name }}
              </router-link>
            </div>
          </section>

          <section class="nav-section">
            <h3>폼</h3>
            <p v-if="tables.length === 0" class="empty-text">폼으로 열 테이블이 없습니다</p>
            <div v-else class="section-list">
              <router-link
                v-for="table in tables"
                :key="`form-${table.id}`"
                class="lnb-item"
                :to="tablePath(table.id, 'form')"
              >
                {{ table.name }}
              </router-link>
            </div>
          </section>

          <section class="nav-section">
            <h3>시각화</h3>
            <p v-if="tables.length === 0" class="empty-text">시각화할 테이블이 없습니다</p>
            <div v-else class="section-list">
              <router-link
                v-for="table in tables"
                :key="`chart-${table.id}`"
                class="lnb-item"
                :to="tablePath(table.id, 'chart')"
              >
                {{ table.name }}
              </router-link>
            </div>
          </section>
        </nav>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { addToast } from "../../lib/toast";

const route = useRoute();

const projectId = computed(() => route.params.projectId);
const tables = ref([
  {
    id: "customer",
    name: "고객 관리",
    pinned: false,
    savedViews: [
      { id: "vip", name: "VIP 고객" },
      { id: "inactive", name: "휴면 고객" },
    ],
  },
  {
    id: "inventory",
    name: "재고 관리",
    pinned: false,
    savedViews: [
      { id: "low-stock", name: "재고 부족" },
      { id: "safety", name: "안전재고" },
    ],
  },
  {
    id: "budget",
    name: "예산 관리",
    pinned: false,
    savedViews: [{ id: "monthly", name: "월별 보기" }],
  },
  {
    id: "expense",
    name: "지출 결의",
    pinned: false,
    savedViews: [{ id: "pending", name: "결재 대기" }],
  },
]);
const favorites = ref([
  { id: "fav-1", name: "VIP 고객 목록", tableId: "customer", kind: "list", viewId: "vip" },
  { id: "fav-2", name: "입고 등록 폼", tableId: "inventory", kind: "form", viewId: "" },
  { id: "fav-3", name: "월별 예산 추이", tableId: "budget", kind: "chart", viewId: "monthly" },
  { id: "fav-4", name: "결재 대기 현황", tableId: "expense", kind: "list", viewId: "pending" },
]);

const tablePath = (tableId, pageType = "list", viewId = "") => {
  const base = `/project/${projectId.value}/data/${tableId}/${pageType}`;
  return viewId ? `${base}?view=${encodeURIComponent(viewId)}` : base;
};

const kindLabelMap = {
  list: "데이터 목록",
  form: "폼",
  chart: "시각화",
};

const kindLabel = (kind) => kindLabelMap[kind] || "데이터";

const notifyPending = (actionName) => {
  addToast({ message: `${actionName} 기능은 준비 중입니다.`, type: "info" });
};
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

.favorite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  text-decoration: none;
}

.favorite-item:hover,
.favorite-item:focus-visible {
  text-decoration: none;
}

.favorite-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.favorite-tag {
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  line-height: 1.2;
  border: 1px solid transparent;
  text-decoration: none;
  flex-shrink: 0;
}

.favorite-tag.is-list {
  color: #186339;
  background: #e9f9ef;
  border-color: #b8ebca;
}

.favorite-tag.is-form {
  color: #7a4b06;
  background: #fff5e5;
  border-color: #f2d39d;
}

.favorite-tag.is-chart {
  color: #184c8d;
  background: #eaf3ff;
  border-color: #bdd8ff;
}
</style>
