<template>
  <main class="pricing-view">
    <PricingHeader />
    <SlotCards v-model:billing-cycle="billingCycle" />
    <FreeTierSection />
    <PriceCalculator :billing-cycle="billingCycle" />
    <BusinessPlans :billing-cycle="billingCycle" />
    <TrustNote />
    <PricingFaq />
    <PricingClose />
  </main>
</template>

<script setup>
import { ref } from "vue";
import PricingHeader from "./pricing/PricingHeader.vue";
import SlotCards from "./pricing/SlotCards.vue";
import FreeTierSection from "./pricing/FreeTierSection.vue";
import PriceCalculator from "./pricing/PriceCalculator.vue";
import BusinessPlans from "./pricing/BusinessPlans.vue";
import TrustNote from "./pricing/TrustNote.vue";
import PricingFaq from "./pricing/PricingFaq.vue";
import PricingClose from "./pricing/PricingClose.vue";

const billingCycle = ref("monthly");
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
