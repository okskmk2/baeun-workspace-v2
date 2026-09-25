<template>
  <section class="pricing-close" aria-labelledby="pricing-close-title">
    <h2 id="pricing-close-title" class="pricing-close__headline">{{ copy.close.headline }}</h2>
    <div class="pricing-close__cta">
      <router-link class="btn btn--lg" to="/signup">{{ copy.close.cta }}</router-link>
      <router-link class="btn btn--lg btn--secondary" :to="{ path: '/pricing', hash: '#calculator' }">
        {{ copy.close.calculatorCta }}
      </router-link>
    </div>
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
  padding: var(--space-12) var(--space-4) var(--space-12);
  text-align: center;
}

.pricing-close__headline {
  margin: 0;
  max-width: 18em;
  font-family: var(--font-sans);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text);
}

.pricing-close__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.pricing-close__cta .btn {
  min-width: 148px;
}

@media (max-width: 767px) {
  .pricing-close {
    padding: var(--space-10) var(--space-4);
  }

  .pricing-close__cta {
    flex-direction: column;
    width: 100%;
  }

  .pricing-close__cta .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
