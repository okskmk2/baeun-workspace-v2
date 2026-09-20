<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import FeatureGrid from "./FeatureGrid.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });
</script>

<template>
  <section id="features" ref="rootEl" class="features-section">
    <div class="features-section__inner landing-wrap">
      <header class="landing-section-head reveal">
        <p class="landing-kicker">{{ $t("landing.features.kicker") }}</p>
        <h2 class="landing-headline">{{ $t("landing.features.headline") }}</h2>
        <p class="landing-lede">{{ $t("landing.features.sub") }}</p>
      </header>
      <FeatureGrid />
    </div>
  </section>
</template>

<style scoped>
.features-section {
  padding: var(--space-section) 0;
  scroll-margin-top: 80px;
  background-color: color-mix(in srgb, var(--mock-fill) 32%, var(--color-bg));
}

.features-section__inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

@media (max-width: 767px) {
  .features-section {
    padding: var(--space-section-m) 0;
  }
}
</style>
