<template>
  <main class="admin-page">
    <header class="admin-page__header">
      <div>
        <h1>{{ project?.name || "프로젝트 상세" }}</h1>
        <p class="admin-page__subtitle">규모와 공개 여부만 봅니다. 위키·칸반·채널 내용은 편집하지 않습니다.</p>
      </div>
      <div class="admin-toolbar">
        <router-link v-if="project" class="admin-link" :to="`/project/${project.id}`">서비스에서 열기</router-link>
        <router-link class="admin-link" :to="{ name: 'AdminProjects' }">목록으로</router-link>
      </div>
    </header>

    <p v-if="loadError" class="admin-status admin-status--error">{{ loadError }}</p>
    <p v-if="actionMessage" class="admin-status admin-status--ok">{{ actionMessage }}</p>

    <section v-if="project" class="admin-card">
      <h2>기본 정보</h2>
      <dl class="admin-dl">
        <dt>ID</dt>
        <dd>{{ project.id }}</dd>
        <dt>워크스페이스</dt>
        <dd>
          <router-link class="admin-link" :to="{ name: 'AdminWorkspaceDetail', params: { workspaceId: project.workspace_id } }">
            {{ project.workspace_name }}
          </router-link>
        </dd>
        <dt>공개</dt>
        <dd>
          <span :class="['admin-pill', project.is_public ? 'admin-pill--warn' : 'admin-pill--muted']">
            {{ project.is_public ? "공개" : "비공개" }}
          </span>
        </dd>
        <dt>도구 규모</dt>
        <dd>
          위키 {{ counts.page_count }} · 칸반 {{ counts.kanban_count }} · 채널 {{ counts.channel_count }} · 데이터
          {{ counts.data_table_count }}
        </dd>
        <dt>생성일</dt>
        <dd>{{ formatAdminDateTime(project.created_at) }}</dd>
      </dl>
      <div v-if="project.is_public" class="admin-toolbar" style="margin-top: 14px">
        <button type="button" class="admin-button admin-button--danger" @click="isUnpublishOpen = true">
          강제 비공개
        </button>
      </div>
    </section>

    <section class="admin-card">
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
    </section>

    <ConfirmDeleteModal
      :open="isUnpublishOpen"
      title="프로젝트 강제 비공개"
      message="이 프로젝트를 공개 카탈로그에서 내립니다."
      warning-message="워크스페이스가 공개 상태여도 어드민 강제 비공개가 우선합니다."
      confirm-label="비공개"
      deleting-label="처리 중..."
      cancel-label="취소"
      @close="isUnpublishOpen = false"
      @confirm="unpublishProject"
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
const project = ref(null);
const members = ref([]);
const counts = ref({ page_count: 0, kanban_count: 0, channel_count: 0, data_table_count: 0 });
const loadError = ref("");
const actionMessage = ref("");
const isUnpublishOpen = ref(false);

const fetchDetail = async () => {
  loadError.value = "";
  try {
    const res = await api.get(`/admin/projects/${route.params.projectId}`);
    project.value = res.data?.project || null;
    members.value = Array.isArray(res.data?.members) ? res.data.members : [];
    counts.value = res.data?.counts || counts.value;
  } catch (error) {
    project.value = null;
    loadError.value = error?.response?.data?.message || "프로젝트 상세를 불러오지 못했습니다.";
  }
};

const unpublishProject = async () => {
  loadError.value = "";
  actionMessage.value = "";
  try {
    const res = await api.patch(`/admin/projects/${route.params.projectId}`, { is_public: false });
    actionMessage.value = res.data?.message || "비공개 처리했습니다.";
    isUnpublishOpen.value = false;
    await fetchDetail();
  } catch (error) {
    loadError.value = error?.response?.data?.message || "비공개 처리에 실패했습니다.";
  }
};

onMounted(fetchDetail);
watch(() => route.params.projectId, fetchDetail);
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
