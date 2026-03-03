<template>
  <BackLinkButton @click="$router.back()">
    {{ t("kanban.settings.actions.back") }}
  </BackLinkButton>
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
    <input
      id="kanban-summary"
      v-model.trim="form.summary"
      type="text"
      maxlength="80"
      :placeholder="t('kanban.settings.form.summaryPlaceholder')"
    />

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{ isSaving ? t("kanban.settings.actions.saving") : t("kanban.settings.actions.save") }}
      </button>
    </div>
  </form>

  <section class="danger-zone">
    <div>
      <h2>{{ t("kanban.settings.danger.title") }}</h2>
      <p class="danger-desc">{{ t("kanban.settings.danger.description") }}</p>
    </div>
    <div class="danger-actions">
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="deleteKanban">
        {{ isDeleting ? t("kanban.settings.actions.deleting") : t("kanban.settings.actions.delete") }}
      </button>
      <p v-if="deleteError" class="status error">{{ deleteError }}</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import BackLinkButton from "../../components/BackLinkButton.vue";
import { useKanbanStore } from "../../stores/kanbanStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const kanbanStore = useKanbanStore();

const projectId = computed(() => route.params.projectId);
const kanbanId = computed(() => route.params.kanbanId);

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const formError = ref("");
const deleteError = ref("");
const form = ref({
  name: "",
  summary: "",
});

const fetchKanban = async () => {
  if (!kanbanId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/kanbans/${kanbanId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    form.value.summary = data.summary || "";
  } catch (error) {
    errorMessage.value = t("kanban.settings.status.errorLoad");
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
      summary: form.value.summary,
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
  max-width: 420px;
}

.settings-form input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.status {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.status.error {
  color: var(--color-danger);
}

.danger-zone {
  margin-top: 32px;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 50%, transparent 50%);
  background-color: color-mix(in srgb, var(--color-danger) 6%, transparent 94%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.danger-zone h2 {
  font-size: 16px;
  margin: 0 0 4px;
}

.danger-desc {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

@media (max-width: 700px) {
  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }

  .danger-actions {
    align-items: flex-start;
  }
}
</style>

