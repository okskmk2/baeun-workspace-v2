<template>
  <div class="billing-toggle" role="group" :aria-label="copy.billingToggle.ariaLabel">
    <button
      type="button"
      class="billing-toggle__item"
      :class="{ 'billing-toggle__item--active': model === 'monthly' }"
      :aria-pressed="model === 'monthly'"
      @click="model = 'monthly'"
    >
      {{ copy.billingToggle.monthlyLabel }}
    </button>
    <button
      type="button"
      class="billing-toggle__item"
      :class="{ 'billing-toggle__item--active': model === 'yearly' }"
      :aria-pressed="model === 'yearly'"
      @click="model = 'yearly'"
    >
      <span>{{ copy.billingToggle.yearlyLabel }}</span>
      <small>{{ copy.billingToggle.yearlyBadge }}</small>
    </button>
  </div>
</template>

<script setup>
import { pricingCopy as copy } from "../../../constants/pricingCopy";

const model = defineModel({ type: String, required: true });
</script>

<style scoped>
.billing-toggle {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-surface);
}

.billing-toggle__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-5);
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--transition-base),
    color var(--transition-base),
    border-color var(--transition-base);
}

.billing-toggle__item small {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--color-accent);
  background-color: color-mix(in srgb, var(--color-accent) 14%, var(--color-page-bg));
  border-radius: 999px;
  padding: 2px var(--space-2);
}

.billing-toggle__item--active {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-contrast);
}

.billing-toggle__item--active small {
  color: var(--color-accent);
  background-color: var(--color-accent-contrast);
}

.billing-toggle__item:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
