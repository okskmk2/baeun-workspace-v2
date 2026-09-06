<template>
  <div class="calculator-slider">
    <div class="calculator-slider__head">
      <span class="calculator-slider__label">{{ label }}</span>
      <div class="calculator-slider__value">
        <input
          :id="numberId"
          type="number"
          class="calculator-slider__number"
          :min="min"
          :max="max"
          :step="step"
          :aria-label="`${label} ${inputAria}`"
          v-model.number="model"
          @change="clamp"
        />
        <span class="calculator-slider__unit" aria-hidden="true">{{ unit }}</span>
      </div>
    </div>

    <input
      :id="sliderId"
      type="range"
      class="calculator-slider__range"
      :min="min"
      :max="max"
      :step="step"
      :style="{ '--fill-percent': `${fillPercent}%` }"
      :aria-label="label"
      :aria-valuetext="`${model}${unit}`"
      v-model.number="model"
    />

    <div class="calculator-slider__range-labels" aria-hidden="true">
      <span>{{ min }}{{ unit }}</span>
      <span>{{ max }}{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from "vue";

const { label, unit, min, max, step, inputAria } = defineProps({
  label: { type: String, required: true },
  unit: { type: String, default: "" },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  inputAria: { type: String, default: "" },
});

const model = defineModel({ type: Number, required: true });

const uid = useId();
const sliderId = `${uid}-slider`;
const numberId = `${uid}-number`;

const fillPercent = computed(() => {
  const range = max - min;
  if (range <= 0) return 0;
  return ((model.value - min) / range) * 100;
});

const decimals = computed(() => {
  const text = String(step);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
});

const clamp = () => {
  if (Number.isNaN(model.value)) {
    model.value = min;
    return;
  }
  const factor = 10 ** decimals.value;
  const stepped = Math.round(model.value / step) * step;
  const clamped = Math.min(max, Math.max(min, stepped));
  model.value = Math.round(clamped * factor) / factor;
};
</script>

<style scoped>
.calculator-slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.calculator-slider__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.calculator-slider__label {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
}

.calculator-slider__value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.calculator-slider__number {
  width: 72px;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background-color: var(--color-input-bg, var(--color-surface));
  color: var(--color-text);
  font-size: var(--text-body);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.calculator-slider__unit {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.calculator-slider__range {
  --fill-percent: 0%;
  width: 100%;
  min-height: 44px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.calculator-slider__range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--color-accent) var(--fill-percent),
    var(--color-border) var(--fill-percent)
  );
}

.calculator-slider__range::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background-color: var(--color-border);
}

.calculator-slider__range::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background-color: var(--color-accent);
}

.calculator-slider__range::-webkit-slider-thumb {
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -8px;
  border-radius: 50%;
  border: 3px solid var(--color-accent);
  background-color: var(--color-accent-contrast);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform var(--transition-base);
}

.calculator-slider__range::-webkit-slider-thumb:hover {
  transform: scale(1.08);
}

.calculator-slider__range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid var(--color-accent);
  background-color: var(--color-accent-contrast);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition: transform var(--transition-base);
}

.calculator-slider__range::-moz-range-thumb:hover {
  transform: scale(1.08);
}

.calculator-slider__range:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

.calculator-slider__range-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .calculator-slider__range::-webkit-slider-thumb,
  .calculator-slider__range::-moz-range-thumb {
    transition: none;
  }
}
</style>
