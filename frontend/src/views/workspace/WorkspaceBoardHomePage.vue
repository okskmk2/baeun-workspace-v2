<template>
  <section class="board-home">
    <article class="wire-card">
      <h1>게시판 홈</h1>
      <p class="wire-desc">
        워크스페이스 게시판 활동을 한눈에 확인하는 허브 페이지입니다.
      </p>
    </article>

    <article class="wire-card">
      <h2>공지사항</h2>
      <div class="wire-list">
        <div class="wire-row">[고정] 시스템 점검 일정 안내</div>
        <div class="wire-row">[고정] 게시판 운영 정책 개정</div>
        <div class="wire-row">[고정] 신규 멤버 온보딩 공지</div>
      </div>
    </article>

    <article class="wire-card">
      <h2>게시판 활동</h2>
      <div class="board-activity-grid">
        <article class="board-activity-card">
          <h3>공지사항</h3>
          <ul>
            <li>공지 A</li>
            <li>공지 B</li>
            <li>공지 C</li>
          </ul>
        </article>
        <article class="board-activity-card">
          <h3>경조사</h3>
          <ul>
            <li>소식 A</li>
            <li>소식 B</li>
            <li>소식 C</li>
          </ul>
        </article>
        <article class="board-activity-card">
          <h3>중고시장</h3>
          <ul>
            <li>거래 글 A</li>
            <li>거래 글 B</li>
            <li>거래 글 C</li>
          </ul>
        </article>
        <article class="board-activity-card">
          <h3>인력 수소문</h3>
          <ul>
            <li>추천 요청 A</li>
            <li>추천 요청 B</li>
            <li>추천 요청 C</li>
          </ul>
        </article>
        <article class="board-activity-card">
          <h3>묻고 답하기</h3>
          <ul>
            <li>질문 A</li>
            <li>질문 B</li>
            <li>질문 C</li>
          </ul>
        </article>
      </div>
    </article>

    <article class="wire-card">
      <h2>최근 게시글</h2>
      <div class="wire-list wire-list--long">
        <div class="wire-row" v-for="index in 10" :key="index">최근 글 {{ index }} (게시판명 / 작성자 / 시간)</div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.board-home {
  display: grid;
  gap: 14px;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 14px;
}

.wire-desc {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.wire-list {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.wire-row {
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  min-height: 38px;
  padding: 8px 10px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
}

.wire-list--long .wire-row {
  min-height: 34px;
}

.board-activity-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.board-activity-card {
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  min-height: 120px;
  padding: 10px;
  color: var(--color-text-muted);
  background: #ffffff;
}

.board-activity-card h3 {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
}

.board-activity-card ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

@media (max-width: 900px) {
  .board-activity-grid {
    grid-template-columns: 1fr;
  }
}
</style>
