<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1 class="page-header-info">📚 Wiki</h1>
        <p>좌측의 문서를 선택하거나 새 페이지를 생성하세요.</p>
      </div>
    </header>

    <section class="empty-state-container">
      <div class="empty-state">
        <p>위키 문서가 없습니다. 새 페이지를 생성하여 문서를 시작하세요.</p>
        <p class="text-light">또는 좌측 상단의 '새 페이지 생성'을 사용하세요.</p>
      </div>
    </section>
  </div>
</template>

<script>
export default { name: 'WikiDashboardPage' }
</script>

<style scoped>
.empty-state-container{display:flex;align-items:center;justify-content:center;padding:40px}
.empty-state{max-width:640px;text-align:center;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
</style>
