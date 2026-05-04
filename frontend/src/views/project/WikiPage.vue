<template>
  <hgroup>
    <h1 class="WikiPageTitle">{{ page.title || t("wiki.page.header.fallbackTitle") }}</h1>
    <div class="actions">
      <template v-if="isEditing">
        <button type="button" class="btn btn--secondary btn--sm" @click="cancelEdit">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="button" class="btn btn--sm" :disabled="isSaving" @click="savePage">
          {{ isSaving ? t("wiki.page.actions.saving") : t("wiki.page.actions.save") }}
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          :disabled="!canEdit"
          @click="startEdit"
        >
          <MaterialSymbol name="edit" :size="16" alt="" />
          {{ t("wiki.page.actions.edit") }}
        </button>
        <button type="button" class="btn btn--secondary btn--sm" @click="openPermissionModal">
          <MaterialSymbol name="admin_panel_settings" :size="16" alt="" />
          {{ t("wiki.page.actions.permissions") }}
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          :disabled="!canEdit"
          @click="openMoveModal"
        >
          <MaterialSymbol name="drive_file_move" :size="16" alt="" />
          {{ t("wiki.page.actions.move") }}
        </button>
        <button
          v-if="isOwner"
          type="button"
          class="btn btn--danger btn--sm"
          :disabled="isDeleting"
          @click="deletePage"
        >
          <MaterialSymbol name="delete" :size="16" alt="" />
          {{ isDeleting ? t("wiki.page.actions.deleting") : t("wiki.page.actions.delete") }}
        </button>
      </template>
    </div>
  </hgroup>
  <p v-if="isLoading">{{ t("wiki.page.status.loading") }}</p>
  <p v-else-if="errorMessage">{{ errorMessage }}</p>
  <article v-else>
    <template v-if="isEditing">
      <label class="edit-label" for="page-title">{{ t("wiki.page.fields.titleLabel") }}</label>
      <input id="page-title" v-model.trim="editForm.title" type="text" class="edit-input" />
      <div class="edit-split">
        <section class="edit-pane">
          <label class="edit-label" for="page-content">
            {{ t("wiki.page.fields.contentLabel") }}
          </label>
          <textarea
            id="page-content"
            v-model="editForm.content"
            class="edit-textarea"
            rows="14"
            :placeholder="t('wiki.page.fields.contentPlaceholder')"
          ></textarea>
        </section>
        <section class="preview-pane">
          <label class="edit-label">{{ t("wiki.page.fields.previewLabel") }}</label>
          <div class="markdown-body preview" v-html="renderedPreview"></div>
        </section>
      </div>
    </template>
    <template v-else>
      <div v-if="page.content" class="markdown-body" v-html="renderedContent"></div>
      <p v-else class="empty">{{ t("wiki.page.empty.content") }}</p>
    </template>
  </article>

  <PagePermissionModal
    :open="isPermissionOpen"
    :page-id="pageId"
    :project-id="projectId"
    :project-members="projectMembers"
    :page-members="pageMembers"
    :permission-role-options="permissionRoleOptions"
    @close="closePermissionModal"
    @saved="onPermissionSaved"
  />

  <ConfirmCancelEditModal
    :open="isCancelOpen"
    @close="closeCancelModal"
    @confirm="confirmCancelEdit"
  />

  <MovePageModal
    :open="isMoveOpen"
    :page-id="pageId"
    :current-parent-id="page.parent_id ?? null"
    :pages="projectPages"
    :is-saving="isMoving"
    @close="closeMoveModal"
    @save="saveMove"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import PagePermissionModal from "../../components/modals/PagePermissionModal.vue";
import ConfirmCancelEditModal from "../../components/modals/ConfirmCancelEditModal.vue";
import MovePageModal from "../../components/modals/MovePageModal.vue";
import { addToast } from "../../lib/toast";
import { useAppStore } from "../../stores/appStore";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { usePageStore } from "../../stores/pageStore";
import { createMarkdownRenderer } from "../../lib/markdown";
import "highlight.js/styles/github.css";
import { useRoleLabels } from "../../lib/roleLabels";
import MaterialSymbol from "../../components/MaterialSymbol.vue";

const { t } = useI18n();
useRoleLabels();
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
const pageMembers = ref([]);
const isCancelOpen = ref(false);
const isMoveOpen = ref(false);
const isMoving = ref(false);
const permissionRoleOptions = computed(() => [
  { value: "OWNER", label: t("wiki.page.permissions.roles.owner") },
  { value: "EDITOR", label: t("wiki.page.permissions.roles.editor") },
  { value: "VIEWER", label: t("wiki.page.permissions.roles.viewer") },
]);

const appStore = useAppStore();
const projectMemberStore = useProjectMemberStore();
const pageStore = usePageStore();
const currentUserId = computed(() => appStore.currentUser?.id);
const router = useRouter();
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const projectPages = computed(() => pageStore.getPages(projectId.value));

const markdown = createMarkdownRenderer();

const renderedContent = computed(() =>
  page.value.content ? markdown.render(page.value.content) : ""
);

const renderedPreview = computed(() =>
  editForm.value.content ? markdown.render(editForm.value.content) : ""
);

const userPageRole = computed(() => {
  if (!currentUserId.value) return "";
  const found = pageMembers.value.find(
    (member) => String(member.member_id) === String(currentUserId.value)
  );
  return (found?.role_name || "").toUpperCase();
});

const canEdit = computed(() => ["OWNER", "EDITOR"].includes(userPageRole.value));
const isOwner = computed(() => userPageRole.value === "OWNER");

const isDirty = computed(
  () =>
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
    const res = await api.get(`/pages/${pageId.value}`);
    page.value = res.data || {};
  } catch (error) {
    page.value = {};
    errorMessage.value = t("wiki.page.status.errorLoad");
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
    const res = await api.patch(`/pages/${pageId.value}`, {
      title: editForm.value.title,
      content: editForm.value.content,
    });
    page.value = res.data || page.value;
    pageStore.updatePageTitle(projectId.value, pageId.value, page.value.title || "");
    originalForm.value = {
      title: page.value.title || "",
      content: page.value.content || "",
    };
    isEditing.value = false;
    addToast({ message: t("wiki.page.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("wiki.page.status.errorSave");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const handleSaveShortcut = (event) => {
  if (event.repeat) return;
  if (!(event.ctrlKey || event.metaKey)) return;
  if (String(event.key || "").toLowerCase() !== "s") return;
  if (!isEditing.value) return;

  event.preventDefault();

  if (isSaving.value) return;
  savePage();
};

const fetchPageMembers = async () => {
  if (!projectId.value || !pageId.value) {
    pageMembers.value = [];
    return;
  }
  const res = await api.get(`/pages/${pageId.value}/members`);
  pageMembers.value = res.data || [];
};

const openPermissionModal = async () => {
  isPermissionOpen.value = true;
  await fetchPageMembers();
};

const closePermissionModal = () => {
  isPermissionOpen.value = false;
};

const onPermissionSaved = async () => {
  await fetchPageMembers();
};

const openMoveModal = async () => {
  if (!canEdit.value || !projectId.value) return;
  if (!projectPages.value.length) {
    await pageStore.fetchPages(projectId.value);
  }
  isMoveOpen.value = true;
};

const closeMoveModal = () => {
  isMoveOpen.value = false;
};

const normalizeId = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const saveMove = async ({ parentId }) => {
  if (!projectId.value || !pageId.value || !canEdit.value) return;

  isMoving.value = true;
  try {
    const normalizedParentId = normalizeId(parentId);

    await api.patch(`/pages/${pageId.value}`, {
      parent_id: normalizedParentId,
    });

    await Promise.all([fetchPage(), pageStore.fetchPages(projectId.value)]);
    addToast({ message: t("wiki.page.toast.moved"), type: "success" });
    closeMoveModal();
  } catch (error) {
    const message = error?.response?.data?.message || t("wiki.page.status.errorMove");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isMoving.value = false;
  }
};

const closeCancelModal = () => {
  isCancelOpen.value = false;
};

const confirmCancelEdit = () => {
  isEditing.value = false;
  isCancelOpen.value = false;
};

const deletePage = async () => {
  if (!projectId.value || !pageId.value) return;
  if (!isOwner.value) return;

  const confirmed = window.confirm(t("wiki.page.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  try {
    await api.delete(`/pages/${pageId.value}`);
    await pageStore.fetchPages(projectId.value);
    await router.push(`/project/${projectId.value}/wiki`);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("wiki.page.status.errorDelete");
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchPage);
onMounted(() => {
  window.addEventListener("keydown", handleSaveShortcut);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleSaveShortcut);
});
watch(pageId, fetchPage);
watch(projectId, fetchPage);
onMounted(fetchPageMembers);
watch(pageId, fetchPageMembers);
watch(projectId, fetchPageMembers);
</script>

<style scoped>
.WikiPageTitle {
  font-size: 32px;
}

.actions .btn {
  display: inline-flex;
  align-items: center;
}

.edit-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 12px;
}

.edit-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview {
  min-height: 320px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  background-color: var(--color-surface);
  overflow: auto;
}

@media (max-width: 900px) {
  .edit-split {
    grid-template-columns: 1fr;
  }
}

.edit-label {
  display: block;
  font-size: 13px;
  margin: 0 0 6px;
  color: var(--color-text);
}

.edit-input,
.edit-textarea {
  width: 100%;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 15px;
  margin-bottom: 12px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.edit-textarea {
  height: 100%;
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
  color: var(--color-text);
}

.permission-row .role {
  color: var(--color-text-muted);
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
