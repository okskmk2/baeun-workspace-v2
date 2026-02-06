<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h1 class="page-header-info">💬 Chat</h1>
        <p>좌측의 대화방을 선택하세요.</p>
      </div>
    </header>

    <section class="empty-state-container">
      <div class="empty-state">
        <p>대화방을 선택하여 채팅을 시작하세요.</p>
        <p class="text-light">또는 좌측 "대화방 생성" 버튼으로 새 대화방을 만들 수 있습니다.</p>
      </div>
    </section>
  </div>
</template>

<script>
export default { name: 'ChatDashboardPage' }
</script>

<style scoped>
.empty-state-container{display:flex;align-items:center;justify-content:center;padding:40px}
.empty-state{max-width:640px;text-align:center;background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
</style>
