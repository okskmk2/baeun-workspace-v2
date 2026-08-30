<script setup>
import MockLine from "./MockLine.vue";

defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="mock-card" :data-variant="variant">
    <slot>
      <MockLine width="72%" />
      <MockLine width="48%" height="8px" />
    </slot>
  </div>
</template>

<style scoped>
.mock-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--mock-line);
  border-radius: calc(var(--radius) - 2px);
  background-color: var(--mock-bg);
}

.mock-card[data-variant="dim"] {
  --mock-bg: color-mix(in srgb, var(--mock-fill-dim) 70%, #000 30%);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 16%, transparent);
  background-color: var(--mock-bg);
}
</style>
