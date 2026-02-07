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
        <div class="feed-icon">U</div>
        <div class="feed-body">
          <div class="feed-title">"온보딩 가이드" 내용이 수정됨</div>
          <div class="feed-meta">이은성 · 11:40</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">"서버 배포" 문서에 새 코멘트</div>
          <div class="feed-meta">mira · 09:22</div>
        </div>
      </article>
    </div>

    <div class="feed-group">
      <div class="feed-date">어제</div>
      <article class="feed-item">
        <div class="feed-icon">U</div>
        <div class="feed-body">
          <div class="feed-title">"권한 정책" 목차가 정리됨</div>
          <div class="feed-meta">sojin · 17:05</div>
        </div>
      </article>
      <article class="feed-item">
        <div class="feed-icon">C</div>
        <div class="feed-body">
          <div class="feed-title">"릴리즈 노트" 문서에 새 코멘트</div>
          <div class="feed-meta">jojo · 15:10</div>
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
  background: #0f172a;
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
