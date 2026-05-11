<template>
  <div class="PublicLayout">
    <header>
      <div class="container inner-gnb">
        <router-link class="brand" to="/">
          <img class="brand-logo" src="/favicon.svg" alt="Brand logo" />
          <span class="brand-text">{{ t("layout.default.brand") }}</span>
        </router-link>
        <nav class="mainnav">
          <router-link to="/">{{ t("layout.default.nav.about") }}</router-link>
          <router-link to="/store">{{ t("layout.default.nav.store") }}</router-link>
        </nav>
        <nav class="utilnav">
          <router-link v-if="!isAuthenticated" to="/signup">{{
            t("layout.default.util.signup")
          }}</router-link>
          <router-link v-if="!isAuthenticated" to="/login">{{
            t("layout.default.util.login")
          }}</router-link>
          <router-link v-if="isAuthenticated" to="/store/cart" aria-label="장바구니" title="장바구니">
            <MaterialSymbol name="shopping_cart" :size="20" alt="" />
          </router-link>
          <ContextSwicher />
        </nav>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../../stores/appStore";
import ContextSwicher from "../../components/ContextSwicher.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { clearThemeSeedFromRoot } from "../../lib/themeSeed";

const { t } = useI18n();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));

onMounted(() => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  clearThemeSeedFromRoot();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-theme-source");
});
</script>
