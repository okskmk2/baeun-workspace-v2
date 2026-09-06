<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>{{ workspace?.name || "워크스페이스 상세" }}</h1>
        <p class="admin-page__subtitle">조회와 강제 비공개만 합니다. 멤버 초대·테마 변경은 테넌트 화면입니다.</p>
      </div>
      <div class="admin-toolbar">
        <router-link v-if="workspace" class="admin-link" :to="`/workspace/${workspace.id}`">서비스에서 열기</router-link>
        <router-link class="admin-link" :to="{ name: 'AdminWorkspaces' }">목록으로</router-link>
      </div>
    </header>

    <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
    <p v-if="actionMessage" class="admin-status admin-status--ok">{{ actionMessage }}</p>

    <section v-if="workspace" class="admin-card">
      <h2>기본 정보</h2>
      <dl class="admin-dl">
        <dt>ID</dt>
        <dd>{{ workspace.id }}</dd>
        <dt>소유자</dt>
        <dd>
          <router-link
            v-if="workspace.member_id"
            class="admin-link"
            :to="{ name: 'AdminUserDetail', params: { memberId: workspace.member_id } }"
          >
            {{ workspace.owner_name || workspace.member_id }}
          </router-link>
          <span v-else>-</span>
        </dd>
        <dt>공개</dt>
        <dd>
          <span :class="['admin-pill', workspace.is_public ? 'admin-pill--warn' : 'admin-pill--muted']">
            {{ workspace.is_public ? "공개" : "비공개" }}
          </span>
        </dd>
        <dt>기본</dt>
        <dd>{{ workspace.is_default ? "기본 워크스페이스" : "-" }}</dd>
        <dt>생성일</dt>
        <dd>{{ formatAdminDateTime(workspace.created_at) }}</dd>
      </dl>
      <div v-if="workspace.is_public" class="admin-toolbar" style="margin-top: 14px">
        <button type="button" class="admin-button admin-button--danger" @click="isUnpublishOpen = true">
          강제 비공개
        </button>
      </div>
    </section>

    <section class="admin-meta-grid">
      <article class="admin-card">
        <h2>멤버</h2>
        <p v-if="!members.length" class="admin-page__subtitle">멤버가 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in members" :key="item.id">
            <router-link class="admin-link" :to="{ name: 'AdminUserDetail', params: { memberId: item.id } }">
              {{ item.name }}
            </router-link>
            <span>{{ item.email }} · {{ item.role_name }}</span>
          </li>
        </ul>
      </article>
      <article class="admin-card">
        <h2>프로젝트</h2>
        <p v-if="!projects.length" class="admin-page__subtitle">프로젝트가 없습니다.</p>
        <ul v-else class="admin-queue">
          <li v-for="item in projects" :key="item.id">
            <router-link class="admin-link" :to="{ name: 'AdminProjectDetail', params: { projectId: item.id } }">
              {{ item.name }}
            </router-link>
            <span>멤버 {{ item.member_count }} · {{ item.is_public ? "공개" : "비공개" }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section class="admin-card">
      <h2>워크스페이스 귀속 라이선스</h2>
      <p v-if="!licenses.length" class="admin-page__subtitle">워크스페이스에 귀속된 라이선스가 없습니다.</p>
      <ul v-else class="admin-queue">
        <li v-for="item in licenses" :key="item.id">
          <strong>{{ item.license_name || item.target_resource }}</strong>
          <span>{{ item.billing_cycle }} · {{ item.quantity }}개 · {{ item.status }}</span>
        </li>
      </ul>
    </section>

    <ConfirmDeleteModal
      :open="isUnpublishOpen"
      title="워크스페이스 강제 비공개"
      message="이 워크스페이스를 공개 카탈로그에서 내립니다."
      warning-message="하위 프로젝트도 함께 비공개됩니다. 이 조치는 테넌트 공개 설정을 덮어씁니다."
      confirm-label="비공개"
      deleting-label="처리 중..."
      cancel-label="취소"
      @close="isUnpublishOpen = false"
      @confirm="unpublishWorkspace"
    />
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import api from "../../lib/axios";
import { formatAdminDateTime } from "../../lib/adminFormat";

const route = useRoute();
const workspace = ref(null);
const members = ref([]);
const projects = ref([]);
const licenses = ref([]);
const loadError = ref("");
const actionMessage = ref("");
const isUnpublishOpen = ref(false);

const fetchDetail = async () => {
  loadError.value = "";
  try {
    const res = await api.get(`/admin/workspaces/${route.params.workspaceId}`);
    workspace.value = res.data?.workspace || null;
    members.value = Array.isArray(res.data?.members) ? res.data.members : [];
    projects.value = Array.isArray(res.data?.projects) ? res.data.projects : [];
    licenses.value = Array.isArray(res.data?.licenses) ? res.data.licenses : [];
  } catch (error) {
    workspace.value = null;
    loadError.value = error?.response?.data?.message || "워크스페이스 상세를 불러오지 못했습니다.";
  }
};

const unpublishWorkspace = async () => {
  loadError.value = "";
  actionMessage.value = "";
  try {
    const res = await api.patch(`/admin/workspaces/${route.params.workspaceId}`, { is_public: false });
    actionMessage.value = res.data?.message || "비공개 처리했습니다.";
    isUnpublishOpen.value = false;
    await fetchDetail();
  } catch (error) {
    loadError.value = error?.response?.data?.message || "비공개 처리에 실패했습니다.";
  }
};

onMounted(fetchDetail);
watch(() => route.params.workspaceId, fetchDetail);
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
