<template>
  <div class="search-input" role="search">
    <input
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      :aria-label="ariaLabel || placeholder"
      :disabled="disabled"
      @input="onInput"
    />
    <span class="search-input__icon" aria-hidden="true">
      <MaterialSymbol name="search" :size="16" alt="" />
    </span>
  </div>
</template>

<script setup>
import MaterialSymbol from "./MaterialSymbol.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  placeholder: {
    type: String,
    default: "",
  },
  ariaLabel: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const onInput = (event) => {
  emit("update:modelValue", event.target.value);
};
</script>

<style scoped>
.search-input {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input input {
  width: var(--search-input-width, 240px);
  max-width: 100%;
  padding: 6px 32px 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-input-border);
  background-color: var(--color-input-bg);
  color: var(--color-text);
  font-size: 13px;
}

.search-input input::placeholder {
  color: var(--color-text-muted);
}

.search-input input:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-accent) 40%, transparent 60%);
  outline-offset: 2px;
}

.search-input__icon {
  position: absolute;
  right: 10px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-muted);
}
</style>
