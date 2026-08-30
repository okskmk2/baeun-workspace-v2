<script setup>
defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="thumb" :data-variant="variant" aria-hidden="true">
    <span v-for="n in 12" :key="n" class="thumb__cell" />
  </div>
</template>

<style scoped>
.thumb {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 3px;
  width: 72px;
  height: 56px;
  padding: 8px;
  border: 1px solid var(--mock-line);
  border-radius: 6px;
  background-color: var(--mock-bg);
}

.thumb[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.thumb__cell {
  display: block;
  border-radius: 2px;
  background-color: var(--mock-fill);
}

.thumb__cell:nth-child(-n + 4) {
  background-color: color-mix(in srgb, var(--mock-fill) 70%, var(--color-accent) 30%);
}
</style>
