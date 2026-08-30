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
          <router-link
            v-if="isAuthenticated"
            to="/store/cart"
            :aria-label="t('layout.default.util.cart')"
            :title="t('layout.default.util.cart')"
          >
            <MaterialSymbol name="shopping_cart" :size="20" alt="" />
          </router-link>
          <ContextSwicher />
        </nav>
      </div>
    </header>
    <router-view></router-view>

    <footer class="PublicLayout-footer">
      <div class="container inner-footer">
        <p class="footer-copyright">{{ t("layout.default.footer.copyright", { year: currentYear }) }}</p>

        <div class="footer-end">
          <nav class="footer-links" :aria-label="t('layout.default.brand')">
            <router-link to="/pricing">{{ t("layout.default.footer.pricing") }}</router-link>
            <router-link to="/#features">{{ t("layout.default.footer.features") }}</router-link>
            <a href="#" @click.prevent>{{ t("layout.default.footer.contact") }}</a>
          </nav>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../../stores/appStore";
import ContextSwicher from "../../components/ContextSwicher.vue";
import LocaleSwitcher from "../../components/LocaleSwitcher.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { clearThemeSeedFromRoot } from "../../lib/themeSeed";

const { t } = useI18n();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));
const currentYear = new Date().getFullYear();

onMounted(() => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  clearThemeSeedFromRoot();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-theme-source");
});
</script>
