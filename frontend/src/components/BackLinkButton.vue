<template>
  <button type="button" class="btn back btn--link" :disabled="disabled" @click="handleClick">
    <MaterialSymbol name="arrow_back" :size="iconSize" />
    <slot />
  </button>
</template>

<script setup>
import MaterialSymbol from "./MaterialSymbol.vue";

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  iconSize: {
    type: [Number, String],
    default: 16,
  },
});

const emit = defineEmits(["click"]);

const handleClick = (event) => {
  if (props.disabled) return;
  emit("click", event);
};
</script>
<style>
.back {
  margin-bottom: 8px;
  gap: 2px;
  font-size: 12px;
  color: var(--color-text-muted);
  align-self: flex-start;
}
</style>
