<script setup>
defineProps({
  width: { type: String, default: "100%" },
  height: { type: String, default: "10px" },
});
</script>

<template>
  <span class="mock-line" :style="{ width, height }" />
</template>

<style scoped>
.mock-line {
  display: block;
  border-radius: 999px;
  background-color: var(--mock-fill);
}
</style>
