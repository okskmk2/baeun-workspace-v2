<template>
  <div class="DefaultLayout">
    <header>
      <router-link class="brand" to="/">{{ t("layout.default.brand") }}</router-link>
      <nav class="mainnav">
        <router-link to="/">{{ t("layout.default.nav.overview") }}</router-link>
        <router-link to="/store">{{ t("layout.default.nav.store") }}</router-link>
      </nav>
      <nav class="utilnav">
        <router-link v-if="!isAuthenticated" to="/signup">{{
          t("layout.default.util.signup")
        }}</router-link>
        <router-link v-if="!isAuthenticated" to="/login">{{
          t("layout.default.util.login")
        }}</router-link>
        <router-link v-if="isAuthenticated" to="/account">
          <Avatar :text="accountInitials" :label="accountLabel" :size="32" />
        </router-link>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../stores/appStore";
import Avatar from "../components/Avatar.vue";

const { t } = useI18n();
const appStore = useAppStore();
const isAuthenticated = computed(() => Boolean(appStore.currentUser));
const accountInitials = computed(() => {
  const name = appStore.currentUser?.name || "";
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
});
const accountLabel = computed(() => appStore.currentUser?.name || t("layout.default.util.account"));
</script>
