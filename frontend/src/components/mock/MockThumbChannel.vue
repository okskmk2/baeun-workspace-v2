<script setup>
defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="thumb" :data-variant="variant" aria-hidden="true">
    <span class="thumb__bubble is-left" />
    <span class="thumb__bubble is-right" />
    <span class="thumb__bubble is-left is-short" />
  </div>
</template>

<style scoped>
.thumb {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.thumb__bubble {
  height: 10px;
  border-radius: 8px;
  background-color: var(--mock-fill);
}

.thumb__bubble.is-left {
  width: 70%;
  border-radius: 2px 8px 8px 8px;
}

.thumb__bubble.is-right {
  width: 58%;
  margin-left: auto;
  border-radius: 8px 2px 8px 8px;
}

.thumb__bubble.is-short {
  width: 46%;
}
</style>
