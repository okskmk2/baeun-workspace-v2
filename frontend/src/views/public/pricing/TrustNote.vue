<template>
  <section class="trust-note" :aria-label="copy.trust.ariaLabel">
    <p v-for="(line, index) in copy.trust.lines" :key="index" class="trust-note__line">
      {{ line }}
    </p>
  </section>
</template>

<script setup>
import { usePricingCopy } from "../../../composables/usePricingCopy";

const { copy } = usePricingCopy();
</script>

<style scoped>
.trust-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.trust-note__line {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--text-body);
  line-height: 1.7;
  color: var(--color-text-muted);
}
</style>
