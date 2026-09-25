<script setup>
import { ref } from "vue";
import { useReveal } from "../../composables/useReveal";
import ProductMockFull from "../mock/ProductMockFull.vue";

const rootEl = ref(null);
useReveal(rootEl, { once: true, threshold: 0.12 });
</script>

<template>
  <section id="hero" ref="rootEl" class="hero">
    <div class="hero__inner landing-wrap">
      <div class="hero__copy">
        <h1 class="hero__headline">{{ $t("landing.hero.headline") }}</h1>
        <p class="hero__sub">{{ $t("landing.hero.sub") }}</p>
        <p class="hero__note">{{ $t("landing.hero.note") }}</p>
        <div class="hero__cta">
          <router-link class="btn btn--lg" to="/signup">{{ $t("landing.cta.start") }}</router-link>
          <router-link class="btn btn--lg btn--secondary" to="/pricing">
            {{ $t("landing.cta.pricing") }}
          </router-link>
        </div>
      </div>
      <div class="hero__visual reveal">
        <ProductMockFull />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 72px 0 48px;
  text-align: center;
}

.hero__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
}

.hero__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 820px;
}

.hero__headline {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--fs-display);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.hero__sub {
  margin: 0;
  max-width: 28em;
  color: var(--color-muted);
  font-size: var(--fs-lede);
  line-height: 1.8;
}

.hero__note {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.hero__cta .btn {
  min-width: 148px;
}

.hero__visual {
  width: 100%;
  max-width: 960px;
}

@media (max-width: 767px) {
  .hero {
    padding: 40px 0 32px;
  }

  .hero__inner {
    gap: 32px;
  }

  .hero__cta {
    flex-direction: column;
    width: 100%;
  }

  .hero__cta .btn {
    width: 100%;
    max-width: 280px;
  }
}
</style>
