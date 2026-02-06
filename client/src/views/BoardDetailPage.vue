<template>
  <div class="page-container">
    <header class="page-header">
      <h1>보드 상세</h1>
    </header>
    <section class="page-body">
      <p>보드 상세 뷰 자리표시자입니다.</p>
    </section>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
export default {
  name: 'BoardDetailPage',
  setup(){
    const route = useRoute()
    const boardId = route.params.boardId
    return { boardId }
  }
}
</script>

<style scoped>
.page-container{padding:12px}
</style>
