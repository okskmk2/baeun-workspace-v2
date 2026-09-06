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
        <CalculatorSlider
          v-model="usedGb"
          :label="copy.calculator.sliders.storage.label"
          :unit="copy.calculator.sliders.storage.unit"
          :input-aria="copy.calculator.directInput"
          :min="CALCULATOR_SLIDERS.storageGb.min"
          :max="CALCULATOR_SLIDERS.storageGb.max"
          :step="CALCULATOR_SLIDERS.storageGb.step"
        />
      </div>

      <div class="price-calculator__result">
        <PriceSummaryPanel
          :is-free="isFree"
          :primary-total="monthlyTotal"
          :rows="rows"
          :show-transition-notice="showTransitionNotice"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  CALCULATOR_SLIDERS,
  FREE,
  billableSlotCount,
  extraStorageGbUniform,
  slotUnitPrice,
  storageUsdUniform,
} from "../../../constants/pricing";
import { usePricingCopy } from "../../../composables/usePricingCopy";
import CalculatorSlider from "./CalculatorSlider.vue";
import PriceSummaryPanel from "./PriceSummaryPanel.vue";

const { copy } = usePricingCopy();

const workspaces = ref(CALCULATOR_SLIDERS.workspaces.default);
const projects = ref(CALCULATOR_SLIDERS.projects.default);
const members = ref(CALCULATOR_SLIDERS.members.default);
const usedGb = ref(CALCULATOR_SLIDERS.storageGb.default);

const workspacePrice = slotUnitPrice("workspace") ?? 0;
const projectPrice = slotUnitPrice("project") ?? 0;
const memberPrice = slotUnitPrice("member") ?? 0;

const billableWorkspace = computed(() => billableSlotCount(workspaces.value, FREE.workspace));
const billableProject = computed(() => billableSlotCount(projects.value, FREE.project));
const billableMember = computed(() => billableSlotCount(members.value, FREE.member));
const extraGb = computed(() => extraStorageGbUniform(workspaces.value, usedGb.value));
const storageTotal = computed(() => storageUsdUniform(workspaces.value, usedGb.value));

const monthlyTotal = computed(
  () =>
    billableWorkspace.value * workspacePrice +
    billableProject.value * projectPrice +
    billableMember.value * memberPrice +
    storageTotal.value,
);

const isFree = computed(() => monthlyTotal.value === 0);

const formatGb = (value) => {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};

const rows = computed(() => {
  const breakdown = copy.value.calculator.breakdown;

  return [
    {
      key: "workspace",
      label: breakdown.workspaceLabel,
      detail: breakdown.countDetail(workspaces.value, billableWorkspace.value),
      amount: billableWorkspace.value * workspacePrice,
    },
    {
      key: "project",
      label: breakdown.projectLabel,
      detail: breakdown.countDetail(projects.value, billableProject.value),
      amount: billableProject.value * projectPrice,
    },
    {
      key: "member",
      label: breakdown.memberLabel,
      detail: breakdown.memberDetail(members.value, billableMember.value),
      amount: billableMember.value * memberPrice,
    },
    {
      key: "storage",
      label: breakdown.storageLabel,
      detail: breakdown.storageDetail(formatGb(extraGb.value)),
      amount: storageTotal.value,
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
