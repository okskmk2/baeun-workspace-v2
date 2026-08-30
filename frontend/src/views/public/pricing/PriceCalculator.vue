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
          :input-aria="copy.calculator.directInput"
          :min="CALCULATOR_SLIDERS.workspaces.min"
          :max="CALCULATOR_SLIDERS.workspaces.max"
        />
        <CalculatorSlider
          v-model="projects"
          :label="copy.calculator.sliders.projects.label"
          :unit="copy.calculator.sliders.projects.unit"
          :input-aria="copy.calculator.directInput"
          :min="CALCULATOR_SLIDERS.projects.min"
          :max="CALCULATOR_SLIDERS.projects.max"
        />
        <CalculatorSlider
          v-model="members"
          :label="copy.calculator.sliders.members.label"
          :unit="copy.calculator.sliders.members.unit"
          :input-aria="copy.calculator.directInput"
          :min="CALCULATOR_SLIDERS.members.min"
          :max="CALCULATOR_SLIDERS.members.max"
        />
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
import { usePricingCopy } from "../../../composables/usePricingCopy";
import CalculatorSlider from "./CalculatorSlider.vue";
import PriceSummaryPanel from "./PriceSummaryPanel.vue";

const { copy } = usePricingCopy();

const props = defineProps({
  billingCycle: { type: String, required: true },
});

const workspaces = ref(CALCULATOR_SLIDERS.workspaces.default);
const projects = ref(CALCULATOR_SLIDERS.projects.default);
const members = ref(CALCULATOR_SLIDERS.members.default);

const billableWorkspace = computed(() => Math.max(0, workspaces.value - FREE.workspace));
const billableProject = computed(() => Math.max(0, projects.value - FREE.project));
const billableMember = computed(() => Math.max(0, members.value - FREE.member));

const monthlyTotal = computed(
  () =>
    billableWorkspace.value * PRICE.workspace +
    billableProject.value * PRICE.project +
    billableMember.value * PRICE.member,
);

const yearlyTotal = computed(() => monthlyTotal.value * 12 * (1 - YEARLY_DISCOUNT));
const yearlyMonthlyEquivalent = computed(() => yearlyTotal.value / 12);

const isFree = computed(() => monthlyTotal.value === 0);

const primaryTotal = computed(() =>
  props.billingCycle === "yearly" ? yearlyMonthlyEquivalent.value : monthlyTotal.value,
);

const rows = computed(() => {
  const breakdown = copy.value.calculator.breakdown;

  return [
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
</style>
