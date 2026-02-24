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
          <span class="value">{{ profile.name || "-" }}</span>
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

    <div class="profile-actions">
      <button class="btn btn--secondary" type="button" :disabled="isLoggingOut" @click="logout">
        {{ isLoggingOut ? t("profile.actions.loggingOut") : t("profile.actions.logout") }}
      </button>
      <p v-if="logoutError" class="status error">{{ logoutError }}</p>
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
        <button class="btn" type="button">{{ t("profile.locale.save") }}</button>
      </div>
    </div>

    <section class="danger-zone">
      <div>
        <h2>{{ t("profile.danger.title") }}</h2>
        <p class="danger-desc">{{ t("profile.danger.description") }}</p>
        <ul class="danger-checklist">
          <li>{{ t("profile.danger.checklist.transferOwnership") }}</li>
          <li>{{ t("profile.danger.checklist.confirmScope") }}</li>
          <li>{{ t("profile.danger.checklist.dataAnonymized") }}</li>
        </ul>
      </div>
      <div class="danger-actions">
        <button
          class="btn btn--danger"
          type="button"
          :disabled="isLoggingOut"
          @click="openWithdrawModal"
        >
          {{ t("profile.actions.withdraw") }}
        </button>
        <button class="btn btn--secondary" type="button" @click="openOwnershipGuideModal">
          {{ t("profile.danger.actions.guide") }}
        </button>
      </div>
    </section>
  </div>

  <OwnershipGuideModal :open="isOwnershipGuideOpen" @close="closeOwnershipGuideModal" />
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";
import { persistLocale, supportedLocales } from "../../i18n";
import { useAppStore } from "../../stores/appStore";
import Avatar from "../../components/Avatar.vue";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";
import OwnershipGuideModal from "../../components/modals/OwnershipGuideModal.vue";

const { t, locale } = useI18n();
const router = useRouter();
const appStore = useAppStore();

const isLoading = ref(false);
const errorMessage = ref("");
const profile = ref({});
const region = ref("kr");
const isLoggingOut = ref(false);
const logoutError = ref("");
const isWithdrawOpen = ref(false);
const isOwnershipGuideOpen = ref(false);
const profileImageInputRef = ref(null);
const isUploadingImage = ref(false);
const isRemovingImage = ref(false);
const uploadImageError = ref("");
const uploadImageMessage = ref("");

const fetchProfile = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get("/members/me");
    profile.value = res.data || {};
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

const logout = async () => {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  logoutError.value = "";

  try {
    await api.post("/members/logout");
    appStore.setCurrentUser(null);
    await router.push("/login");
  } catch (error) {
    logoutError.value = error?.response?.data?.message || t("profile.status.logoutError");
  } finally {
    isLoggingOut.value = false;
  }
};

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

.profile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.danger-zone {
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

.danger-checklist {
  margin: 10px 0 0;
  padding-left: 18px;
  color: var(--color-text);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
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

  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }

  .danger-actions {
    align-items: flex-start;
  }
}
</style>

