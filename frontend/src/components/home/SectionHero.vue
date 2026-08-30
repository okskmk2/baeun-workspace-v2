<script setup>
const scrollToFragmented = () => {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("fragmented")?.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
};
</script>

<template>
  <section id="hero" class="hero">
    <div class="hero__copy landing-wrap">
      <h1 class="hero__headline">{{ $t("landing.hero.headline") }}</h1>
      <p class="hero__sub">{{ $t("landing.hero.sub") }}</p>
    </div>
    <button
      class="hero__scroll"
      type="button"
      :aria-label="$t('landing.hero.scroll')"
      @click="scrollToFragmented"
    >
      <svg viewBox="0 0 16 24" aria-hidden="true">
        <path d="M8 3v16M3 14l5 6 5-6" fill="none" stroke="currentColor" stroke-width="1.25" />
      </svg>
    </button>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 72px);
  min-height: calc(100svh - 72px);
  padding: 64px 0 80px;
  text-align: center;
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 820px;
}

.hero__headline {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-display);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.hero__sub {
  margin: 0;
  max-width: 22em;
  color: var(--color-muted);
  font-size: var(--fs-lede);
  line-height: 1.8;
  white-space: pre-line;
}

.hero__scroll {
  position: absolute;
  bottom: 28px;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 0;
  background: none;
  color: var(--color-muted);
  transform: translateX(-50%);
  cursor: pointer;
}

.hero__scroll svg {
  width: 14px;
  height: 20px;
  animation: hero-cue 2.4s var(--ease) infinite;
}

@keyframes hero-cue {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.55;
  }
  50% {
    transform: translateY(5px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__scroll svg {
    animation: none;
  }
}
</style>
