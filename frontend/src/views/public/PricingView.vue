<template>
  <main class="pricing-view container">
    <PricingHeader v-model:billing-cycle="billingCycle" />
    <SlotCards />
    <FreeTierSection />
    <PriceCalculator :billing-cycle="billingCycle" />
    <BusinessPlans />
    <TrustNote />
    <PricingFaq />
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

const billingCycle = ref("monthly");
</script>

<style scoped>
.pricing-view {
  display: flex;
  flex-direction: column;
}
</style>
