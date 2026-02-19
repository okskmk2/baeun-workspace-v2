<template>
  <div
    class="avatar"
    :class="{ 'avatar--with-image': hasImage }"
    :style="{
      width: sizePx,
      height: sizePx,
      borderRadius: radiusPx,
      fontSize: fontSizePx,
    }"
    :aria-label="ariaLabel"
    role="img"
  >
    <img
      v-if="hasImage"
      :src="props.imageUrl"
      :alt="ariaLabel"
      class="avatar-image"
      @error="onImageError"
    />
    <span v-else>{{ text }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  text: { type: String, default: "?" },
  size: { type: Number, default: 72 },
  label: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
});

const imageLoadFailed = ref(false);

const sizePx = computed(() => `${props.size}px`);
const radiusPx = computed(() => `${Math.round(props.size * 0.5)}px`);
const fontSizePx = computed(() => `${Math.round(props.size * 0.25)}px`);
const ariaLabel = computed(() => props.label || "Avatar");
const hasImage = computed(() => Boolean(props.imageUrl) && !imageLoadFailed.value);

watch(
  () => props.imageUrl,
  () => {
    imageLoadFailed.value = false;
  }
);

const onImageError = () => {
  imageLoadFailed.value = true;
};
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  letter-spacing: 0.02em;
  user-select: none;
  overflow: hidden;
}

.avatar--with-image {
  background-color: transparent;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
