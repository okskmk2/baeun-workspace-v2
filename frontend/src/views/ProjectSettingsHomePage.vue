<template>
  <hgroup>
    <div>
      <h1>{{ t("settings.home.header.title") }}</h1>
      <p class="subtitle">{{ t("settings.home.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("settings.home.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveSettings">
    <label for="project-name">{{ t("settings.home.form.nameLabel") }}</label>
    <input
      id="project-name"
      v-model.trim="form.name"
      type="text"
      :placeholder="t('settings.home.form.namePlaceholder')"
    />

    <div class="theme-section">
      <div class="theme-header">
        <h2>{{ t("settings.home.theme.title") }}</h2>
        <span class="theme-desc">{{ t("settings.home.theme.subtitle") }}</span>
      </div>
      <div class="theme-grid">
        <label
          v-for="item in themeOptions"
          :key="item.id"
          class="theme-item"
          :class="{ selected: form.themeId === item.id }"
          :data-theme="item.id"
          :style="{
            '--swatch-bg': `var(--theme-${item.id}-bg)`,
            '--swatch-fg': `var(--theme-${item.id}-fg)`,
          }"
        >
          <input type="radio" name="theme" :value="item.id" v-model="form.themeId" />
          <div class="swatch">Aa</div>
          <span class="theme-name">{{ item.label }}</span>
        </label>
      </div>
    </div>

    <p v-if="formError" class="status error">{{ formError }}</p>

    <div class="form-actions">
      <button type="submit" class="btn" :disabled="isSaving">
        {{ isSaving ? t("settings.home.actions.saving") : t("settings.home.actions.save") }}
      </button>
    </div>
  </form>

  <section class="danger-zone">
    <div>
      <h2>{{ t("settings.home.danger.title") }}</h2>
      <p class="danger-desc">{{ t("settings.home.danger.description") }}</p>
    </div>
    <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="openDeleteModal">
      {{ isDeleting ? t("settings.home.actions.deleting") : t("settings.home.actions.delete") }}
    </button>
  </section>

  <BaseModal
    :open="isDeleteModalOpen"
    :title="t('settings.home.deleteModal.title')"
    :close-on-backdrop="!isDeleting"
    @close="closeDeleteModal"
  >
    <div class="delete-modal-body">
      <p>{{ t("settings.home.deleteModal.description", { name: form.name || "-" }) }}</p>
      <p class="delete-warning">{{ t("settings.home.deleteModal.warning") }}</p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="closeDeleteModal"
          :disabled="isDeleting"
        >
          {{ t("settings.home.actions.cancel") }}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          @click="confirmDeleteProject"
          :disabled="isDeleting"
        >
          {{ isDeleting ? t("settings.home.actions.deleting") : t("settings.home.actions.delete") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { addToast } from "../lib/toast";
import { useAppStore } from "../stores/appStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const projectId = computed(() => route.params.projectId);
const appStore = useAppStore();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const errorMessage = ref("");
const formError = ref("");
const projectWorkspaceId = ref(null);
const form = ref({
  name: "",
  themeId: "",
});

const themeOptionsBase = [
  "light",
  "dark",
  "indigo",
  "rose",
  "emerald",
  "amber",
  "sky",
  "stone",
  "violet",
  "teal",
];

const themeOptions = computed(() =>
  themeOptionsBase.map((id) => ({
    id,
    label: t(`settings.home.theme.themes.${id}`),
  }))
);

const resolveThemeId = (theme) => {
  if (theme?.themeId && themeOptionsBase.some((id) => id === theme.themeId)) {
    return theme.themeId;
  }
  return "classic";
};

const fetchProject = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/projects/${projectId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    form.value.themeId = resolveThemeId(data.theme_json?.gnb);
    projectWorkspaceId.value = data.workspace_id || null;
  } catch (error) {
    errorMessage.value = t("settings.home.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

const saveSettings = async () => {
  if (!form.value.name) {
    formError.value = t("settings.home.validation.nameRequired");
    return;
  }

  const selected = themeOptionsBase.find((id) => id === form.value.themeId);
  if (!selected) {
    formError.value = t("settings.home.validation.themeRequired");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    await api.patch(`/projects/${projectId.value}`, {
      name: form.value.name,
      theme_json: {
        gnb: {
          themeId: selected,
        },
      },
    });
    if (projectId.value) {
      const current = workspaceStore.getProject(projectId.value) || {};
      workspaceStore.projectById[projectId.value] = {
        ...current,
        name: form.value.name,
        theme_json: {
          ...(current.theme_json || {}),
          gnb: {
            themeId: selected,
          },
        },
      };
    }
    addToast({ message: t("settings.home.toast.updated"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("settings.home.status.errorUpdate");
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

const openDeleteModal = () => {
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  if (isDeleting.value) return;
  isDeleteModalOpen.value = false;
};

const confirmDeleteProject = async () => {
  if (!projectId.value) return;

  isDeleting.value = true;
  errorMessage.value = "";

  try {
    await api.delete(`/projects/${projectId.value}`);
    if (workspaceStore.projectById?.[projectId.value]) {
      delete workspaceStore.projectById[projectId.value];
    }
    addToast({ message: t("settings.home.toast.deleted"), type: "success" });
    isDeleteModalOpen.value = false;

    if (projectWorkspaceId.value) {
      await router.push(`/settings/workspaces/${projectWorkspaceId.value}`);
    } else {
      await router.push("/settings/workspaces");
    }
  } catch (error) {
    const message = error?.response?.data?.message || t("settings.home.status.errorDelete");
    errorMessage.value = message;
    addToast({ message, type: "error" });
  } finally {
    isDeleting.value = false;
  }
};

onMounted(fetchProject);

watch(
  () => form.value.themeId,
  (value) => {
    const selected = themeOptions.value.find((item) => item.id === value);
    if (!selected) {
      appStore.clearGnbPreviewTheme();
      return;
    }
    appStore.setGnbPreviewTheme({ themeId: selected.id });
  }
);

onBeforeUnmount(() => {
  appStore.clearGnbPreviewTheme();
});
</script>

<style scoped>
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-form input {
  max-width: 360px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.theme-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.theme-header h2 {
  margin: 0;
  font-size: 16px;
  color: var(--color-text);
}

.theme-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.theme-item {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.theme-item input {
  display: none;
}

.theme-item.selected {
  border-color: var(--color-text);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-text) 15%, transparent);
}

.swatch {
  height: 54px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background-color: var(--swatch-bg, var(--color-surface));
  color: var(--swatch-fg, var(--color-text));
}

.theme-name {
  font-size: 12px;
  color: var(--color-text);
}

.status {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.status.error {
  color: var(--color-danger);
}

.form-actions {
  display: flex;
  justify-content: flex-start;
}

.danger-zone {
  margin-top: 16px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 35%, var(--color-border));
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: var(--color-surface);
}

.danger-zone h2 {
  margin: 0;
  font-size: 16px;
}

.danger-desc {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.delete-modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delete-modal-body p {
  margin: 0;
}

.delete-warning {
  color: var(--color-danger);
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
