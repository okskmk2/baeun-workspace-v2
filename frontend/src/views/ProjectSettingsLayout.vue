<template>
  <div class="LnbLayout">
    <aside>
      <nav>
        <router-link :to="`/project/${projectId}/settings`"
          >{{ t("layout.settings.nav.general") }}</router-link
        >
        <router-link :to="`/project/${projectId}/settings/member`"
          >{{ t("layout.settings.nav.members") }}</router-link
        >
        <router-link :to="`/project/${projectId}/settings/notifications`"
          >{{ t("layout.settings.nav.notifications") }}</router-link
        >
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t } = useI18n();
const route = useRoute();


const projectId = computed(() => route.params.projectId);
</script>
