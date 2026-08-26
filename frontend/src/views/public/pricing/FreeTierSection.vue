<template>
  <section class="free-tier" aria-labelledby="free-tier-title">
    <h2 id="free-tier-title" class="free-tier__title">{{ copy.freeTier.title }}</h2>

    <ul class="free-tier__list">
      <li v-for="item in copy.freeTier.items" :key="item" class="free-tier__item">
        <MaterialSymbol name="check" :size="20" class="free-tier__icon" />
        <span>{{ item }}</span>
      </li>
    </ul>

    <p class="free-tier__note">{{ copy.freeTier.note }}</p>

    <router-link class="btn btn--lg" to="/signup">{{ copy.freeTier.cta }}</router-link>
  </section>
</template>

<script setup>
import { pricingCopy as copy } from "../../../constants/pricingCopy";
import MaterialSymbol from "../../../components/MaterialSymbol.vue";
</script>

<style scoped>
.free-tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-10) var(--space-4);
  text-align: center;
}

.free-tier__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.free-tier__list {
  width: 100%;
  max-width: 480px;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;
}

.free-tier__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  font-size: var(--text-body);
  color: var(--color-text);
}

.free-tier__icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-accent);
}

.free-tier__note {
  margin: 0;
  max-width: 480px;
  font-size: var(--text-caption);
  color: var(--color-text-muted);
}
</style>
