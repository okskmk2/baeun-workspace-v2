<template>
  <hgroup>
    <h1>{{ page.title || "페이지" }}</h1>
    <div>
      <button
        type="button"
        class="btn btn--secondary btn--sm"
        :disabled="!canEdit"
        @click="startEdit"
      >
        편집
      </button>
      <button type="button" class="btn btn--secondary btn--sm" @click="openPermissionModal">
        권한
      </button>
      <button
        v-if="isOwner"
        type="button"
        class="btn btn--danger btn--sm"
        :disabled="isDeleting"
        @click="deletePage"
      >
        {{ isDeleting ? "삭제 중..." : "삭제" }}
      </button>
    </div>
  </hgroup>
  <p v-if="isLoading">불러오는 중...</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <article v-else class="wiki-content">
    <template v-if="isEditing">
      <label class="edit-label" for="page-title">제목</label>
      <input
        id="page-title"
        v-model.trim="editForm.title"
        type="text"
        class="edit-input"
      />
      <label class="edit-label" for="page-content">내용</label>
      <textarea
        id="page-content"
        v-model="editForm.content"
        class="edit-textarea"
        rows="10"
        placeholder="Markdown을 입력하세요"
      ></textarea>
      <div class="edit-actions">
        <button type="button" class="btn btn--secondary" @click="cancelEdit">취소</button>
        <button type="button" class="btn" :disabled="isSaving" @click="savePage">
          {{ isSaving ? "저장 중..." : "저장" }}
        </button>
      </div>
    </template>
    <template v-else>
      <p v-if="page.content">{{ page.content }}</p>
      <p v-else class="empty">내용이 없습니다.</p>
    </template>
  </article>

  <BaseModal :open="isPermissionOpen" title="페이지 권한" @close="closePermissionModal">
    <form class="modal-form" @submit.prevent="savePermission">
      <label for="permission-member">프로젝트 맴버</label>
      <select id="permission-member" v-model="permissionForm.memberId">
        <option value="">선택하세요</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <label for="permission-role">권한</label>
      <select id="permission-role" v-model="permissionForm.roleName">
        <option value="OWNER">OWNER</option>
        <option value="EDITOR">EDITOR</option>
        <option value="VIEWER">VIEWER</option>
      </select>
      <p v-if="permissionError" class="form-error">{{ permissionError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closePermissionModal">
          취소
        </button>
        <button type="submit" class="btn" :disabled="isPermissionSaving">
          {{ isPermissionSaving ? "저장 중..." : "저장" }}
        </button>
      </div>
    </form>
    <div v-if="pageMembers.length" class="permission-list">
      <div v-for="member in pageMembers" :key="member.member_id" class="permission-row">
        <span>{{ member.name }}</span>
        <span class="role">{{ member.role_name }}</span>
      </div>
    </div>
  </BaseModal>

  <BaseModal :open="isCancelOpen" title="편집 취소" @close="closeCancelModal">
    <p>변경사항을 저장하지 않고 나가시겠습니까?</p>
    <div class="modal-actions">
      <button type="button" class="btn btn--secondary" @click="closeCancelModal">
        계속 편집
      </button>
      <button type="button" class="btn" @click="confirmCancelEdit">변경사항 버리기</button>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { useAppStore } from "../stores/appStore";

const route = useRoute();
const projectId = computed(() => route.params.projectId);
const pageId = computed(() => route.params.pageId);

const page = ref({});
const isLoading = ref(false);
const errorMessage = ref("");
const isEditing = ref(false);
const isSaving = ref(false);
const editForm = ref({ title: "", content: "" });
const originalForm = ref({ title: "", content: "" });
const isDeleting = ref(false);

const isPermissionOpen = ref(false);
const isPermissionSaving = ref(false);
const permissionError = ref("");
const projectMembers = ref([]);
const pageMembers = ref([]);
const permissionForm = ref({ memberId: "", roleName: "VIEWER" });
const isCancelOpen = ref(false);

const appStore = useAppStore();
const currentUserId = computed(() => appStore.currentUser?.id);
const router = useRouter();

const userPageRole = computed(() => {
  if (!currentUserId.value) return "";
  const found = pageMembers.value.find(
    (member) => String(member.member_id) === String(currentUserId.value)
  );
  return (found?.role_name || "").toUpperCase();
});

const canEdit = computed(() => ["OWNER", "EDITOR"].includes(userPageRole.value));
const isOwner = computed(() => userPageRole.value === "OWNER");

const isDirty = computed(() =>
  editForm.value.title !== originalForm.value.title ||
  editForm.value.content !== originalForm.value.content
);

const fetchPage = async () => {
  if (!projectId.value || !pageId.value) {
    page.value = {};
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/project/${projectId.value}/pages/${pageId.value}`);
    page.value = res.data?.data || {};
  } catch (error) {
    page.value = {};
    errorMessage.value = "페이지를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const startEdit = () => {
  if (!canEdit.value) return;
  editForm.value = {
    title: page.value.title || "",
    content: page.value.content || "",
  };
  originalForm.value = { ...editForm.value };
  isEditing.value = true;
};

const cancelEdit = () => {
  if (isDirty.value) {
    isCancelOpen.value = true;
    return;
  }
  isEditing.value = false;
};

const savePage = async () => {
  if (!projectId.value || !pageId.value) return;
  if (!editForm.value.title) return;
  if (!canEdit.value) return;

  isSaving.value = true;
  try {
    const res = await api.patch(`/project/${projectId.value}/pages/${pageId.value}`, {
      title: editForm.value.title,
      content: editForm.value.content,
    });
    page.value = res.data?.data || page.value;
    originalForm.value = {
      title: page.value.title || "",
      content: page.value.content || "",
    };
    isEditing.value = false;
  } catch (error) {
    errorMessage.value = "페이지 저장에 실패했습니다.";
  } finally {
    isSaving.value = false;
  }
};

const fetchProjectMembers = async () => {
  if (!projectId.value) {
    projectMembers.value = [];
    return;
  }
  const res = await api.get(`/project/${projectId.value}/members`);
  projectMembers.value = res.data?.data || [];
};

const fetchPageMembers = async () => {
  if (!projectId.value || !pageId.value) {
    pageMembers.value = [];
    return;
  }
  const res = await api.get(
    `/project/${projectId.value}/pages/${pageId.value}/members`
  );
  pageMembers.value = res.data?.data || [];
};

const openPermissionModal = async () => {
  if (!projectId.value || !pageId.value) return;
  permissionForm.value = { memberId: "", roleName: "VIEWER" };
  permissionError.value = "";
  isPermissionOpen.value = true;
  await Promise.all([fetchProjectMembers(), fetchPageMembers()]);
};

const closePermissionModal = () => {
  isPermissionOpen.value = false;
};

const closeCancelModal = () => {
  isCancelOpen.value = false;
};

const confirmCancelEdit = () => {
  isEditing.value = false;
  isCancelOpen.value = false;
};

const savePermission = async () => {
  if (!permissionForm.value.memberId) {
    permissionError.value = "멤버를 선택해주세요.";
    return;
  }
  if (!projectId.value || !pageId.value) return;

  isPermissionSaving.value = true;
  permissionError.value = "";
  try {
    await api.post(`/project/${projectId.value}/pages/${pageId.value}/member`, {
      member_id: permissionForm.value.memberId,
      role_name: permissionForm.value.roleName,
    });
    await fetchPageMembers();
  } catch (error) {
    permissionError.value = error?.response?.data?.message || "권한 저장에 실패했습니다.";
  } finally {
    isPermissionSaving.value = false;
  }
};

const deletePage = async () => {
  if (!projectId.value || !pageId.value) return;
  if (!isOwner.value) return;

  const confirmed = window.confirm("페이지를 삭제할까요?");
  if (!confirmed) return;

  isDeleting.value = true;
  try {
    await api.delete(`/project/${projectId.value}/pages/${pageId.value}`);
    await router.push(`/workspace/${route.params.workspaceId}/project/${projectId.value}/wiki`);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || "페이지 삭제에 실패했습니다.";
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchPage);
watch(pageId, fetchPage);
watch(projectId, fetchPage);
onMounted(fetchPageMembers);
watch(pageId, fetchPageMembers);
watch(projectId, fetchPageMembers);
</script>

<style scoped>
.wiki-content {
  padding: 12px;
  background: #ffffff;
}

.edit-label {
  display: block;
  font-size: 13px;
  margin: 0 0 6px;
  color: #374151;
}

.edit-input,
.edit-textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  margin-bottom: 12px;
}

.edit-textarea {
  font-family: monospace;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.permission-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.permission-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}

.permission-row .role {
  color: #6b7280;
}

.empty {
  margin: 0;
  color: #9ca3af;
}
</style>
