<template>
  <div class="PublicLayout">
    <header>
      <div class="container inner-gnb">
        <router-link class="brand" to="/">
          <img class="brand-logo" src="/favicon.svg" alt="Brand logo" />
          <span class="brand-text">{{ t("layout.default.brand") }}</span>
        </router-link>
        <nav class="mainnav" :aria-label="t('layout.default.nav.primary')">
          <router-link
            to="/"
            :class="{ 'is-nav-active': isHomeNav }"
            :aria-current="isHomeNav ? 'page' : undefined"
          >
            {{ t("layout.default.nav.about") }}
          </router-link>
          <router-link
            to="/pricing"
            :class="{ 'is-nav-active': isPricingNav }"
            :aria-current="isPricingNav ? 'page' : undefined"
          >
            {{ t("layout.default.nav.pricing") }}
          </router-link>
          <router-link to="/open-projects">{{ t("layout.default.nav.openProjects") }}</router-link>
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
        <div class="footer-columns">
          <nav class="footer-col" :aria-labelledby="productHeadingId">
            <h2 :id="productHeadingId">{{ t("layout.default.footer.product") }}</h2>
            <router-link to="/">{{ t("layout.default.footer.about") }}</router-link>
            <router-link to="/#features">{{ t("layout.default.footer.features") }}</router-link>
            <router-link to="/pricing">{{ t("layout.default.footer.pricing") }}</router-link>
          </nav>
          <nav class="footer-col" :aria-labelledby="accountHeadingId">
            <h2 :id="accountHeadingId">{{ t("layout.default.footer.account") }}</h2>
            <router-link to="/login">{{ t("layout.default.footer.login") }}</router-link>
            <router-link to="/signup">{{ t("layout.default.footer.signup") }}</router-link>
          </nav>
          <nav class="footer-col" :aria-labelledby="billingHeadingId">
            <h2 :id="billingHeadingId">{{ t("layout.default.footer.billingGuide") }}</h2>
            <router-link to="/pricing">{{ t("layout.default.footer.pricing") }}</router-link>
            <router-link to="/pricing#storage">{{ t("layout.default.footer.storageRules") }}</router-link>
          </nav>
        </div>

        <div class="footer-bottom">
          <p class="footer-copyright">{{ t("layout.default.footer.copyright", { year: currentYear }) }}</p>
          <LocaleSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, useId } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../../stores/appStore";
import ContextSwicher from "../../components/ContextSwicher.vue";
import LocaleSwitcher from "../../components/LocaleSwitcher.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import { clearThemeSeedFromRoot } from "../../lib/themeSeed";

const { t } = useI18n();
const route = useRoute();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));
const currentYear = new Date().getFullYear();
const uid = useId();
const productHeadingId = `${uid}-product`;
const accountHeadingId = `${uid}-account`;
const billingHeadingId = `${uid}-billing`;

const isHomeNav = computed(() => route.path === "/");
const isPricingNav = computed(() => route.path === "/pricing");

onMounted(() => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  clearThemeSeedFromRoot();
  root.removeAttribute("data-theme");
  root.removeAttribute("data-theme-source");
});
</script>
