<template>
  <div class="faq-item">
    <h3 class="faq-item__heading">
      <button
        :id="buttonId"
        type="button"
        class="faq-item__trigger"
        :aria-expanded="isOpen"
        :aria-controls="panelId"
        @click="$emit('toggle')"
      >
        <span>{{ question }}</span>
        <MaterialSymbol
          class="faq-item__icon"
          :class="{ 'faq-item__icon--open': isOpen }"
          name="expand_more"
          :size="22"
        />
      </button>
    </h3>
    <div
      :id="panelId"
      class="faq-item__panel"
      role="region"
      :aria-labelledby="buttonId"
      v-show="isOpen"
    >
      <p v-for="(line, index) in answer" :key="index" class="faq-item__answer-line">{{ line }}</p>
    </div>
  </div>
</template>

<script setup>
import { useId } from "vue";
import MaterialSymbol from "../../../components/MaterialSymbol.vue";

const { question, answer, isOpen } = defineProps({
  question: { type: String, required: true },
  answer: { type: Array, required: true },
  isOpen: { type: Boolean, default: false },
});

defineEmits(["toggle"]);

const uid = useId();
const buttonId = `${uid}-button`;
const panelId = `${uid}-panel`;
</script>

<style scoped>
.faq-item {
  border-bottom: 1px solid var(--color-border);
}

.faq-item__heading {
  margin: 0;
}

.faq-item__trigger {
  width: 100%;
  min-height: 44px;
  padding: var(--space-4) var(--space-1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  background: none;
  border: none;
  text-align: left;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
}

.faq-item__trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.faq-item__icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform var(--transition-base);
}

.faq-item__icon--open {
  transform: rotate(180deg);
}

.faq-item__panel {
  padding: 0 var(--space-1) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.faq-item__answer-line {
  margin: 0;
  font-size: var(--text-body);
  line-height: 1.7;
  color: var(--color-text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .faq-item__icon {
    transition: none;
  }
}
</style>
