<template>
  <BackLinkButton @click="router.back()">{{ t("kanban.settings.actions.back") }}</BackLinkButton>

  <hgroup>
    <div>
      <h1>{{ t("kanban.settings.header.title") }}</h1>
      <p class="subtitle">{{ t("kanban.settings.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("kanban.settings.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveKanban">
    <label for="kanban-name">{{ t("kanban.settings.form.nameLabel") }}</label>
    <input
      id="kanban-name"
      v-model.trim="form.name"
      type="text"
      :placeholder="t('kanban.settings.form.namePlaceholder')"
    />

    <label for="kanban-summary">{{ t("kanban.settings.form.summaryLabel") }}</label>
    <textarea
      id="kanban-summary"
      v-model.trim="form.summary"
      rows="4"
      :placeholder="t('kanban.settings.form.summaryPlaceholder')"
    />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{ isSaving ? t("kanban.settings.actions.saving") : t("kanban.settings.actions.save") }}
      </button>
    </div>
  </form>

  <DangerZone
    v-if="!isLoading && !errorMessage && !isBacklog"
    :title="t('kanban.settings.danger.title')"
    :description="t('kanban.settings.danger.description')"
  >
    <template #actions>
      <button
        v-if="canDeactivate"
        type="button"
        class="btn btn--secondary"
        :disabled="isDeactivating"
        @click="deactivateKanban"
      >
        {{
          isDeactivating
            ? t("kanban.settings.actions.deactivating")
            : t("kanban.settings.actions.deactivate")
        }}
      </button>
      <p v-if="deactivateError" class="status error">{{ deactivateError }}</p>
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="deleteKanban">
        {{ isDeleting ? t("kanban.settings.actions.deleting") : t("kanban.settings.actions.delete") }}
      </button>
      <p v-if="deleteError" class="status error">{{ deleteError }}</p>
    </template>
  </DangerZone>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import BackLinkButton from "../../components/BackLinkButton.vue";
import DangerZone from "../../components/DangerZone.vue";
import { useKanbanStore } from "../../stores/kanbanStore";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const kanbanStore = useKanbanStore();

const projectId = computed(() => route.params.projectId);
const kanbanId = computed(() => route.params.kanbanId);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeactivating = ref(false);
const errorMessage = ref("");
const formError = ref("");
const deleteError = ref("");
const deactivateError = ref("");
const kanbanType = ref("KANBAN");
const isActive = ref(true);

const form = ref({
  name: "",
  summary: "",
});

const isBacklog = computed(() => String(kanbanType.value || "").toUpperCase() === "BACKLOG");
const canDeactivate = computed(() => !isBacklog.value && isActive.value);

const fetchKanban = async () => {
  if (!kanbanId.value) return;

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/kanbans/${kanbanId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    form.value.summary = data.summary || "";
    kanbanType.value = data.type || "KANBAN";
    isActive.value = data.is_active !== false;
  } catch (error) {
    if (error?.response?.status === 404) {
      router.push("/not-found");
      return;
    }
    errorMessage.value = error?.response?.data?.message || t("kanban.settings.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const saveKanban = async () => {
  if (!form.value.name) {
    formError.value = t("kanban.settings.validation.nameRequired");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    const res = await api.patch(`/kanbans/${kanbanId.value}`, {
      name: form.value.name,
      summary: form.value.summary || null,
    });
    const updated = res.data;
    if (projectId.value) {
      kanbanStore.updateKanbanDetails(kanbanId.value, projectId.value, {
        name: updated?.name ?? form.value.name,
        summary: updated?.summary ?? form.value.summary,
      });
    }
    addToast({ message: t("kanban.settings.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("kanban.settings.status.errorUpdate");
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const deleteKanban = async () => {
  if (!kanbanId.value) return;

  const confirmed = window.confirm(t("kanban.settings.confirm.delete"));
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await kanbanStore.deleteKanban(kanbanId.value, projectId.value);
    router.push(`/project/${projectId.value}/kanban`);
  } catch (error) {
    deleteError.value = error?.response?.data?.message || t("kanban.settings.status.errorDelete");
  } finally {
    isDeleting.value = false;
  }
};

const deactivateKanban = async () => {
  if (!kanbanId.value || !projectId.value || !canDeactivate.value) return;

  const confirmed = window.confirm(t("kanban.settings.confirm.deactivate"));
  if (!confirmed) return;

  isDeactivating.value = true;
  deactivateError.value = "";

  try {
    const res = await api.patch(`/kanbans/${kanbanId.value}`, { is_active: false });
    isActive.value = res.data?.is_active !== false ? true : false;
    kanbanStore.updateKanbanDetails(kanbanId.value, projectId.value, { is_active: false });
    addToast({ message: t("kanban.settings.toast.deactivated"), type: "success" });
    router.push(`/project/${projectId.value}/kanban/archive`);
  } catch (error) {
    const message = error?.response?.data?.message || t("kanban.settings.status.errorDeactivate");
    deactivateError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isDeactivating.value = false;
  }
};

onMounted(fetchKanban);

watch(kanbanId, (nextId, prevId) => {
  if (nextId && nextId !== prevId) {
    fetchKanban();
  }
});
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
}

.settings-form input,
.settings-form textarea {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.settings-form textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.status {
  margin-top: 8px;
}

.status.error {
  color: var(--color-danger);
}

</style>
