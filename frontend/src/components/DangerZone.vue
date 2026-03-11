<template>
  <section class="danger-zone">
    <div class="danger-zone__content">
      <h2 v-if="title">{{ title }}</h2>
      <p v-if="description" class="danger-zone__desc">{{ description }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="danger-zone__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
.danger-zone {
  margin-top: 24px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 50%, transparent 50%);
  background-color: color-mix(in srgb, var(--color-danger) 6%, transparent 94%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.danger-zone__content h2 {
  font-size: 16px;
  margin: 0 0 4px;
}

.danger-zone__desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.danger-zone__actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 700px) {
  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }

  .danger-zone__actions {
    align-items: flex-start;
  }
}
</style>
