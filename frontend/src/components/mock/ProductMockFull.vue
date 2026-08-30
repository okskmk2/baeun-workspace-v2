<script setup>
import MockCard from "./primitives/MockCard.vue";
import MockLine from "./primitives/MockLine.vue";

defineProps({
  variant: { type: String, default: "light" },
});

const columns = [
  { key: "todo", cards: 3 },
  { key: "doing", cards: 2 },
  { key: "done", cards: 2 },
];
</script>

<template>
  <div class="product-mock" :data-variant="variant" aria-hidden="true">
    <aside class="product-mock__sidebar">
      <p class="product-mock__project">{{ $t("landing.mock.projectName") }}</p>
      <nav class="product-mock__menu">
        <span class="product-mock__item">{{ $t("landing.mock.menu.wiki") }}</span>
        <span class="product-mock__item is-active">{{ $t("landing.mock.menu.board") }}</span>
        <span class="product-mock__item">{{ $t("landing.mock.menu.channel") }}</span>
        <span class="product-mock__item">{{ $t("landing.mock.menu.data") }}</span>
      </nav>
    </aside>
    <div class="product-mock__board">
      <div v-for="column in columns" :key="column.key" class="product-mock__column">
        <p class="product-mock__column-name">{{ $t(`landing.mock.columns.${column.key}`) }}</p>
        <MockCard v-for="n in column.cards" :key="n" :variant="variant">
          <MockLine :width="n === 1 ? '78%' : n === 2 ? '62%' : '70%'" />
          <MockLine width="44%" height="8px" />
        </MockCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-mock {
  display: flex;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid var(--mock-line);
  border-radius: var(--radius);
  background-color: var(--mock-bg);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--color-fg) 8%, transparent);
}

.product-mock[data-variant="dim"] {
  --mock-bg: var(--mock-fill-dim);
  --mock-line: color-mix(in srgb, var(--color-fg-on-dark) 14%, transparent);
  --mock-fill: color-mix(in srgb, var(--color-fg-on-dark) 18%, transparent);
}

.product-mock__sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 188px;
  flex-shrink: 0;
  padding: 20px 14px;
  border-right: 1px solid var(--mock-line);
  background-color: color-mix(in srgb, var(--mock-fill) 55%, var(--mock-bg));
}

.product-mock__project {
  margin: 0 8px 4px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-fg);
}

.product-mock__menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-mock__item {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: var(--color-muted);
}

.product-mock__item.is-active {
  background-color: color-mix(in srgb, var(--color-accent) 12%, var(--mock-bg));
  color: var(--color-accent);
  font-weight: 600;
}

.product-mock__board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 20px 16px;
  background-color: color-mix(in srgb, var(--mock-fill) 35%, var(--mock-bg));
}

.product-mock__column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-mock__column-name {
  margin: 0 2px 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
}

@media (max-width: 767px) {
  .product-mock {
    flex-direction: column;
    min-height: 0;
  }

  .product-mock__sidebar {
    width: 100%;
    flex-direction: column;
    gap: 10px;
    padding: 12px 12px 10px;
    border-right: 0;
    border-bottom: 1px solid var(--mock-line);
  }

  .product-mock__project {
    margin: 0 4px;
  }

  .product-mock__menu {
    flex-direction: row;
    overflow-x: auto;
  }

  .product-mock__item {
    flex-shrink: 0;
    padding: 6px 10px;
    font-size: 0.75rem;
  }

  .product-mock__board {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 12px;
  }
}
</style>
