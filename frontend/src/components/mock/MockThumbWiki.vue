<script setup>
defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="thumb" :data-variant="variant" aria-hidden="true">
    <span class="thumb__branch" />
    <span class="thumb__row" style="width: 72%" />
    <span class="thumb__row is-indent" style="width: 54%" />
    <span class="thumb__row is-indent" style="width: 48%" />
    <span class="thumb__row" style="width: 62%" />
  </div>
</template>

<style scoped>
.thumb {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 72px;
  height: 56px;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--mock-line);
  border-radius: 6px;
  background-color: var(--mock-bg);
}

.thumb[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.thumb__branch {
  position: absolute;
  left: 12px;
  top: 16px;
  bottom: 14px;
  width: 8px;
  border-left: 1px solid var(--mock-line);
  border-bottom: 1px solid var(--mock-line);
}

.thumb__row {
  display: block;
  height: 5px;
  border-radius: 999px;
  background-color: var(--mock-fill);
}

.thumb__row.is-indent {
  margin-left: 10px;
}
</style>
