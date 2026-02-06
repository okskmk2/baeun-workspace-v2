<template>
  <div class="page-container">
    <header class="page-header">
      <h1>페이지 상세</h1>
    </header>
    <section class="page-body">
      <p>위키 페이지 상세 자리표시자입니다.</p>
    </section>
  </div>
</template>

<script>
import { useRoute } from 'vue-router'
export default {
  name: 'PageDetailPage',
  setup(){
    const route = useRoute()
    const pageId = route.params.pageId
    return { pageId }
  }
}
</script>

<style scoped>
.page-container{padding:12px}
</style>
