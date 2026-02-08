<template>
  <header class="section-header">
    <h2>활동 피드</h2>
    <div class="section-actions">
      <button type="button" class="btn btn--ghost btn--sm">필터</button>
    </div>
  </header>

  <div class="feed">
    <div class="feed-group">
      <div class="feed-date">오늘</div>
      <article class="feed-item">
        <div class="feed-icon">S</div>
        <div class="feed-body">
          <div class="feed-title">"로그인 오류" 상태가 진행중으로 변경됨</div>
          <div class="feed-meta">이은성 · 10:32</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">"권한 정책"에 새 코멘트</div>
          <div class="feed-meta">jojo · 09:10</div>
        </div>
      </article>
    </div>

    <div class="feed-group">
      <div class="feed-date">어제</div>
      <article class="feed-item">
        <div class="feed-icon">S</div>
        <div class="feed-body">
          <div class="feed-title">"알림 배치" 상태가 검토중으로 변경됨</div>
          <div class="feed-meta">mira · 18:42</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">"빌드 파이프라인"에 새 코멘트</div>
          <div class="feed-meta">sojin · 15:20</div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-date {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.feed-item {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
}

.feed-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111827;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.feed-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.feed-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
</style>
