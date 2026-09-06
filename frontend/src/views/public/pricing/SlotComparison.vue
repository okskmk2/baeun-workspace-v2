<template>
  <section class="slot-compare" aria-labelledby="slot-compare-title">
    <h2 id="slot-compare-title">{{ copy.slotCards.title }}</h2>
    <div class="slot-compare__grid">
      <article v-for="column in columns" :key="column.key" class="slot-compare__card">
        <h3>{{ column.name }}</h3>
        <p class="slot-compare__price">
          <span class="slot-compare__amount">{{ column.price }}</span>
          <span class="slot-compare__unit">{{ copy.slotCards.unitLabel }}</span>
        </p>
        <p class="slot-compare__desc">{{ column.description }}</p>
        <router-link
          v-if="column.productCode"
          class="btn"
          :to="{ path: '/store/cart', query: { productCode: column.productCode } }"
        >
          {{ copy.slotCards.buy }}
        </router-link>
      </article>
      <article id="storage" class="slot-compare__card">
        <h3>{{ copy.storage.name }}</h3>
        <p class="slot-compare__price">
          <span class="slot-compare__amount">{{ storagePrice }}</span>
          <span class="slot-compare__unit">/GB {{ copy.slotCards.unitLabel }}</span>
        </p>
        <p class="slot-compare__desc">{{ copy.storage.description }}</p>
        <p class="slot-compare__included">{{ copy.storage.included }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import {
  STORAGE_USD_PER_GB,
  buildMonthlyProductCode,
  slotUnitPrice,
} from "../../../constants/pricing";
import { usePricingCopy } from "../../../composables/usePricingCopy";
import { formatSlotPrice } from "../../../utils/currency";

const { copy } = usePricingCopy();

const storagePrice = computed(() => formatSlotPrice(STORAGE_USD_PER_GB));

const columns = computed(() =>
  copy.value.slotCards.items.map((item) => {
    const amount = slotUnitPrice(item.key);
    return {
      ...item,
      price: amount === null ? "—" : formatSlotPrice(amount),
      productCode: amount === null ? "" : buildMonthlyProductCode(item.key),
    };
  }),
);
</script>

<style scoped>
.slot-compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-4);
}

.slot-compare h2 {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.slot-compare__grid {
  width: 100%;
  max-width: 1040px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-5);
}

.slot-compare__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
  scroll-margin-top: 80px;
}

.slot-compare__card h3 {
  margin: 0;
  font-size: var(--text-h2);
  font-weight: 700;
}

.slot-compare__price {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.slot-compare__amount {
  font-size: var(--text-price);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.slot-compare__unit {
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.slot-compare__desc {
  margin: 0;
  flex: 1;
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.slot-compare__included {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}

.slot-compare__card .btn {
  width: 100%;
  margin-top: var(--space-2);
}

@media (max-width: 1023px) {
  .slot-compare__grid {
    grid-template-columns: 1fr;
  }
}
</style>
