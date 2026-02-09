<template>
  <section class="settings-home">
    <hgroup>
      <h1>{{ t("settings.home.header.title") }}</h1>
      <p>{{ t("settings.home.header.subtitle") }}</p>
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
        <div class="palette">
          <label
            v-for="item in themePalette"
            :key="item.id"
            class="palette-item"
            :class="{ selected: form.themeId === item.id }"
          >
            <input
              type="radio"
              name="theme"
              :value="item.id"
              v-model="form.themeId"
            />
            <div class="swatch" :style="{ background: item.bg, color: item.fg }">
              Aa
            </div>
            <span class="palette-name">{{ item.label }}</span>
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
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import { addToast } from "../lib/toast";
import { useAppStore } from "../stores/appStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

const { t } = useI18n();
const route = useRoute();
const workspaceId = computed(() => route.params.workspaceId);
const projectId = computed(() => route.params.projectId);
const appStore = useAppStore();
const workspaceStore = useWorkspaceStore();

const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const formError = ref("");
const form = ref({
  name: "",
  themeId: "",
});

const themePaletteBase = [
  { id: "classic", bg: "#ffffff", fg: "#111827" },
  { id: "indigo", bg: "#312e81", fg: "#e0e7ff" },
  { id: "rose", bg: "#9f1239", fg: "#fff1f2" },
  { id: "emerald", bg: "#065f46", fg: "#ecfdf5" },
  { id: "amber", bg: "#92400e", fg: "#fffbeb" },
  { id: "sky", bg: "#0c4a6e", fg: "#e0f2fe" },
  { id: "stone", bg: "#292524", fg: "#fafaf9" },
  { id: "violet", bg: "#4c1d95", fg: "#ede9fe" },
  { id: "teal", bg: "#0f766e", fg: "#f0fdfa" },
];

const themePalette = computed(() =>
  themePaletteBase.map((item) => ({
    ...item,
    label: t(`settings.home.theme.palette.${item.id}`),
  }))
);

const resolveThemeId = (theme) => {
  if (
    theme?.paletteId &&
    themePaletteBase.some((item) => item.id === theme.paletteId)
  ) {
    return theme.paletteId;
  }
  if (theme?.background && theme?.foreground) {
    const match = themePaletteBase.find(
      (item) => item.bg === theme.background && item.fg === theme.foreground
    );
    if (match) return match.id;
  }
  return "classic";
};

const fetchProject = async () => {
  if (!projectId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/projects/${projectId.value}`);
    const data = res.data?.data || {};
    form.value.name = data.name || "";
    form.value.themeId = resolveThemeId(data.theme_json?.gnb);
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

  const selected = themePaletteBase.find((item) => item.id === form.value.themeId);
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
          paletteId: selected.id,
          background: selected.bg,
          foreground: selected.fg,
        },
      },
    });
    if (workspaceId.value && projectId.value) {
      const list = workspaceStore.getProjects(workspaceId.value);
      const updated = list.map((project) => {
        if (String(project.id) !== String(projectId.value)) return project;
        return {
          ...project,
          name: form.value.name,
          theme_json: {
            ...(project.theme_json || {}),
            gnb: {
              paletteId: selected.id,
              background: selected.bg,
              foreground: selected.fg,
            },
          },
        };
      });
      workspaceStore.projectsByWorkspace[workspaceId.value] = updated;
    }
    addToast({ message: t("settings.home.toast.updated"), type: "success" });
  } catch (error) {
    const message =
      error?.response?.data?.message || t("settings.home.status.errorUpdate");
    formError.value = message;
    addToast({ message, type: "error" });
  } finally {
    isSaving.value = false;
  }
};

onMounted(fetchProject);

watch(
  () => form.value.themeId,
  (value) => {
    const selected = themePalette.value.find((item) => item.id === value);
    if (!selected) {
      appStore.clearGnbPreviewTheme();
      return;
    }
    appStore.setGnbPreviewTheme({
      background: selected.bg,
      foreground: selected.fg,
    });
  }
);

onBeforeUnmount(() => {
  appStore.clearGnbPreviewTheme();
});
</script>

<style scoped>
.settings-home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

hgroup h1 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #111827;
}

hgroup p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-form input {
  max-width: 360px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 14px;
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
  color: #111827;
}

.theme-desc {
  font-size: 12px;
  color: #6b7280;
}

.palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.palette-item {
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  cursor: pointer;
}

.palette-item input {
  display: none;
}

.palette-item.selected {
  border-color: #111827;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.1);
}

.swatch {
  height: 54px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.palette-name {
  font-size: 12px;
  color: #374151;
}

.status {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.status.error {
  color: #b91c1c;
}

.form-actions {
  display: flex;
  justify-content: flex-start;
}
</style>
