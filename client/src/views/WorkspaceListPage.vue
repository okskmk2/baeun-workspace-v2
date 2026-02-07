<template>
  <hgroup>
    <h1>워크스페이스 목록</h1>
    <div>
      <button>워크스페이스 추가</button>
    </div>
  </hgroup>
  <p v-if="isLoading">불러오는 중...</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <p v-else-if="workspaces.length === 0">워크스페이스가 없습니다.</p>
  <ul v-else>
    <li v-for="workspace in workspaces" :key="workspace.id">
      <router-link :to="`/workspace/${workspace.id}`">
        <strong>{{ workspace.name }}</strong>
        <span v-if="workspace.role_name"> ({{ workspace.role_name }})</span>
      </router-link>
    </li>
  </ul>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../lib/axios";

const workspaces = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");

const fetchWorkspaces = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/workspace/my");
    workspaces.value = res.data?.data || [];
  } catch (error) {
    workspaces.value = [];
    errorMessage.value = "워크스페이스 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchWorkspaces);
</script>
