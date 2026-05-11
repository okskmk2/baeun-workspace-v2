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
  gap: 4px;
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
  background-color: color-mix(in srgb, var(--color-info) 28%, var(--color-surface) 72%);
  color: color-mix(in srgb, var(--color-info) 65%, var(--color-text) 35%);
}

.tag--success {
  border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border) 60%);
  background-color: color-mix(in srgb, var(--color-success) 28%, var(--color-surface) 72%);
  color: color-mix(in srgb, var(--color-success) 65%, var(--color-text) 35%);
}

.tag--warning {
  border-color: color-mix(in srgb, var(--color-warning) 44%, var(--color-border) 56%);
  background-color: color-mix(in srgb, var(--color-warning) 28%, var(--color-surface) 72%);
  color: color-mix(in srgb, var(--color-warning) 60%, var(--color-text) 40%);
}

.tag--danger {
  border-color: color-mix(in srgb, var(--color-danger) 42%, var(--color-border) 58%);
  background-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-surface) 72%);
  color: color-mix(in srgb, var(--color-danger) 65%, var(--color-text) 35%);
}
</style>

<style>
:root:not([data-color-scheme="dark"]) .tag--info {
  background-color: color-mix(in srgb, var(--color-info) 20%, white 80%);
}

:root:not([data-color-scheme="dark"]) .tag--success {
  background-color: color-mix(in srgb, var(--color-success) 20%, white 80%);
}

:root:not([data-color-scheme="dark"]) .tag--warning {
  background-color: color-mix(in srgb, var(--color-warning) 20%, white 80%);
}

:root:not([data-color-scheme="dark"]) .tag--danger {
  background-color: color-mix(in srgb, var(--color-danger) 20%, white 80%);
}
</style>
