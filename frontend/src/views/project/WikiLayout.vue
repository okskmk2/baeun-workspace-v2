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
          <button type="button" class="lnb-files-btn" @click="openFiles">
            <MaterialSymbol name="folder_open" :size="16" alt="" />
            <span>파일</span>
          </button>
        </div>
      </div>
    </aside>
    <main>
      <router-view />
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

const openFiles = () => {
  if (!projectId.value) return;
  router.push(`/project/${projectId.value}/wiki/files`);
};
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
  transition:
    background-color 0.12s,
    color 0.12s;
}
</style>
