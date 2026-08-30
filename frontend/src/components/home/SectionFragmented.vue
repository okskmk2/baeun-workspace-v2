<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import FragmentedDayVisual from "./FragmentedDayVisual.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.2 });
</script>

<template>
  <section id="fragmented" ref="rootEl" class="fragmented">
    <div class="fragmented__inner landing-wrap">
      <p class="fragmented__block reveal">{{ $t("landing.fragmented.block1") }}</p>
      <FragmentedDayVisual variant="dim" />
      <p class="fragmented__block fragmented__block--emphasis reveal">
        {{ $t("landing.fragmented.block2") }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.fragmented {
  overflow-x: hidden;
  padding: var(--space-section) 0;
  scroll-margin-top: 64px;
}

.fragmented__inner {
  display: flex;
  flex-direction: column;
  gap: 72px;
}

.fragmented__block {
  margin: 0 auto;
  max-width: 38em;
  font-family: var(--font-serif);
  font-size: clamp(1.125rem, 2.2vw, 1.5rem);
  line-height: 1.9;
  text-align: center;
  white-space: pre-line;
}

.fragmented__block--emphasis {
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.55;
}

@media (max-width: 767px) {
  .fragmented {
    padding: var(--space-section-m) 0;
  }

  .fragmented__inner {
    gap: 56px;
  }
}
</style>
