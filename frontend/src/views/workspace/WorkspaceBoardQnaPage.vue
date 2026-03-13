<template>
  <section class="board-page">
    <header class="board-page__header">
      <div>
        <h1>묻고 답하기</h1>
        <p class="board-page__subtitle">
          업무 중 생긴 질문을 올리고 답변을 쌓아 팀 지식으로 축적하는 지식 Q&A 게시판입니다.
        </p>
      </div>
      <button type="button" class="wire-button">질문 등록</button>
    </header>

    <section class="board-toolbar wire-card">
      <div class="toolbar-row">
        <div class="wire-input">검색: 제목/작성자/태그</div>
        <div class="wire-input">필터: 답변대기 | 답변완료 | 채택됨</div>
      </div>
    </section>

    <section class="board-table wire-card">
      <div class="board-table__head">
        <span>질문</span>
        <span>작성자</span>
        <span>작성일</span>
        <span>조회수</span>
        <span>답변수</span>
      </div>
      <div class="board-table__row" v-for="index in 8" :key="index">
        <span>묻고 답하기 질문 {{ index }}</span>
        <span>작성자 {{ index }}</span>
        <span>2026-03-10</span>
        <span>{{ 120 - index }}</span>
        <span>{{ index + 1 }}</span>
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
