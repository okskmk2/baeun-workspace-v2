<template>
  <section id="calculator" class="price-calculator" aria-labelledby="price-calculator-title">
    <div class="price-calculator__intro">
      <h2 id="price-calculator-title" class="price-calculator__title">{{ copy.calculator.title }}</h2>
      <p class="price-calculator__subtitle">{{ copy.calculator.subtitle }}</p>
    </div>

    <div class="price-calculator__body">
      <div class="price-calculator__inputs">
        <CalculatorSlider
          v-model="workspaces"
          :label="copy.calculator.sliders.workspaces.label"
          :unit="copy.calculator.sliders.workspaces.unit"
          :min="CALCULATOR_SLIDERS.workspaces.min"
          :max="CALCULATOR_SLIDERS.workspaces.max"
        />
        <CalculatorSlider
          v-model="projects"
          :label="copy.calculator.sliders.projects.label"
          :unit="copy.calculator.sliders.projects.unit"
          :min="CALCULATOR_SLIDERS.projects.min"
          :max="CALCULATOR_SLIDERS.projects.max"
        />
        <CalculatorSlider
          v-model="members"
          :label="copy.calculator.sliders.members.label"
          :unit="copy.calculator.sliders.members.unit"
          :min="CALCULATOR_SLIDERS.members.min"
          :max="CALCULATOR_SLIDERS.members.max"
        />

        <div class="price-calculator__business">
          <div class="price-calculator__business-text">
            <p class="price-calculator__business-label">{{ copy.calculator.businessToggle.label }}</p>
            <p class="price-calculator__business-desc">{{ copy.calculator.businessToggle.description }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="businessEnabled"
            :aria-label="copy.calculator.businessToggle.label"
            class="price-calculator__switch"
            :class="{ 'price-calculator__switch--on': businessEnabled }"
            @click="businessEnabled = !businessEnabled"
          >
            <span class="price-calculator__switch-thumb"></span>
          </button>
        </div>
      </div>

      <div class="price-calculator__result">
        <PriceSummaryPanel
          :billing-cycle="props.billingCycle"
          :is-free="isFree"
          :primary-total="primaryTotal"
          :yearly-total="yearlyTotal"
          :rows="rows"
          :show-transition-notice="showTransitionNotice"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { CALCULATOR_SLIDERS, FREE, PRICE, YEARLY_DISCOUNT } from "../../../constants/pricing";
import { pricingCopy as copy } from "../../../constants/pricingCopy";
import CalculatorSlider from "./CalculatorSlider.vue";
import PriceSummaryPanel from "./PriceSummaryPanel.vue";

const props = defineProps({
  billingCycle: { type: String, required: true },
});

const workspaces = ref(CALCULATOR_SLIDERS.workspaces.default);
const projects = ref(CALCULATOR_SLIDERS.projects.default);
const members = ref(CALCULATOR_SLIDERS.members.default);
const businessEnabled = ref(false);

const billableWorkspace = computed(() => Math.max(0, workspaces.value - FREE.workspace));
const billableProject = computed(() => Math.max(0, projects.value - FREE.project));
const billableMember = computed(() => Math.max(0, members.value - FREE.member));

const businessCost = computed(() => (businessEnabled.value ? workspaces.value * PRICE.business : 0));

const monthlyTotal = computed(
  () =>
    billableWorkspace.value * PRICE.workspace +
    billableProject.value * PRICE.project +
    billableMember.value * PRICE.member +
    businessCost.value,
);

const yearlyTotal = computed(() => monthlyTotal.value * 12 * (1 - YEARLY_DISCOUNT));
const yearlyMonthlyEquivalent = computed(() => yearlyTotal.value / 12);

const isFree = computed(() => monthlyTotal.value === 0);

const primaryTotal = computed(() =>
  props.billingCycle === "yearly" ? yearlyMonthlyEquivalent.value : monthlyTotal.value,
);

const breakdown = copy.calculator.breakdown;

const rows = computed(() => {
  const list = [
    {
      key: "workspace",
      label: breakdown.workspaceLabel,
      detail: breakdown.countDetail(workspaces.value, billableWorkspace.value),
      amount: billableWorkspace.value * PRICE.workspace,
    },
    {
      key: "project",
      label: breakdown.projectLabel,
      detail: breakdown.countDetail(projects.value, billableProject.value),
      amount: billableProject.value * PRICE.project,
    },
    {
      key: "member",
      label: breakdown.memberLabel,
      detail: breakdown.memberDetail(members.value, billableMember.value),
      amount: billableMember.value * PRICE.member,
    },
  ];

  if (businessEnabled.value) {
    list.push({
      key: "business",
      label: breakdown.businessLabel,
      detail: breakdown.businessDetail(workspaces.value),
      amount: businessCost.value,
    });
  }

  return list;
});

const showTransitionNotice = ref(false);
let noticeTimeoutId = null;

watch(monthlyTotal, (newValue, oldValue) => {
  if (oldValue === 0 && newValue > 0) {
    showTransitionNotice.value = true;
    if (noticeTimeoutId) clearTimeout(noticeTimeoutId);
    noticeTimeoutId = setTimeout(() => {
      showTransitionNotice.value = false;
    }, 4000);
    return;
  }
  if (newValue === 0) {
    showTransitionNotice.value = false;
  }
});

onBeforeUnmount(() => {
  if (noticeTimeoutId) clearTimeout(noticeTimeoutId);
});
</script>

<style scoped>
.price-calculator {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-4);
  max-width: 1120px;
  margin: 0 auto;
}

.price-calculator__intro {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.price-calculator__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.price-calculator__subtitle {
  margin: 0;
  font-size: var(--text-body);
  color: var(--color-text-muted);
}

.price-calculator__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
  gap: var(--space-8);
  align-items: start;
}

.price-calculator__inputs {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
  padding: var(--space-7);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.price-calculator__business {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--color-border);
}

.price-calculator__business-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-calculator__business-label {
  margin: 0;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
}

.price-calculator__business-desc {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.price-calculator__switch {
  flex-shrink: 0;
  width: 52px;
  height: 32px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background-color: var(--color-page-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

.price-calculator__switch-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--color-text-muted);
  transition: transform var(--transition-base), background-color var(--transition-base);
}

.price-calculator__switch--on {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}

.price-calculator__switch--on .price-calculator__switch-thumb {
  transform: translateX(20px);
  background-color: var(--color-accent-contrast);
}

.price-calculator__switch:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.price-calculator__result {
  position: sticky;
  top: var(--space-6);
}

@media (max-width: 1023px) {
  .price-calculator__body {
    grid-template-columns: 1fr;
  }

  .price-calculator__result {
    position: static;
  }
}

@media (prefers-reduced-motion: reduce) {
  .price-calculator__switch,
  .price-calculator__switch-thumb {
    transition: none;
  }
}
</style>
