<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import MockThumbBoard from "../mock/MockThumbBoard.vue";
import MockThumbChannel from "../mock/MockThumbChannel.vue";
import MockThumbData from "../mock/MockThumbData.vue";
import MockThumbWiki from "../mock/MockThumbWiki.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });

const features = [
  { key: "wiki", thumb: MockThumbWiki, step: "01" },
  { key: "kanban", thumb: MockThumbBoard, step: "02" },
  { key: "channel", thumb: MockThumbChannel, step: "03" },
  { key: "data", thumb: MockThumbData, step: "04" },
];
</script>

<template>
  <div ref="rootEl" class="features">
    <article v-for="feature in features" :key="feature.key" class="features__card reveal">
      <div class="features__meta">
        <span class="features__step">{{ feature.step }}</span>
        <component :is="feature.thumb" variant="light" />
      </div>
      <h3>{{ $t(`landing.features.${feature.key}.title`) }}</h3>
      <p>{{ $t(`landing.features.${feature.key}.body`) }}</p>
    </article>
  </div>
</template>

<style scoped>
.features {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.features__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 24px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  background-color: color-mix(in srgb, var(--mock-bg) 70%, var(--color-bg));
  transition:
    border-color 180ms var(--ease),
    box-shadow 180ms var(--ease);
}

.features__card:hover {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-line));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--color-fg) 6%, transparent);
}

.features__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.features__step {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.features__card h3 {
  margin: 8px 0 0;
  font-size: 1.1875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.features__card p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.features__card:nth-child(2) {
  transition-delay: 80ms;
}

.features__card:nth-child(3) {
  transition-delay: 160ms;
}

.features__card:nth-child(4) {
  transition-delay: 240ms;
}

@media (max-width: 767px) {
  .features {
    grid-template-columns: 1fr;
  }

  .features__card:nth-child(n) {
    transition-delay: 0ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .features__card {
    transition: none;
  }

  .features__card:hover {
    box-shadow: none;
  }

  .features__card:nth-child(n) {
    transition-delay: 0ms;
  }
}
</style>
