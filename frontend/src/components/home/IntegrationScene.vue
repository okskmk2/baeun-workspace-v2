<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import SwitchCountBadge from "./SwitchCountBadge.vue";

defineProps({
  title: { type: String, required: true },
  body: { type: String, required: true },
  side: { type: String, default: "left" },
});

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.2 });
</script>

<template>
  <article ref="rootEl" class="scene reveal" :class="`scene--${side}`">
    <SwitchCountBadge />
    <div class="scene__grid">
      <div class="scene__copy">
        <h3 class="scene__title">{{ title }}</h3>
        <p class="scene__body">{{ body }}</p>
      </div>
      <div class="scene__mock" aria-hidden="true">
        <slot name="mock" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.scene__grid {
  display: grid;
  grid-template-columns: 55fr 45fr;
  gap: 48px;
  align-items: center;
}

.scene--right .scene__grid {
  grid-template-columns: 45fr 55fr;
}

.scene--right .scene__copy {
  order: 2;
}

.scene--right .scene__mock {
  order: 1;
}

.scene__title {
  margin: 0 0 12px;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.45;
  white-space: pre-line;
}

.scene__body {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: 1.75;
  white-space: pre-line;
}

@media (max-width: 767px) {
  .scene__grid,
  .scene--right .scene__grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .scene--right .scene__copy,
  .scene--right .scene__mock {
    order: 0;
  }

  .scene__copy {
    order: -1;
  }
}
</style>
