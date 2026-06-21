<template>
  <div class="LnbLayout WikiLayout">
    <aside>
      <div class="lnb-shell">
        <button class="btn" type="button" @click="openModal">
          {{ t("wiki.layout.actions.create") }}
        </button>
        <nav class="lnb-scroll page-nav">
          <p v-if="isLoading">{{ t("wiki.layout.status.loading") }}</p>
          <p v-else-if="errorMessage">{{ errorMessage }}</p>
          <p v-else-if="pages.length === 0">{{ t("wiki.layout.empty.pages") }}</p>
          <PageTree v-else :nodes="pages" :project-id="projectId" @reorder="handleReorder" />
        </nav>
        <!-- 하단 파일 섹션 -->
        <div class="lnb-files-section">
          <hr class="lnb-section-divider" />
          <button
            type="button"
            class="lnb-files-btn"
            :class="{ 'is-active': activeTab === 'files' }"
            @click="openFiles"
          >
            <MaterialSymbol name="folder_open" :size="16" alt="" />
            <span>파일</span>
          </button>
        </div>
      </div>
    </aside>
    <main>
      <WikiFilesPage
        v-if="activeTab === 'files'"
        :items="currentItems"
        :breadcrumb="currentFolderPath"
        @back="goBack"
        @home="goHome"
        @enter="enterFolder"
        @jump="jumpTo"
      />
      <router-view v-else />
    </main>
  </div>

  <CreatePageModal
    :open="isModalOpen"
    :project-id="projectId"
    :parent-page-id="currentPageId"
    :pages="pages"
    @close="closeModal"
    @created="onPageCreated"
  />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import CreatePageModal from "../../components/modals/CreatePageModal.vue";
import PageTree from "../../components/PageTree.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import WikiFilesPage from "./WikiFilesPage.vue";
import { usePageStore } from "../../stores/pageStore";
import { useProjectSearchStore } from "../../stores/projectSearchStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const projectId = computed(() => route.params.projectId);
const currentPageId = computed(() => route.params.pageId);

const pageStore = usePageStore();
const projectSearchStore = useProjectSearchStore();
const pages = computed(() => pageStore.getPages(projectId.value));
const isLoading = ref(false);
const errorMessage = ref("");
const isModalOpen = ref(false);

const fetchPages = async () => {
  if (!projectId.value) {
    pageStore.pagesByProject[projectId.value] = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await pageStore.fetchPages(projectId.value);
    projectSearchStore.upsertPages(projectId.value, pageStore.getPages(projectId.value));
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    pageStore.pagesByProject[projectId.value] = [];
    errorMessage.value = t("wiki.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const onPageCreated = async () => {
  await fetchPages();
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
    await api.post("/pages/reorder", {
      parent_id: parentId ?? null,
      ordered_ids: orderedIds,
    });
  } catch (error) {
    errorMessage.value = t("wiki.layout.status.errorReorder");
    await fetchPages();
  }
};

onMounted(fetchPages);
watch(projectId, fetchPages);

// ── 파일 스토리지 (UI 목업) ──────────────────────────────────
const mockFileTree = [
  {
    id: 'f1', name: '설계 문서', type: 'folder',
    children: [
      { id: 'f4', name: '아키텍처_다이어그램.pdf', type: 'file', ext: 'pdf', size: '2.1 MB', updatedAt: '2025-12-10' },
      { id: 'f5', name: 'ERD.png', type: 'file', ext: 'png', size: '840 KB', updatedAt: '2025-12-08' },
    ],
  },
  {
    id: 'f2', name: '회의록', type: 'folder',
    children: [
      { id: 'f6', name: '킥오프_회의록.docx', type: 'file', ext: 'docx', size: '45 KB', updatedAt: '2026-06-03' },
      { id: 'f7', name: '스프린트_리뷰.docx', type: 'file', ext: 'docx', size: '38 KB', updatedAt: '2026-06-17' },
    ],
  },
  { id: 'f3', name: '프로젝트_개요.pdf', type: 'file', ext: 'pdf', size: '1.2 MB', updatedAt: '2026-05-20' },
  { id: 'f8', name: '기능명세서.xlsx', type: 'file', ext: 'xlsx', size: '210 KB', updatedAt: '2026-06-01' },
  { id: 'f9', name: '시연_영상.mp4', type: 'file', ext: 'mp4', size: '15.4 MB', updatedAt: '2026-06-15' },
];

const activeTab = ref('pages');
const currentFolderPath = ref([]); // [{ id, name }, ...]

const findNodeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder' && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const findPathTo = (nodes, targetId, path = []) => {
  for (const node of nodes) {
    if (node.id === targetId) return [...path, { id: node.id, name: node.name }];
    if (node.type === 'folder' && node.children) {
      const found = findPathTo(node.children, targetId, [...path, { id: node.id, name: node.name }]);
      if (found) return found;
    }
  }
  return null;
};

const currentItems = computed(() => {
  if (currentFolderPath.value.length === 0) return mockFileTree;
  const lastId = currentFolderPath.value.at(-1).id;
  const folder = findNodeById(mockFileTree, lastId);
  return folder?.children ?? [];
});

const openFiles = () => {
  activeTab.value = 'files';
  currentFolderPath.value = [];
};

const enterFolder = (folderId) => {
  const path = findPathTo(mockFileTree, folderId);
  if (path) currentFolderPath.value = path;
};

const goBack = () => {
  currentFolderPath.value = currentFolderPath.value.slice(0, -1);
};

const goHome = () => {
  currentFolderPath.value = [];
};

const jumpTo = (index) => {
  currentFolderPath.value = currentFolderPath.value.slice(0, index + 1);
};

// 페이지 이동 시 파일 뷰 닫기
watch(() => route.params.pageId, (id) => {
  if (id) activeTab.value = 'pages';
});
</script>

<style scoped>
/* ── LNB 하단 파일 섹션 ── */
.lnb-files-section {
  padding-top: 4px;
}

.lnb-section-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0 0 6px;
}

.lnb-files-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: var(--font-size-label);
  font-weight: 500;
  text-align: left;
  transition: background-color 0.12s, color 0.12s;
}

.lnb-files-btn:hover {
  background-color: var(--color-surface-alt);
  color: var(--color-text);
}

.lnb-files-btn.is-active {
  background-color: var(--color-accent-soft);
  color: var(--color-accent);
}
</style>

