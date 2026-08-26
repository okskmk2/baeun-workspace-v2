<template>
  <section class="slot-cards" aria-labelledby="slot-cards-title">
    <h2 id="slot-cards-title" class="slot-cards__title">{{ copy.slotCards.title }}</h2>

    <div class="slot-cards__grid">
      <article v-for="item in items" :key="item.key" class="slot-card">
        <h3 class="slot-card__name">{{ item.name }}</h3>
        <p class="slot-card__price">
          <span class="slot-card__amount">{{ item.formattedPrice }}</span>
          <span class="slot-card__unit">{{ copy.slotCards.unitLabel }}</span>
        </p>
        <p class="slot-card__description">{{ item.description }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { PRICE } from "../../../constants/pricing";
import { pricingCopy as copy } from "../../../constants/pricingCopy";
import { formatCurrency } from "../../../utils/currency";

const items = computed(() =>
  copy.slotCards.items.map((item) => ({
    ...item,
    formattedPrice: formatCurrency(PRICE[item.key]),
  })),
);
</script>

<style scoped>
.slot-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-4);
}

.slot-cards__title {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.slot-cards__grid {
  width: 100%;
  max-width: 1040px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
}

.slot-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-7) var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.slot-card__name {
  margin: 0;
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
}

.slot-card__price {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.slot-card__amount {
  font-size: var(--text-price);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.slot-card__unit {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.slot-card__description {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

@media (max-width: 1023px) {
  .slot-cards__grid {
    grid-template-columns: 1fr;
  }
}
</style>
