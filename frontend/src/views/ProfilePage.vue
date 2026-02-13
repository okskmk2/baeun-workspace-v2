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
      <Avatar :text="initials" :label="profile.name" :size="72" />
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
      <button
        class="btn btn--secondary"
        type="button"
        :disabled="isLoggingOut || isWithdrawing"
        @click="logout"
      >
        {{ isLoggingOut ? t("profile.actions.loggingOut") : t("profile.actions.logout") }}
      </button>
      <p v-if="logoutError" class="status error">{{ logoutError }}</p>
    </div>

    <BaseModal
      :open="isWithdrawOpen"
      :title="t('profile.withdraw.title')"
      @close="closeWithdrawModal"
    >
      <form class="withdraw-form" @submit.prevent="withdrawAccount">
        <p class="withdraw-description">{{ t("profile.withdraw.description") }}</p>
        <label for="withdraw-password" class="control-label">{{
          t("profile.withdraw.password")
        }}</label>
        <input
          id="withdraw-password"
          v-model.trim="withdrawPassword"
          class="control-input"
          type="password"
          autocomplete="current-password"
          :placeholder="t('profile.withdraw.passwordPlaceholder')"
        />
        <p v-if="withdrawError" class="status error">{{ withdrawError }}</p>
        <div class="withdraw-actions">
          <button
            type="button"
            class="btn btn--secondary"
            :disabled="isWithdrawing"
            @click="closeWithdrawModal"
          >
            {{ t("profile.withdraw.cancel") }}
          </button>
          <button type="submit" class="btn btn--danger" :disabled="isWithdrawing">
            {{ isWithdrawing ? t("profile.withdraw.withdrawing") : t("profile.withdraw.confirm") }}
          </button>
        </div>
      </form>
    </BaseModal>

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
          :disabled="isLoggingOut || isWithdrawing"
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

  <BaseModal
    :open="isOwnershipGuideOpen"
    :title="t('profile.danger.guide.title')"
    max-width="760px"
    @close="closeOwnershipGuideModal"
  >
    <div class="ownership-guide">
      <p class="ownership-guide__desc">{{ t("profile.danger.guide.description") }}</p>
      <p v-if="isOwnershipGuideLoading" class="ownership-guide__empty">
        {{ t("profile.danger.guide.loading") }}
      </p>
      <p v-else-if="ownershipGuideError" class="status error">{{ ownershipGuideError }}</p>
      <ul v-else-if="ownershipGuideItems.length" class="ownership-guide__list">
        <li
          v-for="item in ownershipGuideItems"
          :key="`${item.type}-${item.id}`"
          class="ownership-guide__item"
        >
          <div class="ownership-guide__item-main">
            <Tag variant="danger">{{ item.typeLabel }}</Tag>
            <span class="title">{{ item.name }}</span>
          </div>
          <router-link
            v-if="item.route"
            class="ownership-guide__link"
            :to="item.route"
            @click="closeOwnershipGuideModal"
          >
            {{ t("profile.danger.guide.open") }}
          </router-link>
        </li>
      </ul>
      <p v-else class="ownership-guide__empty">{{ t("profile.danger.guide.empty") }}</p>
      <div class="withdraw-actions">
        <button type="button" class="btn btn--secondary" @click="closeOwnershipGuideModal">
          {{ t("profile.danger.guide.close") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../lib/axios";
import { persistLocale, supportedLocales } from "../i18n";
import { useAppStore } from "../stores/appStore";
import Avatar from "../components/Avatar.vue";
import BaseModal from "../components/BaseModal.vue";
import Tag from "../components/Tag.vue";

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
const isWithdrawing = ref(false);
const withdrawPassword = ref("");
const withdrawError = ref("");
const isOwnershipGuideOpen = ref(false);
const ownershipResources = ref([]);
const isOwnershipGuideLoading = ref(false);
const ownershipGuideError = ref("");

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

const openWithdrawModal = () => {
  withdrawPassword.value = "";
  withdrawError.value = "";
  isWithdrawOpen.value = true;
};

const closeWithdrawModal = () => {
  if (isWithdrawing.value) return;
  isWithdrawOpen.value = false;
};

const fetchOwnershipResources = async () => {
  isOwnershipGuideLoading.value = true;
  ownershipGuideError.value = "";
  try {
    const res = await api.get("/members/me/owned-resources");
    ownershipResources.value = Array.isArray(res.data?.resources) ? res.data.resources : [];
  } catch (error) {
    ownershipResources.value = [];
    ownershipGuideError.value = error?.response?.data?.message || t("profile.danger.guide.error");
  } finally {
    isOwnershipGuideLoading.value = false;
  }
};

const openOwnershipGuideModal = async () => {
  isOwnershipGuideOpen.value = true;
  await fetchOwnershipResources();
};

const closeOwnershipGuideModal = () => {
  isOwnershipGuideOpen.value = false;
};

const mapOwnerResourceLabel = (resourceKey) => {
  const normalized = String(resourceKey || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  return t(`profile.withdraw.ownerResources.${normalized}`);
};

const buildOwnershipRoute = (resource) => {
  const type = String(resource?.type || "").toLowerCase();
  if (type === "workspace") return `/account/workspaces/${resource.id}`;
  if (type === "project") return `/project/${resource.id}/settings`;
  if (type === "page") {
    if (!resource.project_id) return "";
    return `/project/${resource.project_id}/wiki/${resource.id}`;
  }
  if (type === "board") {
    if (!resource.project_id) return "";
    return `/project/${resource.project_id}/board/${resource.id}/settings`;
  }
  if (type === "channel") {
    if (!resource.project_id) return "";
    return `/project/${resource.project_id}/messenger/${resource.id}/settings`;
  }
  return "";
};

const ownershipGuideItems = computed(() => {
  const rows = Array.isArray(ownershipResources.value) ? ownershipResources.value : [];
  return rows
    .filter((row) => row && row.type && row.id)
    .map((row) => ({
      ...row,
      typeLabel: mapOwnerResourceLabel(row.type),
      name: row.name || `${mapOwnerResourceLabel(row.type)} #${row.id}`,
      route: buildOwnershipRoute(row),
    }));
});

const withdrawAccount = async () => {
  if (!withdrawPassword.value) {
    withdrawError.value = t("profile.withdraw.passwordRequired");
    return;
  }

  isWithdrawing.value = true;
  withdrawError.value = "";

  try {
    await api.delete("/members/me", {
      data: { password: withdrawPassword.value },
    });
    appStore.setCurrentUser(null);
    isWithdrawOpen.value = false;
    await router.push("/login");
  } catch (error) {
    const rawMessage = error?.response?.data?.message;
    if (error?.response?.status === 403) {
      await openOwnershipGuideModal();
    }
    withdrawError.value = String(rawMessage || t("profile.status.withdrawError"));
  } finally {
    isWithdrawing.value = false;
  }
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
  grid-template-columns: 72px 1fr;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-card-bg);
  align-items: center;
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
