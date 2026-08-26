<template>
  <main ref="rootEl" class="home">
    <section class="hero">
      <div class="hero__frame">
        <h1 class="hero__headline">이것은 시간에 관한 문제다.</h1>
        <p class="hero__sub">
          문제를 푸는 시간보다,<br />
          툴을 오가는 시간이 더 길었다면.
        </p>
        <div class="hero__closing">
          <p class="hero__closing-line">이제, 일이 있는 곳에 모든 것이 있습니다.</p>
          <p class="hero__brand">바은 워크스페이스</p>
        </div>
        <div class="hero__actions">
          <router-link class="btn btn--lg" to="/signup">지금 시작하기</router-link>
          <a class="btn btn--secondary btn--lg" href="#features" @click="scrollToFeatures"
            >기능 둘러보기</a
          >
        </div>
      </div>
      <button
        class="hero__scroll-cue"
        type="button"
        aria-label="다음 섹션으로 스크롤"
        @click="scrollToNarrative"
      >
        ↓
      </button>
    </section>

    <section class="narrative">
      <div class="narrative__inner">
        <p class="narrative__block reveal">
          회의록은 문서 툴에, 할 일은 보드에, 대화는 메신저에 있었다.<br />
          답은 늘 어딘가에 있었지만, 어디에도 없었다.
        </p>
        <p class="narrative__block narrative__block--emphasis reveal">
          우리가 낭비한 것은 시간이 아니라,<br />
          집중할 수 있었던 시간이다.
        </p>
      </div>
    </section>

    <section id="features" class="solution">
      <div class="solution__inner">
        <div class="solution__intro reveal">
          <p>바은 워크스페이스.</p>
          <p>위키, 작업보드, 채널, 데이터 — 하나의 프로젝트 공간에서.</p>
          <p class="solution__tagline">Pay only for what you need.</p>
        </div>

        <div class="solution__grid">
          <article v-for="feature in features" :key="feature.title" class="solution__card reveal">
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </article>
        </div>

        <div class="solution__cta">
          <router-link class="btn btn--lg" to="/signup">무료로 시작하기</router-link>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const rootEl = ref(null);
let observer = null;

const features = [
  { title: "위키", description: "계층형 트리 구조의 지식베이스" },
  { title: "작업보드", description: "칸반 · 백로그 · 간트차트로 관리하는 태스크" },
  { title: "채널", description: "태스크와 직접 연동되는 실시간 채팅과 DM" },
  { title: "데이터", description: "테이블 생성 · 조인 · 시각화, 엑셀을 대체하는 데이터 관리" },
];

const scrollToFeatures = (event) => {
  event.preventDefault();
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const scrollToNarrative = () => {
  rootEl.value?.querySelector(".narrative")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

onMounted(() => {
  const targets = rootEl.value ? Array.from(rootEl.value.querySelectorAll(".reveal")) : [];
  if (!targets.length) return;

  if (typeof IntersectionObserver === "undefined") {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
  );

  targets.forEach((el) => observer.observe(el));
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.home {
  --font-serif: "Noto Serif KR", "SUIT", serif;
  color: var(--color-text);
}

.PublicLayout main.home {
  margin: 0;
  padding: 0;
  border-radius: 0;
  background-color: var(--color-page-bg);
}

/* ---------- Hero ---------- */

.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 120px 24px 96px;
}

.hero__frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
  max-width: 640px;
}

.hero__headline {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: clamp(32px, 6vw, 56px);
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.hero__sub {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(16px, 2.2vw, 20px);
  line-height: 1.85;
  color: var(--color-text-muted);
}

.hero__closing {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero__closing-line {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(15px, 2vw, 18px);
  color: var(--color-text-muted);
}

.hero__brand {
  margin: 0;
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: clamp(20px, 3vw, 26px);
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
}

.hero__scroll-cue {
  position: absolute;
  bottom: 36px;
  left: 50%;
  transform: translateX(-50%);
  background: none;
  border: none;
  padding: 8px;
  color: var(--color-text-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  animation: hero-bob 2.4s ease-in-out infinite;
}

@keyframes hero-bob {
  0%,
  100% {
    transform: translate(-50%, 0);
  }
  50% {
    transform: translate(-50%, 6px);
  }
}

/* ---------- Narrative ---------- */

.narrative {
  padding: 160px 24px;
}

.narrative__inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 140px;
}

.narrative__block {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(18px, 2.6vw, 24px);
  line-height: 1.9;
  text-align: center;
  color: var(--color-text);
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.narrative__block.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.narrative__block--emphasis {
  font-weight: 700;
  font-size: clamp(22px, 3.4vw, 30px);
}

.narrative__block--emphasis::before {
  content: "";
  display: block;
  width: 48px;
  height: 2px;
  margin: 0 auto 32px;
  background-color: var(--color-accent);
}

/* ---------- Solution ---------- */

.solution {
  scroll-margin-top: 24px;
  padding: 140px 24px 120px;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.solution__inner {
  max-width: 1040px;
  margin: 0 auto;
}

.solution__intro {
  max-width: 640px;
  margin: 0 auto 64px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
  font-family: var(--font-serif);
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.solution__intro.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.solution__intro p {
  margin: 0;
  font-size: clamp(18px, 2.4vw, 22px);
  line-height: 1.7;
}

.solution__tagline {
  margin-top: 8px !important;
  font-family: "SUIT", sans-serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.solution__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.solution__card {
  padding: 28px 22px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-card-bg);
  text-align: left;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}

.solution__card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.solution__card:nth-child(2) {
  transition-delay: 80ms;
}

.solution__card:nth-child(3) {
  transition-delay: 160ms;
}

.solution__card:nth-child(4) {
  transition-delay: 240ms;
}

.solution__card h3 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 700;
}

.solution__card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.solution__cta {
  margin-top: 56px;
  text-align: center;
}

/* ---------- Responsive ---------- */

@media (max-width: 900px) {
  .solution__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .hero {
    padding: 96px 20px 80px;
  }

  .narrative {
    padding: 100px 20px;
  }

  .narrative__inner {
    gap: 96px;
  }

  .solution {
    padding: 96px 20px 80px;
  }

  .solution__grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__scroll-cue {
    animation: none;
  }

  .narrative__block,
  .solution__intro,
  .solution__card {
    transition: opacity 0.4s ease;
    transform: none;
  }
}
</style>
