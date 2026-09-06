<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });
</script>

<template>
  <section id="structure" ref="rootEl" class="structure">
    <div class="structure__inner landing-wrap">
      <h2 class="structure__headline reveal">{{ $t("landing.structure.headline") }}</h2>
      <div class="structure__grid">
        <article class="structure__card reveal">
          <h3>{{ $t("landing.structure.workspace.title") }}</h3>
          <p>{{ $t("landing.structure.workspace.body") }}</p>
        </article>
        <article class="structure__card reveal">
          <h3>{{ $t("landing.structure.project.title") }}</h3>
          <p>{{ $t("landing.structure.project.body") }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.structure {
  padding: var(--space-section) 0;
}

.structure__inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.structure__headline {
  margin: 0 auto;
  max-width: 18em;
  font-family: var(--font-serif);
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  text-align: center;
}

.structure__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.structure__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 24px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius);
  background-color: color-mix(in srgb, var(--mock-bg) 70%, var(--color-bg));
}

.structure__card h3 {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.structure__card p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.structure__card:nth-child(2) {
  transition-delay: 80ms;
}

@media (max-width: 767px) {
  .structure {
    padding: var(--space-section-m) 0;
  }

  .structure__grid {
    grid-template-columns: 1fr;
  }

  .structure__card:nth-child(n) {
    transition-delay: 0ms;
  }
}
</style>
