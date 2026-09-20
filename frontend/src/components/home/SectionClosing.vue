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
        <p class="closing__body reveal">{{ $t("landing.closing.body") }}</p>
        <div class="closing__cta reveal">
          <router-link class="btn btn--lg" to="/signup">
            {{ $t("landing.cta.start") }}
          </router-link>
          <router-link class="btn btn--lg btn--secondary" to="/pricing">
            {{ $t("landing.cta.pricing") }}
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.closing {
  padding: var(--space-section) 0 96px;
  scroll-margin-top: 64px;
  background-color: color-mix(in srgb, var(--mock-fill) 32%, var(--color-bg));
}

.closing__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 40rem;
  text-align: center;
}

.closing__end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
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

.closing__body {
  margin: 0 0 12px;
  color: var(--color-muted);
  font-size: 1.0625rem;
  line-height: 1.7;
}

.closing__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.closing__cta .btn {
  min-width: 148px;
}

@media (max-width: 767px) {
  .closing {
    padding: var(--space-section-m) 0 64px;
  }

  .closing__cta {
    flex-direction: column;
    width: 100%;
  }

  .closing__cta .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
