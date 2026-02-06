<template>
  <div class="page-container">
    <header class="page-header">
      <h1>페이지를 찾을 수 없습니다</h1>
    </header>
    <section class="page-body">
      <p>요청하신 페이지를 찾을 수 없습니다. <router-link to="/">홈으로 돌아가기</router-link></p>
    </section>
  </div>
</template>

<script>
export default { name: 'NotFoundPage' }
</script>

<style scoped>
.page-container{padding:12px}
</style>
