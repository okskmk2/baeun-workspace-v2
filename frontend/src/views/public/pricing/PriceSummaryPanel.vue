<template>
  <aside class="price-summary">
    <template v-if="props.isFree">
      <p class="price-summary__free-title" aria-hidden="true">{{ copy.calculator.freeState.title }}</p>
      <p class="price-summary__free-subtitle" aria-hidden="true">{{ copy.calculator.freeState.subtitle }}</p>
      <p class="sr-only" aria-live="polite" aria-atomic="true">
        {{ copy.calculator.freeState.title }} {{ copy.calculator.freeState.subtitle }}
      </p>
      <router-link class="btn btn--lg price-summary__cta" to="/signup">
        {{ copy.calculator.freeState.cta }}
      </router-link>
    </template>

    <template v-else>
      <p v-if="props.showTransitionNotice" class="price-summary__notice">
        {{ copy.calculator.transitionNotice }}
      </p>

      <div class="price-summary__total">
        <span class="price-summary__amount" aria-hidden="true">{{ formattedAmount }}</span>
        <span class="price-summary__period" aria-hidden="true">{{ copy.calculator.perMonthSuffix }}</span>
        <span class="sr-only" aria-live="polite" aria-atomic="true">
          {{ stableFormattedAmount }} {{ copy.calculator.perMonthSuffix }}
        </span>
      </div>
      <p v-if="props.billingCycle === 'yearly'" class="price-summary__yearly-note">
        {{ yearlyNoteText }}
      </p>

      <dl class="price-summary__breakdown">
        <template v-for="row in props.rows" :key="row.key">
          <dt class="price-summary__row-label">
            <span>{{ row.label }}</span>
            <span class="price-summary__row-detail">{{ row.detail }}</span>
          </dt>
          <dd class="price-summary__row-amount">{{ formatRowAmount(row.amount) }}</dd>
        </template>

        <dt class="price-summary__row-label price-summary__row-label--total">
          {{ copy.calculator.breakdown.totalLabel }}
        </dt>
        <dd class="price-summary__row-amount price-summary__row-amount--total">
          {{ formattedAmount }} {{ copy.calculator.perMonthSuffix }}
        </dd>
      </dl>

      <router-link class="btn btn--lg price-summary__cta" to="/signup">
        {{ copy.calculator.paidCta }}
      </router-link>
    </template>
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { YEARLY_DISCOUNT } from "../../../constants/pricing";
import { usePricingCopy } from "../../../composables/usePricingCopy";
import { formatSlotPrice } from "../../../utils/currency";

const { copy } = usePricingCopy();

const props = defineProps({
  billingCycle: { type: String, required: true },
  isFree: { type: Boolean, required: true },
  primaryTotal: { type: Number, required: true },
  yearlyTotal: { type: Number, default: 0 },
  rows: { type: Array, default: () => [] },
  showTransitionNotice: { type: Boolean, default: false },
});

const displayedAmount = ref(props.primaryTotal);
let rafId = null;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const animateTo = (target) => {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function" || prefersReducedMotion()) {
    displayedAmount.value = target;
    return;
  }

  if (rafId !== null) cancelAnimationFrame(rafId);

  const start = displayedAmount.value;
  const startTime = performance.now();
  const duration = 260;

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    displayedAmount.value = start + (target - start) * eased;

    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      displayedAmount.value = target;
      rafId = null;
    }
  };

  rafId = requestAnimationFrame(step);
};

watch(
  () => props.primaryTotal,
  (newValue) => animateTo(newValue),
);

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId);
});

const formatRowAmount = (amount) => {
  const value = props.billingCycle === "yearly" ? amount * (1 - YEARLY_DISCOUNT) : amount;
  return formatSlotPrice(value);
};

const formattedAmount = computed(() => formatSlotPrice(displayedAmount.value));
const stableFormattedAmount = computed(() => formatSlotPrice(props.primaryTotal));
const yearlyNoteText = computed(() => copy.value.calculator.yearlyNote(formatSlotPrice(props.yearlyTotal)));
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.price-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-7);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
}

.price-summary__free-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-price);
  font-weight: 700;
  color: var(--color-text);
}

.price-summary__free-subtitle {
  margin: 0;
  font-size: var(--text-body);
  color: var(--color-text-muted);
}

.price-summary__notice {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--color-surface-alt, var(--color-surface));
  color: var(--color-text-muted);
  font-size: var(--text-caption);
}

.price-summary__total {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.price-summary__amount {
  font-size: var(--text-price);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.price-summary__period {
  font-size: var(--text-body);
  color: var(--color-text-muted);
}

.price-summary__yearly-note {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.price-summary__breakdown {
  margin: 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  row-gap: var(--space-3);
  column-gap: var(--space-4);
}

.price-summary__row-label {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
}

.price-summary__row-detail {
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-text-muted);
}

.price-summary__row-amount {
  margin: 0;
  font-size: var(--text-body);
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
  text-align: right;
}

.price-summary__row-label--total {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-body);
  font-weight: 700;
}

.price-summary__row-amount--total {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  font-weight: 700;
}

.price-summary__cta {
  margin-top: var(--space-2);
  align-self: stretch;
  width: auto;
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .price-summary__amount {
    transition: none;
  }
}
</style>
