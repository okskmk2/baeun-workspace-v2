<template>
  <span class="count-chip" :class="`count-chip--${size}`">{{ count }}</span>
</template>

<script setup>
defineProps({
  count: {
    type: [Number, String],
    required: true,
  },
  size: {
    type: String,
    default: "sm",
  },
});
</script>

<style scoped>
.count-chip {
  margin-left: 6px;
  color: var(--color-text-muted);
  background-color: var(--color-surface-alt);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 0 6px;
  line-height: 1;
  white-space: nowrap;
}

.count-chip--sm {
  height: 18px;
  font-size: 11px;
  font-weight: 500;
  min-width: 12px;
}

.count-chip--md {
  min-width: 22px;
  height: 22px;
  font-size: 12px;
}

.count-chip--lg {
  min-width: 28px;
  height: 28px;
  font-size: 14px;
}
</style>
