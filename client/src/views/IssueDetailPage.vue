<template>
  <main>
    <hgroup>
      <h1>{{ issue.title || "Issue" }}</h1>
      <span>{{ issue.status || "" }}</span>
    </hgroup>

    <p v-if="isLoading">Loading...</p>
    <p v-else-if="errorMessage">{{ errorMessage }}</p>

    <section v-else>
      <p v-if="issue.content">{{ issue.content }}</p>
      <p v-else>내용이 없습니다.</p>

      <h2>담당자</h2>
      <ul v-if="issue.members?.length">
        <li v-for="member in issue.members" :key="member.issue_member_id">
          {{ member.name }} ({{ member.role_name }})
        </li>
      </ul>
      <p v-else>담당자가 없습니다.</p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";

const route = useRoute();
const issue = ref({});
const isLoading = ref(false);
const errorMessage = ref("");

const issueId = computed(() => route.params.issueId);

const fetchIssue = async () => {
  if (!issueId.value) {
    issue.value = {};
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/issue/${issueId.value}`);
    issue.value = res.data?.data || {};
  } catch (error) {
    issue.value = {};
    errorMessage.value = "이슈 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchIssue);
watch(issueId, fetchIssue);
</script>
