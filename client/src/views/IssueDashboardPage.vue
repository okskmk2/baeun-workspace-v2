<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1 class="page-header-info">📋 Issues</h1>
        <p>좌측의 보드나 필터를 선택하세요.</p>
      </div>
    </header>

    <section class="empty-state-container">
      <div class="empty-state">
        <p>이슈 보드가 없습니다. 좌측에서 보드를 선택하거나 새 보드를 생성하세요.</p>
        <p class="text-light">또는 좌측 상단의 '새 보드 만들기'로 시작할 수 있습니다.</p>
      </div>
    </section>
  </div>
</template>

<script>
export default { name: 'IssueDashboardPage' }
</script>

<style scoped>
.empty-state-container{display:flex;align-items:center;justify-content:center;padding:40px}
.empty-state{max-width:640px;text-align:center;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
</style>
