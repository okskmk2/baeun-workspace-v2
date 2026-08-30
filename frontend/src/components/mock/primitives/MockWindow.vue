<script setup>
defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="mock-window" :data-variant="variant">
    <div class="mock-window__chrome">
      <span class="mock-window__dot" />
      <span class="mock-window__dot" />
      <span class="mock-window__dot" />
    </div>
    <div class="mock-window__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.mock-window {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--mock-line);
  border-radius: var(--radius);
  background-color: var(--mock-bg);
  box-shadow: 0 12px 32px color-mix(in srgb, #000 8%, transparent);
}

.mock-window[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
  background-color: var(--mock-bg);
  opacity: 0.88;
  box-shadow: 0 10px 28px color-mix(in srgb, #000 28%, transparent);
}

.mock-window__chrome {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border-bottom: 1px solid var(--mock-line);
}

.mock-window__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--mock-fill);
}

.mock-window__body {
  flex: 1;
  min-height: 0;
  padding: 12px;
}
</style>
