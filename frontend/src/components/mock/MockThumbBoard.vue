<script setup>
defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="thumb" :data-variant="variant" aria-hidden="true">
    <span v-for="n in 3" :key="n" class="thumb__col">
      <i /><i /><i v-if="n !== 2" />
    </span>
  </div>
</template>

<style scoped>
.thumb {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
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

.thumb__col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thumb__col i {
  display: block;
  height: 10px;
  border-radius: 2px;
  background-color: var(--mock-fill);
}
</style>
