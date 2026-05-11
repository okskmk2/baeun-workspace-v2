<template>
  <router-view />
  <ToastHost />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import ToastHost from "./components/ToastHost.vue";

const applySystemColorScheme = (query) => {
  if (typeof document === "undefined") return;
  const nextScheme = query.matches ? "dark" : "light";
  document.documentElement.setAttribute("data-color-scheme", nextScheme);
};

let mediaQuery;
const handleColorSchemeChange = (event) => applySystemColorScheme(event);

onMounted(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  applySystemColorScheme(mediaQuery);
  mediaQuery.addEventListener("change", handleColorSchemeChange);
});

onBeforeUnmount(() => {
  if (!mediaQuery) return;
  mediaQuery.removeEventListener("change", handleColorSchemeChange);
});
</script>
