<template>
  <hgroup>
    <h1>데이터</h1>
    <p class="status">프로젝트의 테이블을 선택해 목록, 폼, 시각화를 확인하세요.</p>
  </hgroup>

  <section class="quick-links">
    <router-link class="quick-link" :to="`/project/${projectId}/data/customer/list`">
      고객 관리 열기
    </router-link>
    <router-link class="quick-link" :to="`/project/${projectId}/data/inventory/list`">
      재고 관리 열기
    </router-link>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const projectId = computed(() => route.params.projectId);
</script>

<style scoped>
.quick-links {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
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
