<template>
  <router-view />
</template>

<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useProjectMemberStore } from "../stores/projectMemberStore";

const route = useRoute();
const projectMemberStore = useProjectMemberStore();
const projectId = computed(() => route.params.projectId);

watch(
  projectId,
  (value) => {
    if (!value) return;
    projectMemberStore.fetchProjectMembers(value);
  },
  { immediate: true }
);
</script>
