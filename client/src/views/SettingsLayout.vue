<template>
  <div class="AcountLayout">
    <aside>
      <nav>
        <router-link :to="`/workspace/${workspaceId}/project/${projectId}/settings/member`"
          >프로젝트 맴버 관리</router-link
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
