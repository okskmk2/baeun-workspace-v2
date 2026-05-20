<template>
  <hgroup>
    <div>
      <h1>{{ t("profile.header.title") }}</h1>
      <p class="subtitle">{{ t("profile.header.subtitle") }}</p>
    </div>
  </hgroup>

  <p v-if="isLoading" class="status">{{ t("profile.status.loading") }}</p>
  <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>

  <div v-else class="page-sections">
    <div class="profile-card">
      <div class="avatar-panel">
        <Avatar :text="initials" :label="profile.name" :image-url="profileImageUrl" :size="72" />
        <input
          ref="profileImageInputRef"
          class="profile-image-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          @change="handleProfileImageChange"
        />
        <button
          class="btn btn--secondary"
          type="button"
          :disabled="isUploadingImage || isRemovingImage"
          @click="openProfileImagePicker"
        >
          {{
            isUploadingImage
              ? t("profile.image.actions.uploading")
              : t("profile.image.actions.change")
          }}
        </button>
        <button
          class="btn btn--secondary"
          type="button"
          :disabled="!profileImageUrl || isUploadingImage || isRemovingImage"
          @click="removeProfileImage"
        >
          {{
            isRemovingImage
              ? t("profile.image.actions.removing")
              : t("profile.image.actions.remove")
          }}
        </button>
        <p v-if="uploadImageError" class="status error">{{ uploadImageError }}</p>
        <p v-else-if="uploadImageMessage" class="status">{{ uploadImageMessage }}</p>
      </div>
      <div class="details">
        <div class="detail">
          <span class="label">{{ t("profile.fields.name") }}</span>
          <div v-if="isEditingName" class="name-edit-row">
            <input
              ref="nameInputRef"
              v-model="editingName"
              class="name-input"
              type="text"
              :placeholder="t('profile.name.placeholder')"
              :disabled="isSavingName"
              @keydown.enter="saveName"
              @keydown.escape="cancelEditName"
            />
            <button class="btn btn--sm" :disabled="isSavingName" type="button" @click="saveName">
              {{ isSavingName ? t("profile.name.saving") : t("profile.name.save") }}
            </button>
            <button
              class="btn btn--secondary btn--sm"
              :disabled="isSavingName"
              type="button"
              @click="cancelEditName"
            >
              {{ t("profile.name.cancel") }}
            </button>
            <p v-if="nameError" class="status error name-error">{{ nameError }}</p>
          </div>
          <div v-else class="name-view-row">
            <span class="value">{{ profile.name || "-" }}</span>
            <button class="btn btn--ghost btn--sm" type="button" @click="startEditName">
              {{ t("profile.name.edit") }}
            </button>
          </div>
        </div>
        <div class="detail">
          <span class="label">{{ t("profile.fields.email") }}</span>
          <span class="value">{{ profile.email || "-" }}</span>
        </div>
        <div class="detail">
          <span class="label">{{ t("profile.fields.joined") }}</span>
          <span class="value">{{ formatDate(profile.created_at) || "-" }}</span>
        </div>
      </div>
    </div>

    <WithdrawAccountModal :open="isWithdrawOpen" @close="closeWithdrawModal" />

    <div class="locale-card" aria-label="Locale settings">
      <div class="locale-header">
        <h2>{{ t("profile.locale.title") }}</h2>
        <p>{{ t("profile.locale.subtitle") }}</p>
      </div>
      <div class="locale-controls">
        <label class="control">
          <span class="control-label">{{ t("profile.locale.language") }}</span>
          <select v-model="locale" class="control-input" aria-label="Language">
            <option value="ko">{{ t("profile.locale.languageOptions.ko") }}</option>
            <option value="en">{{ t("profile.locale.languageOptions.en") }}</option>
          </select>
        </label>
        <label class="control">
          <span class="control-label">{{ t("profile.locale.region") }}</span>
          <select v-model="region" class="control-input" aria-label="Region">
            <option value="kr">{{ t("profile.locale.regionOptions.kr") }}</option>
            <option value="us">{{ t("profile.locale.regionOptions.us") }}</option>
          </select>
        </label>
        <button class="btn" type="button" :disabled="isSavingLocale" @click="saveLocale">
          {{ isSavingLocale ? t("profile.locale.saving") : t("profile.locale.save") }}
        </button>
      </div>
    </div>

    <DangerZone :title="t('profile.danger.title')" :description="t('profile.danger.description')">
      <ul class="danger-checklist">
        <li>{{ t("profile.danger.checklist.transferOwnership") }}</li>
        <li>{{ t("profile.danger.checklist.confirmScope") }}</li>
        <li>{{ t("profile.danger.checklist.dataAnonymized") }}</li>
      </ul>

      <template #actions>
        <button class="btn btn--secondary" type="button" @click="openOwnershipGuideModal">
          {{ t("profile.danger.actions.guide") }}
        </button>
        <button
          class="btn btn--danger"
          type="button"
          @click="openWithdrawModal"
        >
          {{ t("profile.actions.withdraw") }}
        </button>
      </template>
    </DangerZone>
  </div>

  <OwnershipGuideModal :open="isOwnershipGuideOpen" @close="closeOwnershipGuideModal" />
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import { addToast } from "../../lib/toast";
import { persistLocale, supportedLocales } from "../../i18n";
import Avatar from "../../components/Avatar.vue";
import DangerZone from "../../components/DangerZone.vue";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";
import OwnershipGuideModal from "../../components/modals/OwnershipGuideModal.vue";
import { useAppStore } from "../../stores/appStore";

const { t, locale } = useI18n();
const appStore = useAppStore();

const isLoading = ref(false);
const errorMessage = ref("");
const profile = ref({});
const region = ref("kr");
const isWithdrawOpen = ref(false);
const isOwnershipGuideOpen = ref(false);
const profileImageInputRef = ref(null);
const isUploadingImage = ref(false);
const isRemovingImage = ref(false);
const uploadImageError = ref("");
const uploadImageMessage = ref("");
const isSavingLocale = ref(false);

const nameInputRef = ref(null);
const isEditingName = ref(false);
const editingName = ref("");
const isSavingName = ref(false);
const nameError = ref("");

const fetchProfile = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/members/me");
    profile.value = res.data || {};
    const localeValue = String(res.data?.locale || "").toLowerCase();
    if (supportedLocales.includes(localeValue) && locale.value !== localeValue) {
      locale.value = localeValue;
    }

    const regionValue = String(res.data?.region || "").toLowerCase();
    if (regionValue === "kr" || regionValue === "us") {
      region.value = regionValue;
    }
  } catch (error) {
    profile.value = {};
    errorMessage.value = t("profile.status.error");
  } finally {
    isLoading.value = false;
  }
};

const initials = computed(() => {
  const name = profile.value?.name || "";
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
});

const profileImageUrl = computed(() => String(profile.value?.img_url || ""));

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const dateLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

watch(locale, (value) => {
  if (!supportedLocales.includes(value)) return;
  persistLocale(value);
});

const openProfileImagePicker = () => {
  if (isUploadingImage.value || isRemovingImage.value) return;
  profileImageInputRef.value?.click();
};

const handleProfileImageChange = async (event) => {
  const selectedFile = event?.target?.files?.[0];
  uploadImageError.value = "";
  uploadImageMessage.value = "";

  if (!selectedFile) return;

  const maxFileSize = 5 * 1024 * 1024;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  if (!allowedTypes.has(selectedFile.type)) {
    uploadImageError.value = t("profile.image.status.invalidType");
    event.target.value = "";
    return;
  }

  if (selectedFile.size > maxFileSize) {
    uploadImageError.value = t("profile.image.status.sizeLimit");
    event.target.value = "";
    return;
  }

  isUploadingImage.value = true;
  try {
    const formData = new FormData();
    formData.append("image", selectedFile);

    const response = await api.post("/members/profile/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const payload = response?.data || {};
    const { message, ...memberData } = payload;
    profile.value = { ...profile.value, ...memberData };

    if (appStore.currentUser) {
      appStore.setCurrentUser({ ...appStore.currentUser, ...memberData });
    }

    uploadImageMessage.value = message || t("profile.image.status.success");
  } catch (error) {
    uploadImageError.value = error?.response?.data?.message || t("profile.image.status.error");
  } finally {
    isUploadingImage.value = false;
    event.target.value = "";
  }
};

const removeProfileImage = async () => {
  if (!profileImageUrl.value || isUploadingImage.value || isRemovingImage.value) return;

  uploadImageError.value = "";
  uploadImageMessage.value = "";
  isRemovingImage.value = true;

  try {
    const response = await api.delete("/members/profile/image");
    const payload = response?.data || {};
    const { message, ...memberData } = payload;

    profile.value = { ...profile.value, ...memberData };
    if (appStore.currentUser) {
      appStore.setCurrentUser({ ...appStore.currentUser, ...memberData });
    }

    uploadImageMessage.value = message || t("profile.image.status.removed");
  } catch (error) {
    uploadImageError.value =
      error?.response?.data?.message || t("profile.image.status.removeError");
  } finally {
    isRemovingImage.value = false;
  }
};

const startEditName = () => {
  editingName.value = profile.value?.name || "";
  nameError.value = "";
  isEditingName.value = true;
  nextTick(() => nameInputRef.value?.focus());
};

const cancelEditName = () => {
  isEditingName.value = false;
  nameError.value = "";
};

const saveName = async () => {
  const trimmed = editingName.value.trim();
  if (!trimmed) {
    nameError.value = t("profile.name.required");
    return;
  }
  nameError.value = "";
  isSavingName.value = true;
  try {
    const response = await api.patch("/members/me", { name: trimmed });
    const payload = response?.data || {};
    const { message, ...memberData } = payload;
    profile.value = { ...profile.value, ...memberData };
    if (appStore.currentUser) {
      appStore.setCurrentUser({ ...appStore.currentUser, ...memberData });
    }
    isEditingName.value = false;
  } catch (error) {
    nameError.value = error?.response?.data?.message || t("profile.name.error");
  } finally {
    isSavingName.value = false;
  }
};

const saveLocale = async () => {
  if (isSavingLocale.value) return;

  const localeValue = String(locale.value || "").toLowerCase();
  const regionValue = String(region.value || "").toLowerCase();

  if (!supportedLocales.includes(localeValue) || !(regionValue === "kr" || regionValue === "us")) {
    addToast({ message: t("profile.locale.status.error"), type: "error" });
    return;
  }

  isSavingLocale.value = true;
  try {
    const res = await api.patch("/members/me", {
      locale: localeValue,
      region: regionValue,
    });

    const payload = res?.data || {};
    const { message, ...memberData } = payload;
    profile.value = { ...profile.value, ...memberData };
    if (appStore.currentUser) {
      appStore.setCurrentUser({ ...appStore.currentUser, ...memberData });
    }

    addToast({ message: message || t("profile.locale.status.saved"), type: "success" });
  } catch (error) {
    const message = error?.response?.data?.message || t("profile.locale.status.error");
    addToast({ message, type: "error" });
  } finally {
    isSavingLocale.value = false;
  }
};

const openWithdrawModal = () => {
  isWithdrawOpen.value = true;
};

const closeWithdrawModal = () => {
  isWithdrawOpen.value = false;
};

const openOwnershipGuideModal = () => {
  isOwnershipGuideOpen.value = true;
};

const closeOwnershipGuideModal = () => {
  isOwnershipGuideOpen.value = false;
};

onMounted(fetchProfile);
</script>

<style scoped>
.status {
  font-size: 14px;
  color: var(--color-text-muted);
  margin: 0;
}

.status.error {
  color: var(--color-danger);
}

.page-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-card-bg);
  align-items: center;
}

.avatar-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.profile-image-input {
  display: none;
}

.withdraw-form {
  display: grid;
  gap: 10px;
}

.withdraw-description {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.withdraw-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.locale-card {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-card-bg);
  display: grid;
  gap: 16px;
}

.locale-header h2 {
  margin: 0 0 4px;
  font-size: 16px;
  color: var(--color-text);
}

.locale-header p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.locale-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: end;
}

.control {
  display: grid;
  gap: 6px;
}

.control-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.control-input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  color: var(--color-text);
  background-color: var(--color-input-bg);
}

.name-view-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-edit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.name-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-input-border);
  font-size: 14px;
  color: var(--color-text);
  background-color: var(--color-input-bg);
}

.name-error {
  flex-basis: 100%;
  margin: 0;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 8px;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.value {
  font-size: 14px;
  color: var(--color-text);
}

.danger-checklist {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ownership-guide {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 220px;
}

.ownership-guide__desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.ownership-guide__list {
  margin: 0;
  padding-left: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  list-style: none;
  max-height: min(48vh, 340px);
  overflow: auto;
  padding-right: 4px;
}

.ownership-guide__item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background-color: var(--color-surface);
}

.ownership-guide__item-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.ownership-guide__item-main .title {
  font-size: 14px;
  color: var(--color-text);
}

.ownership-guide__link {
  font-size: 13px;
  color: var(--color-accent);
  text-decoration: none;
  white-space: nowrap;
}

.ownership-guide__link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .ownership-guide__list {
    grid-template-columns: 1fr;
  }
}

.ownership-guide__empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

@media (max-width: 640px) {
  .profile-card {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .avatar-panel {
    align-items: center;
  }

  .detail {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .label {
    justify-self: center;
  }

  .locale-controls {
    grid-template-columns: 1fr;
  }
}
</style>
