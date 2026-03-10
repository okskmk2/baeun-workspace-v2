<template>
  <section class="board-page">
    <header class="board-page__header">
      <h1>사람 소개 게시판</h1>
      <button type="button" class="wire-button">소개 글 등록</button>
    </header>

    <p class="board-page__desc">
      구성원 소개, 외부 협력 인력 소개, 네트워킹 공지를 공유하는 게시판입니다.
    </p>

    <section class="wire-card wire-card--tall">
      <h2>소개 게시글 목록 (와이어프레임)</h2>
      <div class="wire-block">프로필 카드 + 소개 글 리스트 영역</div>
    </section>
  </section>
</template>

<style scoped>
.board-page {
  display: grid;
  gap: 14px;
}

.board-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.board-page__desc {
  margin: 0;
  color: var(--color-text-muted);
}

.wire-card {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.wire-card--tall {
  min-height: 320px;
}

.wire-block {
  min-height: 240px;
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #6b7280;
}

.wire-button {
  border: 1px solid #111827;
  border-radius: 8px;
  background: #ffffff;
  padding: 7px 12px;
  font-weight: 600;
}
</style>
