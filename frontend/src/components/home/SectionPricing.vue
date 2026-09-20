<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });

const items = ["workspace", "project", "member"];
</script>

<template>
  <section id="pricing-teaser" ref="rootEl" class="pricing-teaser">
    <div class="pricing-teaser__inner landing-wrap">
      <header class="landing-section-head reveal">
        <p class="landing-kicker">{{ $t("landing.pricing.kicker") }}</p>
        <h2 class="landing-headline">{{ $t("landing.pricing.headline") }}</h2>
        <p class="landing-lede">{{ $t("landing.pricing.body") }}</p>
      </header>

      <div class="pricing-teaser__grid">
        <article v-for="(key, index) in items" :key="key" class="pricing-teaser__card reveal">
          <span class="pricing-teaser__index">0{{ index + 1 }}</span>
          <h3>{{ $t(`landing.pricing.items.${key}.title`) }}</h3>
          <p>{{ $t(`landing.pricing.items.${key}.body`) }}</p>
        </article>
      </div>

      <p class="pricing-teaser__note reveal">{{ $t("landing.pricing.storage") }}</p>

      <div class="pricing-teaser__cta reveal">
        <router-link class="btn btn--lg" to="/pricing">{{ $t("landing.pricing.cta") }}</router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pricing-teaser {
  padding: var(--space-section) 0;
  scroll-margin-top: 80px;
}

.pricing-teaser__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.pricing-teaser__grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pricing-teaser__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 22px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  background-color: color-mix(in srgb, var(--mock-bg) 70%, var(--color-bg));
}

.pricing-teaser__index {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.pricing-teaser__card h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.pricing-teaser__card p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.pricing-teaser__note {
  margin: 0;
  max-width: 36em;
  text-align: center;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.pricing-teaser__cta .btn {
  min-width: 180px;
}

.pricing-teaser__card:nth-child(2) {
  transition-delay: 80ms;
}

.pricing-teaser__card:nth-child(3) {
  transition-delay: 160ms;
}

@media (max-width: 767px) {
  .pricing-teaser {
    padding: var(--space-section-m) 0;
  }

  .pricing-teaser__grid {
    grid-template-columns: 1fr;
  }

  .pricing-teaser__card:nth-child(n) {
    transition-delay: 0ms;
  }

  .pricing-teaser__cta .btn {
    width: min(100%, 280px);
  }
}
</style>
