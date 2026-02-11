<template>
  <div class="LnbLayout">
    <aside>
      <nav>
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings`"
          >{{ t("layout.settings.nav.general") }}</router-link
        >
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings/member`"
          >{{ t("layout.settings.nav.members") }}</router-link
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

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
</script>
