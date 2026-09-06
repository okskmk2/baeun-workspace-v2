<template>
  <div class="LnbLayout container SettingsLayout">
    <aside>
      <nav>
        <p class="lnb-group">{{ t("layout.account.groups.account") }}</p>
        <router-link to="/settings/profile">{{ t("layout.account.nav.profile") }}</router-link>
        <router-link to="/settings/security">{{ t("layout.account.nav.security") }}</router-link>

        <p class="lnb-group">{{ t("layout.account.groups.billing") }}</p>
        <router-link to="/settings/plan">{{ t("layout.account.nav.plan") }}</router-link>
        <router-link to="/settings/billing">{{ t("layout.account.nav.billing") }}</router-link>

        <p class="lnb-group">{{ t("layout.account.groups.workspaces") }}</p>
        <router-link to="/settings/workspaces">{{ t("layout.account.nav.workspaces") }}</router-link>
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

<style scoped>
.lnb-group {
  margin: 12px 0 4px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.lnb-group:first-child {
  margin-top: 0;
}
</style>
