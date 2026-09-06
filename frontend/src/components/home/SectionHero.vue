<template>
  <section id="hero" class="hero">
    <div class="hero__copy landing-wrap">
      <h1 class="hero__headline">{{ $t("landing.hero.headline") }}</h1>
      <p class="hero__sub">{{ $t("landing.hero.sub") }}</p>
      <p class="hero__note">{{ $t("landing.hero.note") }}</p>
      <div class="hero__cta">
        <router-link class="btn btn--lg" to="/signup">{{ $t("landing.cta.start") }}</router-link>
        <router-link class="btn btn--lg btn--secondary" to="/pricing">
          {{ $t("landing.cta.pricing") }}
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
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
  max-width: 28em;
  color: var(--color-muted);
  font-size: var(--fs-lede);
  line-height: 1.8;
}

.hero__note {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 767px) {
  .hero {
    padding: 48px 0 64px;
    min-height: auto;
  }

  .hero__cta {
    flex-direction: column;
    width: 100%;
  }

  .hero__cta .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
