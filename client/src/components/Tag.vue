<template>
  <span class="tag" :class="variantClass">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  variant: { type: String, default: "default" },
});

const variantClass = computed(() => `tag--${props.variant}`);
</script>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  color: #111827;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.tag--default {
  border-color: #e5e7eb;
  background-color: #f9fafb;
  color: #111827;
}

.tag--info {
  border-color: #bfdbfe;
  background-color: #eff6ff;
  color: #1d4ed8;
}

.tag--success {
  border-color: #bbf7d0;
  background-color: #f0fdf4;
  color: #15803d;
}

.tag--warning {
  border-color: #fde68a;
  background-color: #fffbeb;
  color: #b45309;
}

.tag--danger {
  border-color: #fecaca;
  background-color: #fef2f2;
  color: #b91c1c;
}
</style>
