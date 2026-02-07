<template>
  <hgroup>
    <h1>{{ issue.title || "Issue" }}</h1>
    <Tag>{{ issue.status || "" }}</Tag>
  </hgroup>

  <p v-if="isLoading">Loading...</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>

  <section v-else class="issue-grid">
    <div class="issue-main">
      <p v-if="issue.content">{{ issue.content }}</p>
      <p v-else>내용이 없습니다.</p>
    </div>
    <aside class="issue-meta">
      <h2>관련자</h2>
      <div class="role-picker">
        <RelatedMemberPicker
          v-for="role in roleOptions"
          :key="role"
          :role="role"
          :label="roleLabel(role)"
          :members="projectMembers"
          :selected="roleMembers(role)"
          :is-updating="isUpdatingRelated"
          :updating-member-id="updatingMemberId"
          @add="(memberId) => addRelatedMemberByRole(role, memberId)"
          @remove="removeRelatedMember"
        />
        <p v-if="relatedError" class="role-error">{{ relatedError }}</p>
      </div>
    </aside>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import Tag from "../components/Tag.vue";
import RelatedMemberPicker from "../components/RelatedMemberPicker.vue";

const route = useRoute();
const issue = ref({});
const isLoading = ref(false);
const errorMessage = ref("");
const relatedError = ref("");
const isUpdatingRelated = ref(false);
const projectMembers = ref([]);
const updatingMemberId = ref(null);

const roleOptions = ["ASSIGNEE", "REPORTER", "REVIEWER", "WATCHER"];

const issueId = computed(() => route.params.issueId);
const projectId = computed(() => route.params.projectId);

const roleLabel = (role) => {
  const key = (role || "").toUpperCase();
  if (key === "ASSIGNEE") return "담당자";
  if (key === "REPORTER") return "보고자";
  if (key === "REVIEWER") return "검토자";
  if (key === "WATCHER") return "감시자";
  return role || "";
};
const issueMembers = computed(() => issue.value.members || []);

const roleMembers = (role) => {
  const key = (role || "").toUpperCase();
  return issueMembers.value.filter(
    (member) => (member.role_name || "").toUpperCase() === key
  );
};

const hasMemberInRole = (role, memberId) => {
  const key = (role || "").toUpperCase();
  return issueMembers.value.some((member) => {
    const memberRole = (member.role_name || "").toUpperCase();
    return memberRole === key && String(member.member_id) === String(memberId);
  });
};

const findIssueMemberByMemberId = (memberId) =>
  issueMembers.value.find(
    (member) => String(member.member_id) === String(memberId)
  );

const updateIssueMembers = (members) => {
  issue.value = {
    ...issue.value,
    members,
  };
};

const fetchIssue = async (options = {}) => {
  const { silent = false } = options;
  if (!issueId.value) {
    issue.value = {};
    return;
  }

  if (!silent) {
    isLoading.value = true;
  }
  errorMessage.value = "";

  try {
    const res = await api.get(`/issue/${issueId.value}`);
    issue.value = res.data?.data || {};
  } catch (error) {
    errorMessage.value = "이슈 정보를 불러오지 못했습니다.";
  } finally {
    if (!silent) {
      isLoading.value = false;
    }
  }
};

onMounted(fetchIssue);
watch(issueId, fetchIssue);

const fetchIssueMembers = async (options = {}) => {
  const { silent = false } = options;
  if (!issueId.value) {
    updateIssueMembers([]);
    return;
  }

  if (!silent) {
    isUpdatingRelated.value = true;
  }
  relatedError.value = "";

  try {
    const res = await api.get(`/issue/${issueId.value}/member`);
    updateIssueMembers(res.data?.data || []);
  } catch (error) {
    relatedError.value = "관련자 정보를 불러오지 못했습니다.";
  } finally {
    if (!silent) {
      isUpdatingRelated.value = false;
    }
  }
};

onMounted(fetchIssueMembers);
watch(issueId, fetchIssueMembers);

const fetchProjectMembers = async () => {
  if (!projectId.value) {
    projectMembers.value = [];
    return;
  }

  try {
    const res = await api.get(`/project/${projectId.value}/members`);
    projectMembers.value = res.data?.data || [];
  } catch (error) {
    projectMembers.value = [];
  }
};

onMounted(fetchProjectMembers);
watch(projectId, fetchProjectMembers);

const removeRelatedMember = async (issueMemberId) => {
  const confirmed = window.confirm("관련자를 삭제할까요?");
  if (!confirmed) return;

  updatingMemberId.value = issueMemberId;
  relatedError.value = "";

  try {
    await api.delete(`/issue/member/${issueMemberId}`);
    await fetchIssueMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || "관련자 삭제에 실패했습니다.";
  } finally {
    updatingMemberId.value = null;
  }
};

const addRelatedMemberByRole = async (role, memberId) => {
  const resolvedMemberId = memberId;
  if (!resolvedMemberId) {
    relatedError.value = "관련자를 선택해주세요.";
    return;
  }

  isUpdatingRelated.value = true;
  relatedError.value = "";

  try {
    const current = findIssueMemberByMemberId(resolvedMemberId);
    if (current) {
      const currentRole = (current.role_name || "").toUpperCase();
      const nextRole = (role || "").toUpperCase();
      if (currentRole === nextRole) {
        return;
      }
      await api.delete(`/issue/member/${current.issue_member_id}`);
    }
    if (hasMemberInRole(role, resolvedMemberId)) {
      return;
    }
    await api.post(`/issue/${issueId.value}/member`, {
      member_id: resolvedMemberId,
      role_name: role || "ASSIGNEE",
    });
    await fetchIssueMembers({ silent: true });
  } catch (error) {
    relatedError.value = error?.response?.data?.message || "관련자 수정에 실패했습니다.";
  } finally {
    isUpdatingRelated.value = false;
  }
};
</script>

<style scoped>
.role-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.role-error {
  color: #d12020;
  margin: 0;
}

.issue-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}

.issue-main {
  grid-column: span 9;
}

.issue-meta {
  grid-column: span 3;
}

@media (max-width: 900px) {
  .issue-main,
  .issue-meta {
    grid-column: span 12;
  }
}
</style>
