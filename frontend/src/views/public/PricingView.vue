<template>
  <main class="pricing-view">
    <PricingHeader />
    <SlotComparison />
    <PriceCalculator />
    <PricingFaq />
  </main>
</template>

<script setup>
import PricingHeader from "./pricing/PricingHeader.vue";
import SlotComparison from "./pricing/SlotComparison.vue";
import PriceCalculator from "./pricing/PriceCalculator.vue";
import PricingFaq from "./pricing/PricingFaq.vue";
</script>

<style scoped>
.pricing-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}

.pricing-view :deep(*) {
  box-sizing: border-box;
}
</style>
