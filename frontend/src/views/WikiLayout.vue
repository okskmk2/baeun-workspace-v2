<template>
  <div class="LnbLayout WikiLayout">
    <aside>
      <button class="btn" type="button" @click="openModal">
        {{ t("wiki.layout.actions.create") }}
      </button>
      <nav class="page-nav">
        <p v-if="isLoading">{{ t("wiki.layout.status.loading") }}</p>
        <p v-else-if="errorMessage">{{ errorMessage }}</p>
        <p v-else-if="pages.length === 0">{{ t("wiki.layout.empty.pages") }}</p>
        <PageTree v-else :nodes="pages" :project-id="projectId" @reorder="handleReorder" />
      </nav>
    </aside>
    <main>
      <router-view />
    </main>
  </div>

  <BaseModal :open="isModalOpen" :title="t('wiki.layout.modal.title')" @close="closeModal">
    <form class="modal-form" @submit.prevent="createPage">
      <label for="page-title">{{ t("wiki.layout.modal.titleLabel") }}</label>
      <input
        id="page-title"
        v-model.trim="form.title"
        type="text"
        :placeholder="t('wiki.layout.modal.titlePlaceholder')"
      />
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeModal">
          {{ t("wiki.layout.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("wiki.layout.actions.creating") : t("wiki.layout.actions.submit") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import PageTree from "../components/PageTree.vue";
import { usePageStore } from "../stores/pageStore";

const { t } = useI18n();
const route = useRoute();

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
    errorMessage.value = t("wiki.layout.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const openModal = () => {
  if (!projectId.value) {
    formError.value = t("wiki.layout.validation.noProject");
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
    errorMessage.value = t("wiki.layout.status.errorReorder");
    await fetchPages();
  }
};

const createPage = async () => {
  if (!form.value.title) {
    formError.value = t("wiki.layout.validation.titleRequired");
    return;
  }

  if (!projectId.value) {
    formError.value = t("wiki.layout.validation.noProject");
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
    formError.value = error?.response?.data?.message || t("wiki.layout.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

onMounted(fetchPages);
watch(projectId, fetchPages);
</script>

<style>
.page-nav {
  font-size: 14px;
}
.WikiLayout aside {
  width: 15rem;
}
</style>
