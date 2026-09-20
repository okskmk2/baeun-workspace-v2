<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useReveal } from "../../composables/useReveal";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.15 });

const { tm } = useI18n();

const asList = (path) => {
  const value = tm(path);
  return Array.isArray(value) ? value : [];
};

const workspacePoints = computed(() => asList("landing.structure.workspace.points"));
const projectPoints = computed(() => asList("landing.structure.project.points"));
</script>

<template>
  <section id="structure" ref="rootEl" class="structure">
    <div class="structure__inner landing-wrap">
      <header class="landing-section-head reveal">
        <p class="landing-kicker">{{ $t("landing.structure.kicker") }}</p>
        <h2 class="landing-headline">{{ $t("landing.structure.headline") }}</h2>
        <p class="landing-lede">{{ $t("landing.structure.body") }}</p>
      </header>
      <div class="structure__grid">
        <article class="structure__card reveal">
          <p class="structure__layer">{{ $t("landing.structure.workspace.layer") }}</p>
          <h3>{{ $t("landing.structure.workspace.title") }}</h3>
          <p>{{ $t("landing.structure.workspace.body") }}</p>
          <ul class="structure__points">
            <li v-for="point in workspacePoints" :key="point">{{ point }}</li>
          </ul>
        </article>
        <article class="structure__card structure__card--work reveal">
          <p class="structure__layer">{{ $t("landing.structure.project.layer") }}</p>
          <h3>{{ $t("landing.structure.project.title") }}</h3>
          <p>{{ $t("landing.structure.project.body") }}</p>
          <ul class="structure__points">
            <li v-for="point in projectPoints" :key="point">{{ point }}</li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.structure {
  padding: var(--space-section) 0;
  scroll-margin-top: 80px;
}

.structure__inner {
  display: flex;
  flex-direction: column;
  gap: 48px;
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

.structure__card--work {
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  background-color: color-mix(in srgb, var(--color-accent) 6%, var(--color-bg));
}

.structure__layer {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}

.structure__card h3 {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.structure__card > p {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.structure__points {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.structure__points li {
  padding: 6px 10px;
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--mock-fill) 65%, var(--color-bg));
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-fg);
}

.structure__card--work .structure__points li {
  background-color: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
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
