<template>
  <section class="pricing-close">
    <h2 class="pricing-close__headline">{{ copy.close.headline }}</h2>
    <router-link class="btn btn--lg" to="/signup">{{ copy.close.cta }}</router-link>
  </section>
</template>

<script setup>
import { usePricingCopy } from "../../../composables/usePricingCopy";

const { copy } = usePricingCopy();
</script>

<style scoped>
.pricing-close {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-10) var(--space-4) var(--space-12);
  text-align: center;
}

.pricing-close__headline {
  margin: 0;
  max-width: 20em;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
}
</style>
