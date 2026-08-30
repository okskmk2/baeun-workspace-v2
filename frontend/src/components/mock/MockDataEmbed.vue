<script setup>
import MockLine from "./primitives/MockLine.vue";

defineProps({
  variant: { type: String, default: "light" },
});
</script>

<template>
  <div class="mock-data" :data-variant="variant" aria-hidden="true">
    <div class="mock-data__source">
      <p class="mock-data__label">{{ $t("landing.mock.menu.data") }}</p>
      <div class="mock-data__table">
        <div class="mock-data__row is-head">
          <span /><span /><span />
        </div>
        <div v-for="n in 4" :key="n" class="mock-data__row">
          <span /><span /><span />
        </div>
      </div>
    </div>
    <svg class="mock-data__links" viewBox="0 0 72 220" preserveAspectRatio="none">
      <path d="M4 110 C 28 110, 28 48, 68 48" />
      <path d="M4 110 C 28 110, 28 172, 68 172" />
    </svg>
    <div class="mock-data__embeds">
      <div class="mock-data__embed">
        <p class="mock-data__label">{{ $t("landing.mock.menu.wiki") }}</p>
        <MockLine width="56%" height="8px" />
        <div class="mock-data__chart">
          <i style="height: 42%" />
          <i style="height: 78%" />
          <i style="height: 56%" />
          <i style="height: 88%" />
        </div>
      </div>
      <div class="mock-data__embed">
        <p class="mock-data__label">{{ $t("landing.mock.menu.channel") }}</p>
        <MockLine width="48%" height="8px" />
        <div class="mock-data__chart">
          <i style="height: 42%" />
          <i style="height: 78%" />
          <i style="height: 56%" />
          <i style="height: 88%" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-data {
  display: grid;
  grid-template-columns: 1.05fr 48px 1fr;
  align-items: center;
  gap: 4px;
  padding: 18px;
  border: 1px solid var(--mock-line);
  border-radius: var(--radius);
  background-color: var(--mock-bg);
}

.mock-data[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.mock-data__label {
  margin: 0 0 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-muted);
}

.mock-data__table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mock-line);
  border-radius: 6px;
  overflow: hidden;
}

.mock-data__row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--mock-line);
}

.mock-data__row:first-child {
  border-top: 0;
}

.mock-data__row.is-head {
  background-color: color-mix(in srgb, var(--mock-fill) 70%, var(--mock-bg));
}

.mock-data__row span {
  display: block;
  height: 7px;
  border-radius: 999px;
  background-color: var(--mock-fill);
}

.mock-data__links {
  width: 100%;
  height: 180px;
}

.mock-data__links path {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 1.25;
  stroke-dasharray: 3 4;
  opacity: 0.55;
}

.mock-data__embeds {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-data__embed {
  padding: 12px;
  border: 1px solid var(--mock-line);
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--mock-fill) 35%, var(--mock-bg));
}

.mock-data__chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 52px;
  margin-top: 10px;
}

.mock-data__chart i {
  flex: 1;
  display: block;
  border-radius: 2px 2px 0 0;
  background-color: color-mix(in srgb, var(--color-accent) 70%, var(--mock-fill));
}

@media (max-width: 767px) {
  .mock-data {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .mock-data__links {
    width: 0;
    height: 28px;
    margin: 4px auto;
    border-left: 1px dashed color-mix(in srgb, var(--color-accent) 55%, var(--mock-line));
  }

  .mock-data__links path {
    display: none;
  }
}
</style>
