<template>
  <section class="pricing-faq" aria-labelledby="pricing-faq-title">
    <h2 id="pricing-faq-title" class="pricing-faq__title">{{ copy.faq.title }}</h2>

    <div class="pricing-faq__list">
      <FaqItem
        v-for="(item, index) in copy.faq.items"
        :key="item.q"
        :question="item.q"
        :answer="item.a"
        :is-open="openStates[index]"
        @toggle="toggle(index)"
      />
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { pricingCopy as copy } from "../../../constants/pricingCopy";
import FaqItem from "./FaqItem.vue";

const openStates = ref(copy.faq.items.map(() => false));

const toggle = (index) => {
  openStates.value[index] = !openStates.value[index];
};
</script>

<style scoped>
.pricing-faq {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-10) var(--space-4);
  min-width: 880px;
  margin: 0 auto;
}

.pricing-faq__title {
  margin: 0;
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: 600;
  color: var(--color-text);
}

.pricing-faq__list {
  display: flex;
  flex-direction: column;
}
</style>
