<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import MaterialSymbol from "../MaterialSymbol.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });

const items = [
  { key: "docs", icon: "description" },
  { key: "tasks", icon: "view_column" },
  { key: "talk", icon: "chat" },
  { key: "sheets", icon: "table" },
];
</script>

<template>
  <section id="problem" ref="rootEl" class="problem">
    <div class="problem__inner landing-wrap">
      <header class="landing-section-head reveal">
        <p class="landing-kicker">{{ $t("landing.problem.kicker") }}</p>
        <h2 class="landing-headline">{{ $t("landing.problem.headline") }}</h2>
        <p class="landing-lede">{{ $t("landing.problem.body") }}</p>
      </header>

      <ul class="problem__grid">
        <li v-for="item in items" :key="item.key" class="problem__card reveal">
          <span class="problem__icon" aria-hidden="true">
            <MaterialSymbol :name="item.icon" :size="22" alt="" />
          </span>
          <h3>{{ $t(`landing.problem.items.${item.key}.title`) }}</h3>
          <p>{{ $t(`landing.problem.items.${item.key}.body`) }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.problem {
  padding: var(--space-section) 0;
  scroll-margin-top: 80px;
  background-color: color-mix(in srgb, var(--mock-fill) 32%, var(--color-bg));
}

.problem__inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.problem__grid {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.problem__card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 20px;
  border: 1px dashed var(--color-line);
  border-radius: var(--radius);
  background-color: color-mix(in srgb, var(--mock-bg) 55%, var(--color-bg));
}

.problem__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: var(--color-muted);
  background-color: color-mix(in srgb, var(--mock-fill) 70%, var(--color-bg));
}

.problem__card h3 {
  margin: 4px 0 0;
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.problem__card p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.problem__card:nth-child(2) {
  transition-delay: 80ms;
}

.problem__card:nth-child(3) {
  transition-delay: 160ms;
}

.problem__card:nth-child(4) {
  transition-delay: 240ms;
}

@media (max-width: 1023px) {
  .problem__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .problem {
    padding: var(--space-section-m) 0;
  }

  .problem__grid {
    grid-template-columns: 1fr;
  }

  .problem__card:nth-child(n) {
    transition-delay: 0ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .problem__card:nth-child(n) {
    transition-delay: 0ms;
  }
}
</style>
