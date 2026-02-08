<template>
  <div class="AcountLayout">
    <aside>
      <nav>
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings`"
          >기본 설정</router-link
        >
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings/member`"
          >구성원 관리</router-link
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
import { useRoute } from "vue-router";

const route = useRoute();

const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
</script>
