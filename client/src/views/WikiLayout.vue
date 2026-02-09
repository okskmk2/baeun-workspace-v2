<template>
  <div class="AcountLayout">
    <aside>
      <button class="btn" type="button" @click="openModal">Create Page</button>
      <nav class="page-nav">
        <p v-if="isLoading">Loading...</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="pages.length === 0">No pages yet.</p>
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

  <BaseModal :open="isModalOpen" title="Create Page" @close="closeModal">
    <form class="modal-form" @submit.prevent="createPage">
      <label for="page-title">Page Title</label>
      <input id="page-title" v-model.trim="form.title" type="text" placeholder="Page Title" />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">Cancel</button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? "Creating..." : "Create" }}
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
import { usePageStore } from "../stores/pageStore";

const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const currentPageId = computed(() => route.params.pageId);

const pageStore = usePageStore();
const pages = computed(() => pageStore.getPages(projectId.value));
const isLoading = ref(false);
const errorMessage = ref("");

const isModalOpen = ref(false);
const isCreating = ref(false);
const formError = ref("");
const form = ref({ title: "" });

const fetchPages = async () => {
  if (!projectId.value) {
    pageStore.pagesByProject[projectId.value] = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    await pageStore.fetchPages(projectId.value);
  } catch (error) {
    pageStore.pagesByProject[projectId.value] = [];
    errorMessage.value = "Failed to load pages.";
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = "No project selected.";
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
    await api.post(
      "/pages/reorder",
      {
        parent_id: parentId ?? null,
        ordered_ids: orderedIds,
      },
      {
        params: { project_id: projectId.value },
      }
    );
  } catch (error) {
    errorMessage.value = "Failed to update page order.";
    await fetchPages();
  }
};

const createPage = async () => {
  if (!form.value.title) {
    formError.value = "Please enter a page title.";
    return;
  }

  if (!projectId.value) {
    formError.value = "No project selected.";
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    const parentId = await resolveParentId();
    await api.post(
      "/pages",
      {
        title: form.value.title,
        content: null,
        parent_id: parentId,
      },
      {
        params: { project_id: projectId.value },
      }
    );
    await pageStore.fetchPages(projectId.value);
    closeModal();
  } catch (error) {
    formError.value = error?.response?.data?.message || "Failed to create page.";
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
