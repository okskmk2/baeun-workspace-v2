<template>
  <section class="business-plans" aria-labelledby="business-plans-title">
    <h2 id="business-plans-title" class="business-plans__title">{{ copy.business.title }}</h2>

    <div class="business-plans__grid">
      <article
        v-for="plan in copy.business.plans"
        :key="plan.key"
        class="business-plan"
        :class="`business-plan--${plan.key}`"
      >
        <h3 class="business-plan__name">{{ plan.name }}</h3>
        <p class="business-plan__price">{{ plan.priceLabel }}</p>

        <ul class="business-plan__features">
          <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
        </ul>

        <router-link v-if="plan.key === 'business'" class="btn business-plan__cta" to="/signup">
          {{ plan.cta }}
        </router-link>
        <a v-else class="btn btn--secondary business-plan__cta" href="#" @click.prevent>{{ plan.cta }}</a>
      </article>
    </div>
  </section>
</template>

<script setup>
import { pricingCopy as copy } from "../../../constants/pricingCopy";
</script>

<style scoped>
.business-plans {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-10) var(--space-4);
}

.business-plans__title {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.business-plans__grid {
  width: 100%;
  max-width: 880px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.business-plan {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-7);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-card-bg);
  box-shadow: var(--shadow-card);
}

.business-plan__name {
  margin: 0;
  font-size: var(--text-h2);
  font-weight: 700;
  color: var(--color-text);
}

.business-plan__price {
  margin: 0;
  font-size: var(--text-body);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}

.business-plan__features {
  flex: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.business-plan__features li {
  position: relative;
  padding-left: var(--space-5);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.business-plan__features li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.75em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-accent);
}

.business-plan__cta {
  width: 100%;
}

@media (max-width: 767px) {
  .business-plans__grid {
    grid-template-columns: 1fr;
  }
}
</style>
