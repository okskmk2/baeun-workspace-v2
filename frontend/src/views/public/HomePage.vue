<template>
  <main class="home container">
    <section class="hero">
      <div class="hero__copy">
        <p class="hero__eyebrow">몰입을 위한 단 하나의 흐름</p>
        <h1 class="hero__title">탭 전환 없는 완벽한 몰입</h1>
        <p class="hero__subtitle">
          기획과 아이디어는 지식 베이스에, 실행은 작업 관리 보드에, 소통은 메시징 채널에.
          AI가 세 흐름을 유기적으로 연결합니다.
        </p>
        <div class="hero__actions">
          <router-link class="btn" to="/signup">지금 워크플로우 시작</router-link>
          <router-link class="btn btn--secondary" to="/store">도입 사례 보기</router-link>
        </div>
        <p class="hero__presence">현재 접속자: {{ onlineCountLabel }}</p>
        <div class="hero__stats">
          <div v-for="stat in stats" :key="stat.label" class="stat">
            <p class="stat__value">{{ stat.value }}</p>
            <p class="stat__label">{{ stat.label }}</p>
          </div>
        </div>
      </div>

      <div
        class="hero__visual"
        aria-label="지식 베이스에서 작업 관리 보드로, 작업 관리 보드에서 메시징 채널로 이어지는 흐름 시뮬레이션"
      >
        <div class="flow flow--wiki">
          <header>
            <span>Wiki</span>
            <strong>분기 전략 문서</strong>
          </header>
          <p>AI 요약 완료 · 핵심 액션 3건 추출</p>
          <div class="flow__tags">
            <span>#launch</span>
            <span>#marketing</span>
            <span>#priority-high</span>
          </div>
        </div>

        <div class="flow flow--kanban">
          <header>
            <span>Kanban</span>
            <strong>Q2 런칭 준비</strong>
          </header>
          <ul>
            <li>기획 검토 완료</li>
            <li>디자인 QA 진행중</li>
            <li>릴리즈 블로커 1건</li>
          </ul>
        </div>

        <div class="flow flow--channel">
          <header>
            <span>Channel</span>
            <strong>#launch-task-thread</strong>
          </header>
          <p>
            "이 카드 기준으로 QA 이슈 정리했어요"<br />
            "다음 스프린트로 넘기기 전에 PM 확인 부탁"
          </p>
        </div>
      </div>
    </section>

    <section class="trinity">
      <div class="section-heading">
        <h2>The Trinity Loop</h2>
        <p>지식 베이스, 작업 관리 보드, 메시징 채널이 하나의 흐름으로 이어집니다.</p>
      </div>

      <div class="trinity-grid">
        <article v-for="feature in trinityFeatures" :key="feature.title" class="trinity-card">
          <p class="trinity-card__kicker">{{ feature.kicker }}</p>
          <h3>{{ feature.title }}</h3>
          <p class="trinity-card__description">{{ feature.description }}</p>
          <ul>
            <li v-for="item in feature.bullets" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="insight">
      <div class="insight__copy">
        <p class="hero__eyebrow">AI Insight Layer</p>
        <h2>AI가 지금 확인해야 할 우선순위를 먼저 보여줍니다.</h2>
        <p>
          AI가 수천 개의 메시지와 문서 사이에서 지금 당신이 확인해야 할 우선순위를 제안합니다.
          관리자 화면에서 병목 구간과 지연 리스크를 즉시 파악할 수 있습니다.
        </p>
      </div>

      <aside class="briefing" aria-label="AI 브리핑 예시">
        <header>
          <strong>AI 브리핑</strong>
          <span>09:42 업데이트</span>
        </header>
        <div class="briefing__item">
          <p class="briefing__title">마감 임박</p>
          <p>Q2 런칭 태스크 4건이 24시간 내 만료됩니다.</p>
        </div>
        <div class="briefing__item">
          <p class="briefing__title">협업 병목</p>
          <p>디자인 검토 대기 11건이 동일 승인자에게 몰려 있습니다.</p>
        </div>
        <div class="briefing__item">
          <p class="briefing__title">추천 액션</p>
          <p>우선순위 P1 카드 3건을 오늘 스탠드업 안건으로 등록하세요.</p>
        </div>
      </aside>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../lib/axios";

const onlineCount = ref(null);
const onlineCountLabel = computed(() => {
  if (onlineCount.value === null) return "-";
  return `${onlineCount.value}명`;
});

const loadOnlineCount = async () => {
  try {
    const response = await api.get("/metrics/online");
    const sockets = Number(response?.data?.data?.sockets ?? 0);
    onlineCount.value = Number.isFinite(sockets) ? sockets : 0;
  } catch (error) {
    onlineCount.value = null;
  }
};

const stats = [
  { value: "1,280", label: "주간 자동화 액션" },
  { value: "97%", label: "이슈 맥락 연결률" },
  { value: "3.2x", label: "결정 속도 향상" },
  { value: "0", label: "탭 왕복 필요" },
];

const trinityFeatures = computed(() => [
  {
    kicker: "Wiki",
    title: "지식 베이스 / 문서",
    description: "기획과 아이디어를 기록하는 조직의 뇌",
    bullets: [
      "AI 요약으로 핵심 의사결정 자동 추출",
      "자동 태그로 문서 연결 맥락 강화",
      "프로젝트 기준 위키 히스토리 추적",
    ],
  },
  {
    kicker: "Kanban",
    title: "작업 관리 / 보드",
    description: "문서 속 할 일을 카드로 바꾸는 실행의 중심",
    bullets: [
      "문서 블록 드래그로 카드 즉시 생성",
      "상태 추적과 일정 관리 일원화",
      "카드별 담당자/우선순위 자동 동기화",
    ],
  },
  {
    kicker: "Channel",
    title: "소통 / 메시징",
    description: "작업 맥락을 잃지 않는 실시간 연결",
    bullets: [
      "칸반 카드/위키 페이지 연동 스레드",
      "업무 단위 알림과 토론 기록 보존",
      "결정 근거를 채팅과 함께 자동 아카이빙",
    ],
  },
]);

onMounted(() => {
  loadOnlineCount();
});
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 56px;
  color: var(--color-text);
}

.hero {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 28px;
  align-items: stretch;
}

.hero__eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--color-text-muted);
}

.hero__title {
  margin: 0 0 12px;
  font-size: clamp(30px, 5vw, 52px);
  line-height: 1.1;
}

.hero__subtitle {
  margin: 0 0 24px;
  color: var(--color-text-muted);
  font-size: 15px;
  max-width: 480px;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.hero__presence {
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stat {
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-accent) 10%, var(--color-card-bg)),
    var(--color-card-bg)
  );
  border: 1px solid var(--color-border);
}

.stat__value {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}

.stat__label {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.hero__visual {
  position: relative;
  min-height: 420px;
  border-radius: 20px;
  padding: 20px;
  background:
    radial-gradient(
      circle at 12% 10%,
      color-mix(in srgb, var(--color-info) 20%, transparent),
      transparent 30%
    ),
    radial-gradient(
      circle at 84% 90%,
      color-mix(in srgb, var(--color-success) 18%, transparent),
      transparent 34%
    ),
    var(--color-card-bg);
  border: 1px solid var(--color-border);
  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.flow {
  position: absolute;
  width: min(290px, 78%);
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 14px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.flow header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.flow header span {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.flow header strong {
  font-size: 13px;
}

.flow p,
.flow ul {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-muted);
}

.flow ul {
  padding-left: 16px;
  display: grid;
  gap: 4px;
}

.flow__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.flow__tags span {
  font-size: 11px;
  border-radius: 999px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  color: var(--color-link);
}

.flow--wiki {
  top: 16px;
  left: 18px;
  animation: drift-y 4.2s ease-in-out infinite;
}

.flow--kanban {
  top: 142px;
  right: 24px;
  animation: drift-x 4.2s ease-in-out infinite 0.5s;
}

.flow--channel {
  bottom: 20px;
  left: 40px;
  animation: drift-y 4.2s ease-in-out infinite 1s;
}

.section-heading h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.section-heading p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.trinity {
  display: grid;
  gap: 20px;
}

.trinity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.trinity-card {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-card-bg);
}

.trinity-card__kicker {
  margin: 0 0 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.trinity-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.trinity-card__description {
  margin: 0;
  font-size: 14px;
  color: var(--color-text);
}

.trinity-card ul {
  margin: 14px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.insight {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 18px;
  align-items: start;
}

.insight h2 {
  margin: 0 0 10px;
  font-size: 28px;
  line-height: 1.25;
}

.insight p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.briefing {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--color-accent) 10%, var(--color-card-bg)),
    var(--color-card-bg)
  );
}

.briefing header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
}

.briefing header strong {
  font-size: 16px;
}

.briefing header span {
  font-size: 12px;
  color: var(--color-text-muted);
}

.briefing__item + .briefing__item {
  margin-top: 12px;
}

.briefing__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.briefing__item p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

@keyframes drift-y {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes drift-x {
  0%,
  100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(8px);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 980px) {
  .hero,
  .insight {
    flex-direction: column;
    grid-template-columns: 1fr;
  }

  .trinity-grid {
    grid-template-columns: 1fr;
  }

  .hero__visual {
    min-height: 500px;
  }
}

@media (max-width: 640px) {
  .hero__stats {
    grid-template-columns: 1fr;
  }

  .flow {
    width: calc(100% - 32px);
  }

  .flow--wiki {
    left: 16px;
    top: 18px;
  }

  .flow--kanban {
    right: 16px;
    top: 186px;
  }

  .flow--channel {
    left: 16px;
    bottom: 20px;
  }
}
</style>
