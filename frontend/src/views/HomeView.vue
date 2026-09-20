<script setup>
import SectionHero from "../components/home/SectionHero.vue";
import SectionProblem from "../components/home/SectionProblem.vue";
import SectionStructure from "../components/home/SectionStructure.vue";
import SectionFeatures from "../components/home/SectionFeatures.vue";
import SectionPricing from "../components/home/SectionPricing.vue";
import SectionClosing from "../components/home/SectionClosing.vue";
</script>

<template>
  <main class="landing">
    <SectionHero />
    <SectionProblem />
    <SectionStructure />
    <SectionFeatures />
    <SectionPricing />
    <SectionClosing />
  </main>
</template>
