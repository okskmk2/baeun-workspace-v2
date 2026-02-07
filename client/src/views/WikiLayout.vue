<template>
  <div class="AcountLayout">
    <aside>
      <button class="btn" type="button" @click="openModal">페이지 만들기</button>
      <nav class="page-nav">
        <h3>페이지 목록</h3>
        <p v-if="isLoading">불러오는 중...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="pages.length === 0">페이지가 없습니다.</p>
        <PageTree
          v-else
          :nodes="pages"
          :project-id="projectId"
          :workspace-id="workspaceId"
          @reorder="handleReorder"
        />
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <BaseModal :open="isModalOpen" title="페이지 만들기" @close="closeModal">
    <form class="modal-form" @submit.prevent="createPage">
      <label for="page-title">페이지 제목</label>
      <input
        id="page-title"
        v-model.trim="form.title"
        type="text"
        placeholder="페이지 제목"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">취소</button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? "저장 중..." : "저장" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import PageTree from "../components/PageTree.vue";

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const currentPageId = computed(() => route.params.pageId);

const pages = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");

const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ title: "" });


const fetchPages = async () => {
  if (!projectId.value) {
    pages.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/project/${projectId.value}/pages`);
    pages.value = res.data?.data || [];
  } catch (error) {
    pages.value = [];
    errorMessage.value = "페이지 목록을 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = "프로젝트가 선택되지 않았습니다.";
    return;
  }
  form.value = { title: "" };
  formError.value = "";
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const resolveParentId = async () => {
  if (!pages.value.length) return null;
  if (!currentPageId.value) return null;

  return currentPageId.value;
};

const findChildrenList = (nodes, parentId) => {
  if (parentId == null) return nodes;
  for (const node of nodes) {
    if (String(node.id) === String(parentId)) {
      if (!Array.isArray(node.children)) node.children = [];
      return node.children;
    }
    if (node.children?.length) {
      const found = findChildrenList(node.children, parentId);
      if (found) return found;
    }
  }
  return null;
};

const applyReorder = (parentId, orderedIds) => {
  const list = findChildrenList(pages.value, parentId);
  if (!list) return;
  const map = new Map(list.map((node) => [String(node.id), node]));
  const next = orderedIds.map((id) => map.get(String(id))).filter(Boolean);
  if (next.length) {
    list.splice(0, list.length, ...next);
  }
};

const handleReorder = async ({ parentId, orderedIds }) => {
  if (!projectId.value || !Array.isArray(orderedIds)) return;
  applyReorder(parentId, orderedIds);

  try {
    await api.post(`/project/${projectId.value}/pages/reorder`, {
      parent_id: parentId ?? null,
      ordered_ids: orderedIds,
    });
  } catch (error) {
    errorMessage.value = "페이지 순서 저장에 실패했습니다.";
    await fetchPages();
  }
};

const createPage = async () => {
  if (!form.value.title) {
    formError.value = "페이지 제목을 입력해주세요.";
    return;
  }

  if (!projectId.value) {
    formError.value = "프로젝트가 선택되지 않았습니다.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const parentId = await resolveParentId();
    await api.post(`/project/${projectId.value}/pages`, {
      title: form.value.title,
      content: null,
      parent_id: parentId,
    });
    await fetchPages();
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "페이지 생성에 실패했습니다.";
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchPages);
watch(projectId, fetchPages);
watch(workspaceId, fetchPages);
</script>

<style scoped>
.page-nav h3 {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.page-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-list--nested {
  margin-top: 6px;
  margin-left: 10px;
  padding-left: 8px;
  border-left: 1px solid #e5e7eb;
}

.page-link {
  display: block;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f9fafb;
  color: #374151;
  text-decoration: none;
}

.page-link:hover {
  background: #f3f4f6;
}
</style>
