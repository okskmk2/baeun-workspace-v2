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
      <h2 class="features-section__headline reveal">{{ $t("landing.features.headline") }}</h2>
      <FeatureGrid />
    </div>
  </section>
</template>

<style scoped>
.features-section {
  padding: var(--space-section) 0;
  scroll-margin-top: 80px;
}

.features-section__inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.features-section__headline {
  margin: 0 auto;
  max-width: 18em;
  font-family: var(--font-serif);
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 767px) {
  .features-section {
    padding: var(--space-section-m) 0;
  }
}
</style>
