<template>
  <hgroup>
    <div>
      <h1>{{ t("settings.home.header.title") }}</h1>
      <p class="subtitle">{{ t("settings.home.header.subtitle") }}</p>
    </div>
    <div class="actions">
      <button type="button" class="btn" :disabled="isSaving" @click="saveSettings">
        {{ isSaving ? t("settings.home.actions.saving") : t("settings.home.actions.save") }}
      </button>
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
        <label class="theme-item theme-item--inherit" :class="{ selected: !form.themeId }">
          <input type="radio" name="theme" value="" v-model="form.themeId" />
          <div class="swatch swatch--inherit">WS</div>
          <span class="theme-name">{{ t("settings.home.theme.inheritName") }}</span>
          <span class="theme-desc-small">{{ t("settings.home.theme.inheritSubtitle") }}</span>
        </label>
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
        <label
          class="theme-item"
          :class="{ selected: form.themeId === 'custom' }"
          :style="{
            '--swatch-bg': form.customBackground,
            '--swatch-fg': form.customForeground,
          }"
        >
          <input type="radio" name="theme" value="custom" v-model="form.themeId" />
          <div class="swatch">Aa</div>
          <span class="theme-name">Custom</span>
        </label>
      </div>

      <div v-if="form.themeId === 'custom'" class="custom-theme-controls">
        <label for="project-theme-bg">GNB Background</label>
        <input id="project-theme-bg" v-model="form.customBackground" type="color" />

        <label for="project-theme-fg">GNB Foreground</label>
        <input id="project-theme-fg" v-model="form.customForeground" type="color" />
      </div>
    </div>

    <p v-if="formError" class="status error">{{ formError }}</p>
  </form>

  <DangerZone
    :title="t('settings.home.danger.title')"
    :description="t('settings.home.danger.description')"
  >
    <template #actions>
      <button type="button" class="btn btn--danger" :disabled="isDeleting" @click="openDeleteModal">
        {{ isDeleting ? t("settings.home.actions.deleting") : t("settings.home.actions.delete") }}
      </button>
    </template>
  </DangerZone>

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
import api from "../../lib/axios";
import BaseModal from "../../components/BaseModal.vue";
import DangerZone from "../../components/DangerZone.vue";
import { addToast } from "../../lib/toast";
import { useAppStore } from "../../stores/appStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

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
  customBackground: "#1f2937",
  customForeground: "#ffffff",
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
  if (theme?.themeId === "custom") return "custom";
  if (theme?.background || theme?.foreground) return "custom";
  if (theme?.themeId && themeOptionsBase.some((id) => id === theme.themeId)) {
    return theme.themeId;
  }
  return "";
};

const normalizeHexColor = (value, fallback) => {
  const input = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input;
  if (/^#[0-9a-fA-F]{3}$/.test(input)) {
    const r = input[1];
    const g = input[2];
    const b = input[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
};

const resolveCustomColors = (theme) => ({
  background: normalizeHexColor(theme?.background, "#1f2937"),
  foreground: normalizeHexColor(theme?.foreground, "#ffffff"),
});

const fetchProject = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/projects/${projectId.value}`);
    const data = res.data || {};
    form.value.name = data.name || "";
    const gnbTheme = data.theme_json?.gnb || null;
    form.value.themeId = resolveThemeId(gnbTheme);
    const customColors = resolveCustomColors(gnbTheme);
    form.value.customBackground = customColors.background;
    form.value.customForeground = customColors.foreground;
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

  const selected = themeOptionsBase.find((id) => id === form.value.themeId) || "";
  const isCustom = form.value.themeId === "custom";
  const isInherit = !selected && !isCustom;

  const customBackground = normalizeHexColor(form.value.customBackground, "");
  const customForeground = normalizeHexColor(form.value.customForeground, "");
  if (isCustom && (!customBackground || !customForeground)) {
    formError.value = "Please check custom theme colors.";
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    await api.patch(`/projects/${projectId.value}`, {
      name: form.value.name,
      theme_json: isInherit
        ? {}
        : {
            gnb: isCustom
              ? {
                  themeId: "custom",
                  background: customBackground,
                  foreground: customForeground,
                }
              : {
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
          ...(isInherit
            ? {
                gnb: {},
              }
            : isCustom
              ? {
                  gnb: {
                    themeId: "custom",
                    background: customBackground,
                    foreground: customForeground,
                  },
                }
              : {
                  gnb: {
                    themeId: selected,
                  },
                }),
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
    if (value === "custom") {
      appStore.setGnbPreviewTheme({
        themeId: "custom",
        background: form.value.customBackground,
        foreground: form.value.customForeground,
      });
      return;
    }

    const selected = themeOptions.value.find((item) => item.id === value);
    if (!selected) {
      appStore.clearGnbPreviewTheme();
      return;
    }
    appStore.setGnbPreviewTheme({ themeId: selected.id });
  }
);

watch(
  () => [form.value.customBackground, form.value.customForeground],
  ([background, foreground]) => {
    if (form.value.themeId !== "custom") return;
    appStore.setGnbPreviewTheme({
      themeId: "custom",
      background,
      foreground,
    });
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

.custom-theme-controls {
  margin-top: 12px;
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 8px 12px;
  max-width: 320px;
}

.custom-theme-controls input[type="color"] {
  width: 44px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  background: transparent;
}

.theme-item {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.theme-item--inherit {
  background: color-mix(in srgb, var(--color-surface) 85%, var(--color-border) 15%);
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

.swatch--inherit {
  background: repeating-linear-gradient(
    45deg,
    color-mix(in srgb, var(--color-border) 70%, transparent) 0,
    color-mix(in srgb, var(--color-border) 70%, transparent) 8px,
    transparent 8px,
    transparent 16px
  );
  color: var(--color-text-muted);
}

.theme-name {
  font-size: 12px;
  color: var(--color-text);
}

.theme-desc-small {
  font-size: 11px;
  color: var(--color-text-muted);
}

.status {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.status.error {
  color: var(--color-danger);
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
</style>
