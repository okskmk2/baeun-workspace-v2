<template>
  <hgroup>
    <h1>{{ page.title || t("wiki.page.header.fallbackTitle") }}</h1>
    <div class="actions">
      <button
        type="button"
        class="btn btn--secondary btn--sm"
        :disabled="!canEdit"
        @click="startEdit"
      >
        {{ t("wiki.page.actions.edit") }}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" @click="openPermissionModal">
        {{ t("wiki.page.actions.permissions") }}
      </button>
      <button
        v-if="isOwner"
        type="button"
        class="btn btn--danger btn--sm"
        :disabled="isDeleting"
        @click="deletePage"
      >
        {{ isDeleting ? t("wiki.page.actions.deleting") : t("wiki.page.actions.delete") }}
      </button>
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
      <div class="edit-actions">
        <button type="button" class="btn btn--secondary" @click="cancelEdit">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="button" class="btn" :disabled="isSaving" @click="savePage">
          {{ isSaving ? t("wiki.page.actions.saving") : t("wiki.page.actions.save") }}
        </button>
      </div>
    </template>
    <template v-else>
      <div v-if="page.content" class="markdown-body" v-html="renderedContent"></div>
      <p v-else class="empty">{{ t("wiki.page.empty.content") }}</p>
    </template>
  </article>

  <BaseModal
    :open="isPermissionOpen"
    :title="t('wiki.page.permissions.modal.title')"
    @close="closePermissionModal"
  >
    <form class="modal-form" @submit.prevent="savePermission">
      <label for="permission-member">{{ t("wiki.page.permissions.membersLabel") }}</label>
      <select id="permission-member" v-model="permissionForm.memberId">
        <option value="">{{ t("wiki.page.permissions.selectPlaceholder") }}</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <label for="permission-role">{{ t("wiki.page.permissions.roleLabel") }}</label>
      <select id="permission-role" v-model="permissionForm.roleName">
        <option v-for="option in permissionRoleOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <p v-if="permissionError" class="form-error">{{ permissionError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closePermissionModal">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isPermissionSaving">
          {{ isPermissionSaving ? t("wiki.page.actions.saving") : t("wiki.page.actions.save") }}
        </button>
      </div>
    </form>
    <div v-if="pageMembers.length" class="permission-list">
      <div v-for="member in pageMembers" :key="member.member_id" class="permission-row">
        <span>{{ member.name }}</span>
        <span class="role">{{ getRoleLabel("page_member", member.role_name) }}</span>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    :open="isCancelOpen"
    :title="t('wiki.page.confirm.cancel.title')"
    @close="closeCancelModal"
  >
    <p>{{ t("wiki.page.confirm.cancel.message") }}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn--secondary" @click="closeCancelModal">
        {{ t("wiki.page.confirm.cancel.keepEditing") }}
      </button>
      <button type="button" class="btn" @click="confirmCancelEdit">
        {{ t("wiki.page.confirm.cancel.discard") }}
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { useAppStore } from "../stores/appStore";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { usePageStore } from "../stores/pageStore";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { useRoleLabels } from "../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();
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
const pageMembers = ref([]);
const permissionForm = ref({ memberId: "", roleName: "VIEWER" });
const isCancelOpen = ref(false);
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

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight: (code, language) => {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

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
    const res = await api.get(`/pages/${pageId.value}`, {
      params: { project_id: projectId.value },
    });
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
    const res = await api.patch(
      `/pages/${pageId.value}`,
      {
        title: editForm.value.title,
        content: editForm.value.content,
      },
      {
        params: { project_id: projectId.value },
      }
    );
    page.value = res.data || page.value;
    originalForm.value = {
      title: page.value.title || "",
      content: page.value.content || "",
    };
    isEditing.value = false;
  } catch (error) {
    errorMessage.value = t("wiki.page.status.errorSave");
  } finally {
    isSaving.value = false;
  }
};

const fetchPageMembers = async () => {
  if (!projectId.value || !pageId.value) {
    pageMembers.value = [];
    return;
  }
  const res = await api.get(`/pages/${pageId.value}/members`, {
    params: { project_id: projectId.value },
  });
  pageMembers.value = res.data || [];
};

const openPermissionModal = async () => {
  if (!projectId.value || !pageId.value) return;
  permissionForm.value = { memberId: "", roleName: "VIEWER" };
  permissionError.value = "";
  isPermissionOpen.value = true;
  await fetchPageMembers();
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
    permissionError.value = t("wiki.page.permissions.validation.selectMember");
    return;
  }
  if (!projectId.value || !pageId.value) return;

  isPermissionSaving.value = true;
  permissionError.value = "";
  try {
    await api.post(
      `/pages/${pageId.value}/members`,
      {
        member_id: permissionForm.value.memberId,
        role_name: permissionForm.value.roleName,
      },
      {
        params: { project_id: projectId.value },
      }
    );
    await fetchPageMembers();
  } catch (error) {
    permissionError.value =
      error?.response?.data?.message || t("wiki.page.permissions.status.errorUpdate");
  } finally {
    isPermissionSaving.value = false;
  }
};

const deletePage = async () => {
  if (!projectId.value || !pageId.value) return;
  if (!isOwner.value) return;

  const confirmed = window.confirm(t("wiki.page.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  try {
    await api.delete(`/pages/${pageId.value}`, {
      params: { project_id: projectId.value },
    });
    await pageStore.fetchPages(projectId.value);
    await router.push(`/project/${projectId.value}/wiki`);
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || t("wiki.page.status.errorDelete");
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
