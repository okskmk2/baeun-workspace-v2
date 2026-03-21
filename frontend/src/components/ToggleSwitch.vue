<template>
  <label class="toggle-switch" :class="{ 'toggle-switch--disabled': disabled }">
    <span v-if="label || description" class="toggle-switch__copy">
      <span v-if="label" class="toggle-switch__label">{{ label }}</span>
      <span v-if="description" class="toggle-switch__description">{{ description }}</span>
    </span>

    <span class="toggle-switch__control">
      <input
        class="toggle-switch__input"
        type="checkbox"
        role="switch"
        :checked="modelValue"
        :disabled="disabled"
        @change="handleChange"
      />
      <span class="toggle-switch__track" aria-hidden="true">
        <span class="toggle-switch__thumb"></span>
      </span>
      <span v-if="stateLabel" class="toggle-switch__state">{{ stateLabel }}</span>
    </span>
  </label>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  onLabel: {
    type: String,
    default: "",
  },
  offLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const stateLabel = computed(() => (props.modelValue ? props.onLabel : props.offLabel));

const handleChange = (event) => {
  const nextValue = event.target.checked;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};
</script>

<style scoped>
.toggle-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-switch--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-switch__copy {
  display: grid;
  gap: 4px;
}

.toggle-switch__label {
  font-size: 14px;
  font-weight: 600;
}

.toggle-switch__description {
  font-size: 13px;
  color: var(--color-text-muted);
}

.toggle-switch__control {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.toggle-switch__input {
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

.toggle-switch__track {
  width: 46px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-border) 72%, var(--color-bg) 28%);
  border: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent 12%);
  padding: 3px;
  display: inline-flex;
  align-items: center;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.toggle-switch__thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
  transform: translateX(0);
  transition: transform 0.2s ease;
}

.toggle-switch__input:focus-visible + .toggle-switch__track {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 50%, white 50%);
  outline-offset: 2px;
}

.toggle-switch__input:checked + .toggle-switch__track {
  background: color-mix(in srgb, var(--color-accent) 78%, white 22%);
  border-color: color-mix(in srgb, var(--color-accent) 78%, transparent 22%);
}

.toggle-switch__input:checked + .toggle-switch__track .toggle-switch__thumb {
  transform: translateX(18px);
}

.toggle-switch__input:disabled + .toggle-switch__track {
  cursor: not-allowed;
}

.toggle-switch__state {
  min-width: 48px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: right;
}

@media (max-width: 700px) {
  .toggle-switch {
    align-items: flex-start;
    flex-direction: column;
  }

  .toggle-switch__control {
    width: 100%;
    justify-content: space-between;
  }
}
</style>