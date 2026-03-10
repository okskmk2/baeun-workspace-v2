<template>
  <section class="board-page">
    <header class="board-page__header">
      <div>
        <h1>중고시장</h1>
        <p class="board-page__subtitle">
          구성원 간 중고 물품 거래와 나눔을 위한 게시판입니다.
        </p>
      </div>
      <button type="button" class="wire-button">글쓰기 (멤버)</button>
    </header>

    <section class="board-toolbar wire-card">
      <div class="toolbar-row">
        <div class="wire-input">검색: 제목/작성자/품목</div>
        <div class="wire-input">필터: 판매중 | 거래완료 | 나눔</div>
      </div>
    </section>

    <section class="board-table wire-card">
      <div class="board-table__head">
        <span>제목</span>
        <span>작성자</span>
        <span>작성일</span>
        <span>조회수</span>
        <span>댓글수</span>
      </div>
      <div class="board-table__row" v-for="index in 8" :key="index">
        <span>중고시장 글 제목 {{ index }}</span>
        <span>작성자 {{ index }}</span>
        <span>2026-03-10</span>
        <span>{{ 140 - index }}</span>
        <span>{{ index + 2 }}</span>
      </div>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.board-page__subtitle {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 12px;
}

.toolbar-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.wire-input {
  min-height: 38px;
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  padding: 0 10px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
}

.board-table__head,
.board-table__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 120px 120px 80px 80px;
  gap: 10px;
  align-items: center;
}

.board-table__head {
  font-weight: 700;
  padding: 8px 6px;
  border-bottom: 1px solid var(--color-border);
}

.board-table__row {
  padding: 10px 6px;
  border-bottom: 1px dashed var(--color-border);
  color: var(--color-text-muted);
}

.board-table__row:last-child {
  border-bottom: 0;
}

.wire-button {
  border: 1px solid #111827;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px 12px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .board-page__header {
    flex-direction: column;
  }

  .toolbar-row {
    grid-template-columns: 1fr;
  }

  .board-table__head,
  .board-table__row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
