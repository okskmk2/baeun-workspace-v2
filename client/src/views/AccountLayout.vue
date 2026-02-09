<template>
  <div class="AcountLayout">
    <aside>
      <nav>
        <router-link to="/account/profile">{{ t("layout.account.nav.profile") }}</router-link>
        <router-link to="/account/security">{{ t("layout.account.nav.security") }}</router-link>
        <router-link to="/account/plan">{{ t("layout.account.nav.plan") }}</router-link>
        <router-link to="/account/billing">{{ t("layout.account.nav.billing") }}</router-link>
        <router-link to="/account/workspaces">{{ t("layout.account.nav.workspaces") }}</router-link>
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
