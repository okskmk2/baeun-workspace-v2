<template>
  <header class="pricing-header">
    <h1 class="pricing-header__headline">{{ copy.header.headline }}</h1>
    <p class="pricing-header__sub">
      <template v-for="(line, index) in copy.header.subLines" :key="index">
        {{ line }}<br v-if="index < copy.header.subLines.length - 1" />
      </template>
    </p>
    <div class="pricing-header__cta">
      <router-link class="btn btn--lg" to="/signup">{{ copy.header.cta }}</router-link>
      <router-link class="btn btn--lg btn--secondary" :to="{ path: '/pricing', hash: '#calculator' }">
        {{ copy.header.calculatorCta }}
      </router-link>
    </div>
  </header>
</template>

<script setup>
import { usePricingCopy } from "../../../composables/usePricingCopy";

const { copy } = usePricingCopy();
</script>

<style scoped>
.pricing-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  text-align: center;
  padding: var(--space-12) var(--space-4) var(--space-8);
}

.pricing-header__headline {
  margin: 0;
  max-width: 880px;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: var(--text-hero);
  line-height: 1.35;
  letter-spacing: -0.01em;
  color: var(--color-text);
}

.pricing-header__sub {
  margin: 0;
  max-width: 36em;
  font-size: var(--text-body);
  line-height: 1.85;
  color: var(--color-text-muted);
}

.pricing-header__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.pricing-header__cta .btn {
  min-width: 148px;
}

@media (max-width: 767px) {
  .pricing-header {
    padding: var(--space-10) var(--space-4) var(--space-6);
  }

  .pricing-header__cta {
    flex-direction: column;
    width: 100%;
  }

  .pricing-header__cta .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
