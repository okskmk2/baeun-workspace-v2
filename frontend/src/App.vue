<template>
  <router-view />
  <ToastHost />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from "vue";
import ToastHost from "./components/ToastHost.vue";

const applySystemTheme = (query) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute("data-theme-source")) return;
  const nextTheme = query.matches ? "dark" : "light";
  root.setAttribute("data-theme", nextTheme);
};

let mediaQuery;
const handleThemeChange = (event) => applySystemTheme(event);

onMounted(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  applySystemTheme(mediaQuery);
  mediaQuery.addEventListener("change", handleThemeChange);
});

onBeforeUnmount(() => {
  if (!mediaQuery) return;
  mediaQuery.removeEventListener("change", handleThemeChange);
});
</script>
