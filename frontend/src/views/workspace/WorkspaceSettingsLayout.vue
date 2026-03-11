<template>
  <div class="LnbLayout container WorkspaceSettingsLayout">
    <aside>
      <div class="lnb-shell">
        <nav class="lnb-scroll">
          <router-link :to="generalTo">기본 정보</router-link>
          <router-link :to="membersTo">멤버 관리</router-link>
        </nav>
      </div>
    </aside>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);

const generalTo = computed(() => `/workspace/${workspaceId.value}/settings/general`);
const membersTo = computed(() => `/workspace/${workspaceId.value}/settings/members`);
</script>

<style scoped>
.WorkspaceSettingsLayout > main {
  margin-top: 0;
  margin-bottom: 0;
}
</style>
