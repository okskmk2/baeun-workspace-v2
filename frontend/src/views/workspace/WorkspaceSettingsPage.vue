<template>
  <hgroup>
    <div>
      <h1>워크스페이스 설정</h1>
      <p class="subtitle">워크스페이스 기본 정보를 관리합니다.</p>
    </div>
    <div class="actions">
      <button
        type="button"
        class="btn"
        :disabled="!canManageWorkspace || isUpdatingName"
        @click="saveSettings"
      >
        {{ isUpdatingName ? "저장 중..." : "저장" }}
      </button>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">불러오는 중...</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <form v-else class="settings-form" @submit.prevent="saveSettings">
    <section class="image-section">
      <label>워크스페이스 이미지</label>
      <div class="workspace-image-row">
        <Avatar
          :text="workspaceImageFallback"
          :label="workspaceName || 'Workspace'"
          :image-url="workspaceImageUrl"
          :size="56"
        />
        <input
          ref="workspaceImageInputRef"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          class="workspace-image-input"
          @change="onWorkspaceImageChange"
        />
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="!canManageWorkspace || isUploadingWorkspaceImage || isRemovingWorkspaceImage"
          @click="openWorkspaceImagePicker"
        >
          {{ isUploadingWorkspaceImage ? "업로드 중..." : "이미지 변경" }}
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="
            !canManageWorkspace ||
            !workspaceImageUrl ||
            isUploadingWorkspaceImage ||
            isRemovingWorkspaceImage
          "
          @click="removeWorkspaceImage"
        >
          {{ isRemovingWorkspaceImage ? "삭제 중..." : "이미지 삭제" }}
        </button>
      </div>
      <p v-if="workspaceImageError" class="status error">{{ workspaceImageError }}</p>
      <p v-else-if="workspaceImageSuccess" class="status success">{{ workspaceImageSuccess }}</p>
    </section>

    <label for="workspace-name-input">워크스페이스 이름</label>
    <input
      id="workspace-name-input"
      v-model.trim="nameForm"
      type="text"
      :disabled="!canManageWorkspace || isUpdatingName"
      placeholder="워크스페이스 이름 입력"
    />
    <p v-if="nameError" class="status error">{{ nameError }}</p>
    <p v-else-if="nameSuccess" class="status success">{{ nameSuccess }}</p>
    <p v-if="!canManageWorkspace" class="status muted">OWNER 또는 ADMIN만 수정할 수 있습니다.</p>

    <div class="theme-section">
      <div class="theme-header">
        <h2>테마</h2>
        <span class="theme-desc">워크스페이스 GNB 색상을 설정합니다.</span>
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
        <label for="workspace-theme-bg">GNB 배경색</label>
        <input
          id="workspace-theme-bg"
          v-model="form.customBackground"
          type="color"
          :disabled="!canManageWorkspace || isUpdatingName"
        />

        <label for="workspace-theme-fg">GNB 글자색</label>
        <input
          id="workspace-theme-fg"
          v-model="form.customForeground"
          type="color"
          :disabled="!canManageWorkspace || isUpdatingName"
        />

        <button type="button" class="btn btn--secondary btn--builder" :disabled="!canManageWorkspace" @click="isThemeBuilderOpen = true">
          {{ t("settings.home.themeBuilder.open") }}
        </button>
      </div>
    </div>
  </form>

  <ThemeBuilderModal
    :open="isThemeBuilderOpen"
    :initial-background="form.customBackground"
    :initial-foreground="form.customForeground"
    :initial-seed-h="form.seedH"
    :initial-seed-s="form.seedS"
    :initial-seed-l="form.seedL"
    @close="isThemeBuilderOpen = false"
    @apply="onThemeBuilderApply"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Avatar from "../../components/Avatar.vue";
import ThemeBuilderModal from "../../components/modals/ThemeBuilderModal.vue";
import { addToast } from "../../lib/toast";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAppStore } from "../../stores/appStore";

const { t } = useI18n();
const route = useRoute();
const workspaceStore = useWorkspaceStore();
const appStore = useAppStore();

const workspaceId = computed(() => route.params.workspaceId);
const workspace = computed(() => workspaceStore.workspaceById[workspaceId.value] || null);
const workspaceName = computed(() => workspace.value?.name || "");
const workspaceImageUrl = computed(() => String(workspace.value?.img_url || ""));
const workspaceRoleUpper = computed(() => String(workspace.value?.role_name || "").toUpperCase());
const canManageWorkspace = computed(() => ["OWNER", "ADMIN"].includes(workspaceRoleUpper.value));

const workspaceImageFallback = computed(() => {
  const name = workspaceName.value;
  if (!name) return "W";
  return name.slice(0, 2).toUpperCase();
});

const isLoading = ref(false);
const errorMessage = ref("");
const nameForm = ref("");
const isUpdatingName = ref(false);
const nameError = ref("");
const nameSuccess = ref("");
const workspaceImageInputRef = ref(null);
const isUploadingWorkspaceImage = ref(false);
const isRemovingWorkspaceImage = ref(false);
const workspaceImageError = ref("");
const workspaceImageSuccess = ref("");
const isThemeBuilderOpen = ref(false);
const form = ref({
  themeId: "indigo",
  customBackground: "#1f2937",
  customForeground: "#ffffff",
  seedH: null,
  seedS: null,
  seedL: null,
});

const themeOptionsBase = [
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
  return "light";
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

const fetchWorkspaceDetail = async () => {
  if (!workspaceId.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    await workspaceStore.fetchWorkspace(workspaceId.value);
    nameForm.value = workspaceStore.workspaceById[workspaceId.value]?.name || "";
    const currentTheme = workspaceStore.workspaceById[workspaceId.value]?.theme_json?.gnb;
    const resolvedThemeId = resolveThemeId(currentTheme);
    const customColors = resolveCustomColors(currentTheme);
    form.value.themeId = resolvedThemeId;
    form.value.customBackground = customColors.background;
    form.value.customForeground = customColors.foreground;
    form.value.seedH = currentTheme?.seedH ?? null;
    form.value.seedS = currentTheme?.seedS ?? null;
    form.value.seedL = currentTheme?.seedL ?? null;
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.message || "워크스페이스 정보를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

const saveSettings = async () => {
  if (!canManageWorkspace.value) return;
  const nextName = String(nameForm.value || "").trim();
  const selected = themeOptionsBase.find((id) => id === form.value.themeId);
  const isCustom = form.value.themeId === "custom";
  nameError.value = "";
  nameSuccess.value = "";

  if (!nextName) {
    nameError.value = "워크스페이스 이름을 입력하세요.";
    return;
  }

  if (!selected && !isCustom) {
    nameError.value = "테마를 선택하세요.";
    return;
  }

  const customBackground = normalizeHexColor(form.value.customBackground, "");
  const customForeground = normalizeHexColor(form.value.customForeground, "");
  if (isCustom && (!customBackground || !customForeground)) {
    nameError.value = "사용자 정의 테마 색상을 확인하세요.";
    return;
  }

  const currentThemeId = resolveThemeId(workspace.value?.theme_json?.gnb);
  const currentTheme = workspace.value?.theme_json?.gnb || {};
  const sameCustomTheme =
    isCustom &&
    normalizeHexColor(currentTheme.background, "") === customBackground &&
    normalizeHexColor(currentTheme.foreground, "") === customForeground &&
    currentTheme.seedH === form.value.seedH &&
    currentTheme.seedS === form.value.seedS &&
    currentTheme.seedL === form.value.seedL;
  if (
    nextName === workspaceName.value &&
    ((isCustom && currentThemeId === "custom" && sameCustomTheme) ||
      (!isCustom && currentThemeId === selected))
  ) {
    nameSuccess.value = "변경 사항이 없습니다.";
    addToast({ message: "변경 사항이 없습니다.", type: "info" });
    return;
  }

  isUpdatingName.value = true;
  try {
    await workspaceStore.updateWorkspaceSettings(workspaceId.value, {
      name: nextName,
      theme_json: {
        gnb: {
          ...(isCustom
            ? {
                themeId: "custom",
                background: customBackground,
                foreground: customForeground,
                seedH: form.value.seedH,
                seedS: form.value.seedS,
                seedL: form.value.seedL,
              }
            : {
                themeId: selected,
              }),
        },
      },
    });
    nameSuccess.value = "워크스페이스 설정이 저장되었습니다.";
    addToast({ message: "워크스페이스 설정이 저장되었습니다.", type: "success" });
    await workspaceStore.fetchWorkspace(workspaceId.value);
  } catch (error) {
    nameError.value = error?.response?.data?.message || "워크스페이스 설정을 변경하지 못했습니다.";
    addToast({ message: nameError.value, type: "error" });
  } finally {
    isUpdatingName.value = false;
  }
};

const onThemeBuilderApply = ({ background, foreground, seedH, seedS, seedL }) => {
  form.value.customBackground = background;
  form.value.customForeground = foreground;
  form.value.seedH = seedH;
  form.value.seedS = seedS;
  form.value.seedL = seedL;
  form.value.themeId = "custom";
};

const openWorkspaceImagePicker = () => {
  if (
    !canManageWorkspace.value ||
    isUploadingWorkspaceImage.value ||
    isRemovingWorkspaceImage.value
  ) {
    return;
  }
  workspaceImageInputRef.value?.click();
};

const onWorkspaceImageChange = async (event) => {
  workspaceImageError.value = "";
  workspaceImageSuccess.value = "";
  const selectedFile = event?.target?.files?.[0];
  if (!selectedFile) return;

  const maxFileSize = 5 * 1024 * 1024;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  if (!allowedTypes.has(selectedFile.type)) {
    workspaceImageError.value = "jpg, png, webp, gif 파일만 허용됩니다.";
    event.target.value = "";
    return;
  }

  if (selectedFile.size > maxFileSize) {
    workspaceImageError.value = "이미지 용량은 5MB 이하여야 합니다.";
    event.target.value = "";
    return;
  }

  isUploadingWorkspaceImage.value = true;
  try {
    const response = await workspaceStore.updateWorkspaceImage(workspaceId.value, selectedFile);
    workspaceImageSuccess.value = response?.message || "워크스페이스 이미지가 변경되었습니다.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "워크스페이스 이미지를 변경하지 못했습니다.";
  } finally {
    isUploadingWorkspaceImage.value = false;
    event.target.value = "";
  }
};

const removeWorkspaceImage = async () => {
  if (!canManageWorkspace.value || !workspaceImageUrl.value) return;
  if (isUploadingWorkspaceImage.value || isRemovingWorkspaceImage.value) return;

  workspaceImageError.value = "";
  workspaceImageSuccess.value = "";
  isRemovingWorkspaceImage.value = true;

  try {
    const response = await workspaceStore.removeWorkspaceImage(workspaceId.value);
    workspaceImageSuccess.value = response?.message || "워크스페이스 이미지가 삭제되었습니다.";
  } catch (error) {
    workspaceImageError.value =
      error?.response?.data?.message || "워크스페이스 이미지를 삭제하지 못했습니다.";
  } finally {
    isRemovingWorkspaceImage.value = false;
  }
};

const fetchPageData = async () => {
  await fetchWorkspaceDetail();
};

onMounted(fetchPageData);
watch(() => route.params.workspaceId, fetchPageData);

watch(
  () => form.value.themeId,
  (value) => {
    if (value === "custom") {
      appStore.setGnbPreviewTheme({
        themeId: "custom",
        background: form.value.customBackground,
        foreground: form.value.customForeground,
        seedH: form.value.seedH,
        seedS: form.value.seedS,
        seedL: form.value.seedL,
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
      seedH: form.value.seedH,
      seedS: form.value.seedS,
      seedL: form.value.seedL,
    });
  }
);

onBeforeUnmount(() => {
  appStore.clearGnbPreviewTheme();
});
</script>

<style scoped>
.workspace-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.status {
  margin: 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.status.success {
  color: var(--color-success);
}

.status.muted {
  color: var(--color-text-muted);
}

.settings-form label {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.image-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.btn--builder {
  grid-column: 1 / -1;
  margin-top: 4px;
  width: fit-content;
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

.workspace-image-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workspace-image-input {
  display: none;
}
</style>
