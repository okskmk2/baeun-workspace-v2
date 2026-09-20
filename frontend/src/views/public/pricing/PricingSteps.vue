<template>
  <section class="pricing-steps" aria-labelledby="pricing-steps-title">
    <h2 id="pricing-steps-title" class="pricing-steps__title">{{ copy.steps.title }}</h2>
    <ol class="pricing-steps__list">
      <li v-for="(item, index) in copy.steps.items" :key="item.title" class="pricing-steps__item">
        <span class="pricing-steps__index">0{{ index + 1 }}</span>
        <h3>{{ item.title }}</h3>
        <p>{{ item.body }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { usePricingCopy } from "../../../composables/usePricingCopy";

const { copy } = usePricingCopy();
</script>

<style scoped>
.pricing-steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: 0 var(--space-4) var(--space-10);
  max-width: 1040px;
  margin: 0 auto;
}

.pricing-steps__title {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.pricing-steps__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.pricing-steps__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
}

.pricing-steps__index {
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.pricing-steps__item h3 {
  margin: 0;
  font-size: var(--text-h2);
  font-weight: 700;
}

.pricing-steps__item p {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.65;
  color: var(--color-text-muted);
}

@media (max-width: 1023px) {
  .pricing-steps__list {
    grid-template-columns: 1fr;
  }
}
</style>
