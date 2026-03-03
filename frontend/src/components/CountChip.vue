<template>
  <span class="count-chip">{{ count }}</span>
</template>

<script setup>
defineProps({
  count: {
    type: [Number, String],
    required: true,
  },
});
</script>

<style scoped>
.count-chip {
  margin-left: 6px;
  font-size: 10px;
  color: var(--color-text);
  background-color: #e2e8f0;
  border-radius: 999px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  line-height: 1;
  align-items: center;
  justify-content: center;
}
</style>
