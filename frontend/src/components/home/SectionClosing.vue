<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.2 });
</script>

<template>
  <section id="closing" ref="rootEl" class="closing">
    <div class="closing__inner landing-wrap">
      <div class="closing__end">
        <h2 class="closing__headline reveal">{{ $t("landing.closing.headline") }}</h2>
        <div class="closing__cta reveal">
          <router-link class="btn btn--lg" to="/signup">
            {{ $t("landing.cta.start") }}
          </router-link>
        </div>
      </div>

      <p class="closing__price reveal">
        {{ $t("landing.closing.price") }}
        <router-link class="closing__link" to="/pricing">
          {{ $t("landing.cta.pricing") }}
        </router-link>
      </p>
    </div>
  </section>
</template>

<style scoped>
.closing {
  padding: var(--space-section) 0 72px;
  scroll-margin-top: 64px;
}

.closing__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 72px;
  max-width: 40rem;
  text-align: center;
}

.closing__price {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.7;
}

.closing__link {
  margin-left: 0.6em;
  color: inherit;
  font-size: inherit;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: color-mix(in srgb, currentColor 35%, transparent);
}

.closing__link:hover {
  color: var(--color-fg);
  text-decoration-color: currentColor;
}

.closing__end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

.closing__headline {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-h2);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  white-space: pre-line;
}

.closing__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 767px) {
  .closing {
    padding: var(--space-section-m) 0 56px;
  }

  .closing__inner {
    gap: 64px;
  }

  .closing__end {
    gap: 28px;
  }
}
</style>
