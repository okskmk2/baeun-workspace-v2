<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import ProductMockFull from "../mock/ProductMockFull.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });
</script>

<template>
  <div ref="rootEl" class="reveal-block">
    <h2 class="reveal-block__headline reveal">{{ $t("landing.unified.headline") }}</h2>
    <div class="reveal-up">
      <ProductMockFull variant="light" />
    </div>
    <p class="reveal-block__caption reveal">{{ $t("landing.unified.caption") }}</p>
  </div>
</template>

<style scoped>
.reveal-block {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.reveal-block__headline {
  margin: 0 auto;
  max-width: 16em;
  font-family: var(--font-serif);
  font-size: var(--fs-display-sm);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  text-align: center;
}

.reveal-block__caption {
  margin: 0;
  color: var(--color-muted);
  font-size: 1rem;
  line-height: 1.7;
  text-align: center;
}

@media (max-width: 767px) {
  .reveal-block {
    gap: 28px;
  }
}
</style>
