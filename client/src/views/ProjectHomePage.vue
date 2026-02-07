<template>
  <main>
    <router-link :to="`/workspace/${workspaceId}`">워크스페이스 홈으로 가기</router-link>
    <h1>프로젝트</h1>
    <p>{{ projectId }}</p>
  </main>
</template>
<script setup>
import { useRoute } from "vue-router";
const route = useRoute();
const workspaceId = route.params.workspaceId;
const projectId = route.params.projectId;
</script>
