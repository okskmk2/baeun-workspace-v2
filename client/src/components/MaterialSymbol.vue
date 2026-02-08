<template>
  <span
    class="material-symbol"
    :aria-hidden="isDecorative"
    :aria-label="isDecorative ? undefined : alt"
    role="img"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      WebkitMaskImage: `url(${iconUrl})`,
      maskImage: `url(${iconUrl})`,
    }"
  ></span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  name: { type: String, required: true },
  type: { type: String, default: "rounded" },
  weight: { type: Number, default: 300 },
  size: { type: Number, default: 24 },
  alt: { type: String, default: "" },
});

const styleMap = {
  rounded: "materialsymbolsrounded",
  outlined: "materialsymbolsoutlined",
  sharp: "materialsymbolssharp",
};

const styleKey = computed(() => styleMap[props.type] || styleMap.rounded);

const weightSegment = computed(() =>
  props.weight === 400 ? "default" : `wght${props.weight}`
);

const iconUrl = computed(() =>
  `https://fonts.gstatic.com/s/i/short-term/release/${styleKey.value}/${props.name}/${weightSegment.value}/24px.svg`
);

const isDecorative = computed(() => props.alt.length === 0);
</script>

<style scoped>
.material-symbol {
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
</style>
