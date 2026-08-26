<template>
  <header class="pricing-header">
    <h1 class="pricing-header__headline">{{ copy.header.headline }}</h1>
    <p class="pricing-header__sub">
      <template v-for="(line, index) in copy.header.subLines" :key="index">
        {{ line }}<br v-if="index < copy.header.subLines.length - 1" />
      </template>
    </p>

    <div class="pricing-header__billing">
      <BillingCycleToggle v-model="billingCycle" />
      <p v-if="billingCycle === 'yearly'" class="pricing-header__badge">
        {{ copy.billingToggle.yearlySelectedBadge }}
      </p>
    </div>
  </header>
</template>

<script setup>
import { pricingCopy as copy } from "../../../constants/pricingCopy";
import BillingCycleToggle from "./BillingCycleToggle.vue";

const billingCycle = defineModel("billingCycle", { type: String, required: true });
</script>

<style scoped>
.pricing-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
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
  max-width: 520px;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  line-height: 1.85;
  color: var(--color-text-muted);
}

.pricing-header__billing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.pricing-header__badge {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-accent);
}

@media (max-width: 767px) {
  .pricing-header {
    padding: var(--space-10) var(--space-4) var(--space-6);
  }
}
</style>
