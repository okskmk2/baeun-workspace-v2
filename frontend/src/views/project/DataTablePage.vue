<template>
  <hgroup>
    <h1>{{ pageTitle }}</h1>
    <p class="status">{{ tableName }} 테이블 · {{ pageTypeLabel }}</p>
  </hgroup>

  <section class="wire-card summary">
    <dl>
      <div>
        <dt>테이블 ID</dt>
        <dd>{{ tableId }}</dd>
      </div>
      <div>
        <dt>현재 페이지</dt>
        <dd>{{ pageTypeLabel }}</dd>
      </div>
      <div>
        <dt>저장된 뷰</dt>
        <dd>{{ viewId || "기본" }}</dd>
      </div>
    </dl>
  </section>

  <section class="wire-card placeholder">
    <p>데이터 {{ pageTypeLabel }} 화면입니다. 실제 CRUD/렌더링 연결은 API 확정 후 이어서 붙일 수 있습니다.</p>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const tableId = computed(() => String(route.params.tableId || ""));
const pageType = computed(() => String(route.params.pageType || "list"));
const viewId = computed(() => String(route.query.view || ""));

const tableNameMap = {
  customer: "고객 관리",
  inventory: "재고 관리",
  budget: "예산 관리",
};

const pageTypeMap = {
  list: "목록",
  form: "폼",
  chart: "시각화",
};

const tableName = computed(() => tableNameMap[tableId.value] || "사용자 정의 테이블");
const pageTypeLabel = computed(() => pageTypeMap[pageType.value] || "목록");
const pageTitle = computed(() => `${tableName.value} · ${pageTypeLabel.value}`);
</script>

<style scoped>
.summary,
.placeholder {
  padding: 1rem;
  margin-top: 0.8rem;
}

dl {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

dt {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}

dd {
  margin: 0.25rem 0 0;
  font-weight: 600;
}
</style>
