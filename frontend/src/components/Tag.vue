<template>
  <span class="tag" :class="[variantClass, { 'tag--icon': icon }]">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  variant: { type: String, default: "default" },
  icon: { type: Boolean, default: false },
});

const variantClass = computed(() => `tag--${props.variant}`);
</script>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background-color: color-mix(in srgb, var(--color-surface) 85%, var(--color-page-bg) 15%);
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.tag--icon {
  padding: 2px;
}

.tag--default {
  border-color: var(--color-border);
  background-color: color-mix(in srgb, var(--color-surface) 85%, var(--color-page-bg) 15%);
  color: var(--color-text);
}

.tag--info {
  border-color: color-mix(in srgb, var(--color-info) 40%, var(--color-border) 60%);
  background-color: color-mix(in srgb, var(--color-info) 16%, var(--color-surface) 84%);
  color: var(--color-info);
}

.tag--success {
  border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border) 60%);
  background-color: color-mix(in srgb, var(--color-success) 16%, var(--color-surface) 84%);
  color: var(--color-success);
}

.tag--warning {
  border-color: color-mix(in srgb, var(--color-warning) 44%, var(--color-border) 56%);
  background-color: color-mix(in srgb, var(--color-warning) 18%, var(--color-surface) 82%);
  color: var(--color-warning);
}

.tag--danger {
  border-color: color-mix(in srgb, var(--color-danger) 42%, var(--color-border) 58%);
  background-color: color-mix(in srgb, var(--color-danger) 16%, var(--color-surface) 84%);
  color: var(--color-danger);
}
</style>
