<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.2 });
</script>

<template>
  <section id="closing" ref="rootEl" class="closing">
    <div class="closing__inner landing-wrap">
      <ul class="closing__points">
        <li class="closing__point reveal">
          <p>{{ $t("landing.closing.price") }}</p>
          <router-link class="btn btn--link" to="/pricing">
            {{ $t("landing.cta.pricing") }}
          </router-link>
        </li>
        <li class="closing__point reveal">
          <p>{{ $t("landing.closing.import") }}</p>
        </li>
        <li class="closing__point reveal">
          <p>{{ $t("landing.closing.trust") }}</p>
        </li>
      </ul>

      <h2 class="closing__headline reveal">{{ $t("landing.closing.headline") }}</h2>

      <div class="closing__cta reveal">
        <router-link class="btn btn--lg" to="/signup">
          {{ $t("landing.cta.start") }}
        </router-link>
        <p class="closing__note">{{ $t("landing.cta.noCard") }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.closing {
  padding: var(--space-section) 0 calc(var(--space-section) - 24px);
  scroll-margin-top: 64px;
}

.closing__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 72px;
  max-width: 760px;
  text-align: center;
}

.closing__points {
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.closing__point {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 16px 24px;
  font-size: var(--fs-body);
  line-height: 1.7;
}

.closing__point:first-child {
  justify-content: space-between;
  width: min(100%, 640px);
  margin-inline: auto;
  text-align: left;
}

.closing__point p {
  margin: 0;
}

.closing__point:nth-child(1) {
  transition-delay: 0ms;
}

.closing__point:nth-child(2) {
  transition-delay: 120ms;
}

.closing__point:nth-child(3) {
  transition-delay: 240ms;
}

.closing__headline {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--fs-display-sm);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
  white-space: pre-line;
}

.closing__cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.closing__note {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}

@media (max-width: 767px) {
  .closing {
    padding: var(--space-section-m) 0;
  }

  .closing__inner {
    gap: 48px;
  }

  .closing__point {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .closing__point:nth-child(n) {
    transition-delay: 0ms;
  }
}
</style>
