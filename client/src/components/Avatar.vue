<template>
  <div
    class="avatar"
    :style="{
      width: sizePx,
      height: sizePx,
      borderRadius: radiusPx,
      fontSize: fontSizePx,
    }"
    :aria-label="ariaLabel"
    role="img"
  >
    {{ text }}
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  text: { type: String, default: "?" },
  size: { type: Number, default: 72 },
  label: { type: String, default: "" },
});

const sizePx = computed(() => `${props.size}px`);
const radiusPx = computed(() => `${Math.round(props.size * 0.25)}px`);
const fontSizePx = computed(() => `${Math.round(props.size * 0.25)}px`);
const ariaLabel = computed(() => props.label || "Avatar");
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  letter-spacing: 0.02em;
  user-select: none;
}
</style>
