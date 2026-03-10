<template>
  <main class="workspace-rank container">
    <header class="rank-header wire-card">
      <div>
        <h1>워크스페이스 활약 랭킹</h1>
        <p class="subtitle">
          이번 달, 워크스페이스를 움직인 프로젝트와 멤버의 기여를 확인해보세요.
          속도, 품질, 협업, 기록, 변화 제안을 바탕으로 집계됩니다.
        </p>
      </div>
      <div class="rank-filters">
        <div class="wire-chip">기간: 최근 30일</div>
        <div class="wire-chip">범위: 현재 워크스페이스</div>
        <div class="wire-chip">갱신: 매주 월요일</div>
      </div>
    </header>

    <section class="wire-card my-summary-card">
      <div class="section-head">
        <h2>내 성장 하이라이트</h2>
        <button type="button" class="wire-button">내 활동 보기</button>
      </div>
      <p class="section-desc">
        지금 내 위치와 다음 목표를 확인하고, 다음 랭크를 향해 한 걸음 더 나아가보세요.
      </p>

      <div class="my-summary-grid">
        <article class="summary-box">
          <p class="summary-label">현재 순위</p>
          <p class="summary-value">협업 기여 12위</p>
          <p class="summary-meta">문서 기여 5위 · 최근 2주 연속 상승</p>
        </article>

        <article class="summary-box">
          <p class="summary-label">가장 많이 오른 분야</p>
          <p class="summary-value">꼼꼼 검수 장인 ▲4</p>
          <p class="summary-meta">이번 주 리뷰 참여가 크게 늘었어요</p>
        </article>

        <article class="summary-box">
          <p class="summary-label">다음 목표</p>
          <p class="summary-value">변화 설계자 TOP 10 도전</p>
          <p class="summary-meta">제안 1건이 더 채택되면 진입 가능</p>
        </article>
      </div>
    </section>

    <section class="wire-card">
      <div class="section-head">
        <h2>흐름이 좋은 프로젝트</h2>
        <button type="button" class="wire-button">프로젝트 분석 보기</button>
      </div>
      <p class="section-desc">
        완료율, 처리 속도, 일정 안정성을 종합해 이번 달 운영 효율이 높은 프로젝트를 보여줍니다.
      </p>

      <ol class="rank-list">
        <li class="rank-item">
          <span class="rank-badge">1</span>
          <div class="rank-main">
            <div class="rank-topline">
              <p class="rank-title">프로젝트 이름 A</p>
              <span class="rank-tag">2주 연속 상위권</span>
            </div>
            <p class="rank-meta">KPI 92.5 | 완료율 88% | 평균 처리 2.1일</p>
            <p class="rank-note">최근 2주 연속 지연 없이 안정적으로 운영되고 있어요.</p>
          </div>
        </li>
        <li class="rank-item">
          <span class="rank-badge">2</span>
          <div class="rank-main">
            <div class="rank-topline">
              <p class="rank-title">프로젝트 이름 B</p>
              <span class="rank-tag">신규 진입</span>
            </div>
            <p class="rank-meta">KPI 87.2 | 완료율 81% | 평균 처리 2.8일</p>
            <p class="rank-note">처리 속도가 빠르게 개선되며 이번 달 상위권에 올랐어요.</p>
          </div>
        </li>
        <li class="rank-item">
          <span class="rank-badge">3</span>
          <div class="rank-main">
            <div class="rank-topline">
              <p class="rank-title">프로젝트 이름 C</p>
              <span class="rank-tag">운영 안정적</span>
            </div>
            <p class="rank-meta">KPI 82.0 | 완료율 79% | 평균 처리 3.4일</p>
            <p class="rank-note">재오픈율이 낮아 안정적인 프로젝트 흐름을 유지하고 있어요.</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="wire-card">
      <div class="section-head">
        <h2>분야별 베스트 플레이어</h2>
        <button type="button" class="wire-button">전체 멤버 보기</button>
      </div>
      <p class="section-desc">
        다양한 방식의 좋은 기여가 더 많이 보이고 더 자주 인정받도록, 분야별 활약 멤버를 소개합니다.
      </p>

      <div class="class-rank-grid">
        <article class="class-rank-card">
          <div class="class-head">
            <h3>변화 설계자</h3>
            <span class="class-chip">아이디어 · 혁신</span>
          </div>
          <p class="class-desc">새로운 기능, 개선안, 운영 방식을 제안하고 실제 변화로 연결한 멤버</p>
          <ol class="rank-list rank-list--compact">
            <li class="rank-item">
              <span class="rank-badge">1</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 A</p>
                  <span class="rank-tag">MVP</span>
                </div>
                <p class="rank-meta">기획 점수 320 | 제안 7건 | 채택 4건 | 반영 3건</p>
              </div>
            </li>
            <li class="rank-item">
              <span class="rank-badge">2</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 B</p>
                  <span class="rank-tag">급상승</span>
                </div>
                <p class="rank-meta">기획 점수 285 | 제안 6건 | 채택 3건 | 반영 2건</p>
              </div>
            </li>
          </ol>
          <div class="class-footer">
            <p>내 다음 목표: 제안 채택 1건 더 달성하면 TOP 10 진입</p>
          </div>
        </article>

        <article class="class-rank-card">
          <div class="class-head">
            <h3>일처리 폭주기관차</h3>
            <span class="class-chip">실행 · 속도</span>
          </div>
          <p class="class-desc">작업을 빠르고 많이 완료해 프로젝트 흐름을 만든 멤버</p>
          <ol class="rank-list rank-list--compact">
            <li class="rank-item">
              <span class="rank-badge">1</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 C</p>
                  <span class="rank-tag">3주 연속</span>
                </div>
                <p class="rank-meta">해결 점수 410 | 완료 42건 | 평균 1.9일</p>
              </div>
            </li>
            <li class="rank-item">
              <span class="rank-badge">2</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 D</p>
                  <span class="rank-tag">상승 중</span>
                </div>
                <p class="rank-meta">해결 점수 355 | 완료 35건 | 평균 2.3일</p>
              </div>
            </li>
          </ol>
          <div class="class-footer">
            <p>완료 3건을 더 달성하면 상위권 진입이 가능해요</p>
          </div>
        </article>

        <article class="class-rank-card">
          <div class="class-head">
            <h3>꼼꼼 검수 장인</h3>
            <span class="class-chip">품질 · 리뷰</span>
          </div>
          <p class="class-desc">검토 참여도와 검토 품질이 높아 결과물의 완성도를 끌어올린 멤버</p>
          <ol class="rank-list rank-list--compact">
            <li class="rank-item">
              <span class="rank-badge">1</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 E</p>
                  <span class="rank-tag">정확도 최고</span>
                </div>
                <p class="rank-meta">리뷰 점수 290 | 리뷰 31건 | 반려 정확도 89%</p>
              </div>
            </li>
            <li class="rank-item">
              <span class="rank-badge">2</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 F</p>
                  <span class="rank-tag">신규 진입</span>
                </div>
                <p class="rank-meta">리뷰 점수 260 | 리뷰 27건 | 반려 정확도 84%</p>
              </div>
            </li>
          </ol>
          <div class="class-footer">
            <p>리뷰 2건 더 참여하면 다음 배지 단계에 가까워져요</p>
          </div>
        </article>

        <article class="class-rank-card">
          <div class="class-head">
            <h3>위키 지식 마법사</h3>
            <span class="class-chip">기록 · 공유</span>
          </div>
          <p class="class-desc">위키 문서 작성과 수정 기여로 팀 전체 생산성을 높인 멤버</p>
          <ol class="rank-list rank-list--compact">
            <li class="rank-item">
              <span class="rank-badge">1</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 G</p>
                  <span class="rank-tag">문서왕</span>
                </div>
                <p class="rank-meta">문서 점수 240 | 신규 18건 | 업데이트 35건</p>
              </div>
            </li>
            <li class="rank-item">
              <span class="rank-badge">2</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 H</p>
                  <span class="rank-tag">꾸준함</span>
                </div>
                <p class="rank-meta">문서 점수 210 | 신규 14건 | 업데이트 31건</p>
              </div>
            </li>
          </ol>
          <div class="class-footer">
            <p>문서 업데이트 2건만 더 하면 상위권에 도전할 수 있어요</p>
          </div>
        </article>

        <article class="class-rank-card">
          <div class="class-head">
            <h3>리액션 치어리더</h3>
            <span class="class-chip">협업 · 에너지</span>
          </div>
          <p class="class-desc">채널에서 반응과 피드백 참여로 협업 분위기를 살린 멤버</p>
          <ol class="rank-list rank-list--compact">
            <li class="rank-item">
              <span class="rank-badge">1</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 I</p>
                  <span class="rank-tag">응원왕</span>
                </div>
                <p class="rank-meta">리액션 점수 510 | 이모지 260회 | 피드백 67회</p>
              </div>
            </li>
            <li class="rank-item">
              <span class="rank-badge">2</span>
              <div class="rank-main">
                <div class="rank-topline">
                  <p class="rank-title">멤버 이름 J</p>
                  <span class="rank-tag">급상승</span>
                </div>
                <p class="rank-meta">리액션 점수 470 | 이모지 239회 | 피드백 61회</p>
              </div>
            </li>
          </ol>
          <div class="class-footer">
            <p>피드백 5회 더 남기면 이번 주 TOP 10 진입이 가능해요</p>
          </div>
        </article>
      </div>
    </section>

    <section class="wire-card">
      <div class="section-head">
        <h2>이번 주 급상승</h2>
        <button type="button" class="wire-button">전체 상승 보기</button>
      </div>
      <p class="section-desc">
        고정 상위권뿐 아니라 빠르게 성장 중인 멤버도 함께 조명합니다.
      </p>

      <div class="spotlight-list">
        <article class="spotlight-item">
          <p class="spotlight-title">멤버 이름 K</p>
          <p class="spotlight-meta">변화 설계자 ▲7 · 이번 주 신규 기능 제안 2건 채택</p>
        </article>
        <article class="spotlight-item">
          <p class="spotlight-title">멤버 이름 L</p>
          <p class="spotlight-meta">꼼꼼 검수 장인 ▲5 · 리뷰 정확도 91% 달성</p>
        </article>
        <article class="spotlight-item">
          <p class="spotlight-title">멤버 이름 M</p>
          <p class="spotlight-meta">위키 지식 마법사 ▲4 · 문서 6건 업데이트</p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.workspace-rank {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.wire-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 16px;
}

h1,
h2,
.rank-title,
.spotlight-title {
  margin: 0;
}

.subtitle,
.section-desc,
.rank-meta,
.rank-note,
.class-desc,
.summary-meta,
.class-footer p,
.spotlight-meta {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.rank-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.wire-chip {
  border: 1px dashed #9ca3af;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--color-text-muted);
  background: #ffffff;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wire-button {
  border: 1px solid #111827;
  border-radius: 8px;
  background: #ffffff;
  padding: 7px 12px;
  font-weight: 600;
  cursor: pointer;
}

.my-summary-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-box {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}

.summary-label {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.summary-value {
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 700;
}

.rank-list {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.rank-list--compact {
  margin-top: 10px;
}

.rank-item {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: #ffffff;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid #9ca3af;
  display: inline-grid;
  place-items: center;
  font-weight: 700;
  background: #f9fafb;
}

.rank-main {
  min-width: 0;
}

.rank-topline,
.class-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.rank-tag,
.class-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
}

.rank-note {
  font-size: 13px;
}

.class-rank-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.class-rank-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
}

.class-rank-card h3 {
  margin: 0;
  font-size: 16px;
}

.class-desc {
  font-size: 13px;
}

.class-footer {
  margin-top: 12px;
  border-top: 1px dashed var(--color-border);
  padding-top: 12px;
}

.class-footer p {
  font-size: 13px;
}

.spotlight-list {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.spotlight-item {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
}

@media (max-width: 900px) {
  .rank-header {
    flex-direction: column;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .my-summary-grid,
  .class-rank-grid {
    grid-template-columns: 1fr;
  }
}
</style>