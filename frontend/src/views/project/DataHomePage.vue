<template>
  <hgroup>
    <div>
      <h1>데이터</h1>
      <p class="subtitle">워크스페이스 표준 자산과 프로젝트 임시 테이블을 탐색하고 편집하세요.</p>
    </div>
  </hgroup>

  <section class="overview-grid">
    <article class="wire-card card">
      <h3>Standard Assets</h3>
      <p>{{ assets.length }}개</p>
    </article>
    <article class="wire-card card">
      <h3>Project Local</h3>
      <p>{{ locals.length }}개</p>
    </article>
  </section>

  <section class="quick-links">
    <router-link
      v-for="table in quickLinks"
      :key="table.id"
      class="quick-link"
      :to="`/project/${projectId}/data/${table.id}/list`"
    >
      {{ table.name }} 열기
    </router-link>
    <p v-if="quickLinks.length === 0" class="status">
      왼쪽 메뉴에서 테이블을 생성하거나 선택하세요.
    </p>
  </section>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useDataStore } from "../../stores/dataStore";

const route = useRoute();
const dataStore = useDataStore();
const { tablesByProject } = storeToRefs(dataStore);
const projectId = computed(() => route.params.projectId);
const assets = computed(() => tablesByProject.value[projectId.value]?.assets || []);
const locals = computed(() => tablesByProject.value[projectId.value]?.locals || []);
const quickLinks = computed(() => [...assets.value, ...locals.value].slice(0, 6));

onMounted(async () => {
  if (!projectId.value) return;
  await dataStore.fetchTables(projectId.value);
});
</script>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.card {
  padding: 1rem;
}

.card h3 {
  margin: 0;
  font-size: 14px;
}

.card p {
  margin: 0.4rem 0 0;
  font-size: 24px;
  font-weight: 700;
}

.quick-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.quick-link {
  border: 1px solid var(--color-border, #e4e4e7);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  text-decoration: none;
  color: inherit;
  background: var(--color-surface, #fff);
}
</style>
