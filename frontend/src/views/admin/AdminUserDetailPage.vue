<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>{{ member?.name || "회원 상세" }}</h1>
        <p class="admin-page__subtitle">계정, 소속 테넌트, 보유 라이선스를 조회합니다. 콘텐츠 편집은 하지 않습니다.</p>
      </div>
      <router-link class="admin-link" :to="{ name: 'AdminUsers' }">목록으로</router-link>
    </header>

    <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>

    <section v-if="member" class="admin-card">
      <h2>계정</h2>
      <dl class="admin-dl">
        <dt>ID</dt>
        <dd>{{ member.id }}</dd>
        <dt>이메일</dt>
        <dd>{{ member.email }}</dd>
        <dt>상태</dt>
        <dd>
          <span :class="['admin-pill', `admin-pill--${approvalTone(member.approval_status)}`]">
            {{ approvalLabel(member.approval_status) }}
          </span>
        </dd>
        <dt>역할</dt>
        <dd>{{ member.role_name }}</dd>
        <dt>언어 / 지역</dt>
        <dd>{{ member.locale }} / {{ member.region }}</dd>
        <dt>가입일</dt>
        <dd>{{ formatAdminDateTime(member.created_at) }}</dd>
        <dt>세션</dt>
        <dd>{{ sessionCount }}개</dd>
      </dl>
    </section>

    <section class="admin-meta-grid">
      <article class="admin-card">
        <h2>워크스페이스</h2>
        <p v-if="!workspaces.length" class="admin-page__subtitle">소속 워크스페이스가 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in workspaces" :key="item.id">
            <router-link class="admin-link" :to="{ name: 'AdminWorkspaceDetail', params: { workspaceId: item.id } }">
              {{ item.name }}
            </router-link>
            <span>{{ item.role_name }} · {{ item.is_public ? "공개" : "비공개" }}{{ item.is_default ? " · 기본" : "" }}</span>
          </li>
        </ul>
      </article>

      <article class="admin-card">
        <h2>프로젝트</h2>
        <p v-if="!projects.length" class="admin-page__subtitle">소속 프로젝트가 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in projects" :key="item.id">
            <router-link class="admin-link" :to="{ name: 'AdminProjectDetail', params: { projectId: item.id } }">
              {{ item.name }}
            </router-link>
            <span>{{ item.workspace_name }} · {{ item.role_name }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="admin-card">
      <h2>보유 라이선스 (계정 귀속)</h2>
      <p v-if="!licenses.length" class="admin-page__subtitle">계정에 귀속된 라이선스가 없습니다.</p>
      <ul v-else class="admin-queue">
        <li v-for="item in licenses" :key="item.id">
          <strong>{{ item.license_name || item.target_resource }}</strong>
          <span>{{ item.billing_cycle }} · {{ item.quantity }}개 · {{ item.status }}</span>
          <span>{{ formatAdminDate(item.start_date) }} ~ {{ item.end_date ? formatAdminDate(item.end_date) : "무기한" }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../../lib/axios";
import { approvalLabel, approvalTone, formatAdminDate, formatAdminDateTime } from "../../lib/adminFormat";

const route = useRoute();
const member = ref(null);
const workspaces = ref([]);
const projects = ref([]);
const licenses = ref([]);
const sessionCount = ref(0);
const loadError = ref("");

const fetchDetail = async () => {
  loadError.value = "";
  try {
    const res = await api.get(`/admin/users/${route.params.memberId}`);
    member.value = res.data?.member || null;
    workspaces.value = Array.isArray(res.data?.workspaces) ? res.data.workspaces : [];
    projects.value = Array.isArray(res.data?.projects) ? res.data.projects : [];
    licenses.value = Array.isArray(res.data?.licenses) ? res.data.licenses : [];
    sessionCount.value = Number(res.data?.session_count || 0);
  } catch (error) {
    member.value = null;
    loadError.value = error?.response?.data?.message || "회원 상세를 불러오지 못했습니다.";
  }
};

onMounted(fetchDetail);
watch(() => route.params.memberId, fetchDetail);
</script>

<style scoped>
.admin-queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.admin-queue li {
  display: grid;
  gap: 2px;
  font-size: 13px;
}
</style>
