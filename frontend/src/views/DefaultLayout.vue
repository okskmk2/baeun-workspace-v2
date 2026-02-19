<template>
  <div class="DefaultLayout">
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
          <AccountWorkspaceDropdown />
        </nav>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../stores/appStore";
import AccountWorkspaceDropdown from "../components/AccountWorkspaceDropdown.vue";

const { t } = useI18n();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));
</script>
