<template>
  <main class="security-page">
    <hgroup>
      <h1>{{ t("settings.security.title") }}</h1>
      <p class="subtitle">{{ t("settings.security.subtitle") }}</p>
    </hgroup>

    <section class="card">
      <h2>{{ t("settings.security.account.title") }}</h2>
      <dl>
        <div>
          <dt>{{ t("settings.security.account.email") }}</dt>
          <dd>{{ email || "-" }}</dd>
        </div>
      </dl>
      <p class="status muted">{{ t("settings.security.account.hint") }}</p>
    </section>

    <section class="card">
      <h2>{{ t("settings.security.passkeys.title") }}</h2>
      <p class="status muted">{{ t("settings.security.passkeys.body") }}</p>

      <p v-if="!passkeyAvailable" class="status muted">
        {{ t("settings.security.passkeys.unsupported") }}
      </p>

      <p v-if="passkeysError" class="status error">{{ passkeysError }}</p>
      <p v-else-if="isLoadingPasskeys" class="status muted">
        {{ t("settings.security.passkeys.loading") }}
      </p>
      <p v-else-if="passkeys.length === 0" class="status muted">
        {{ t("settings.security.passkeys.empty") }}
      </p>

      <ul v-else class="passkey-list">
        <li v-for="item in passkeys" :key="item.id" class="passkey-item">
          <div>
            <p class="passkey-item__name">
              {{ item.nickname || t("settings.security.passkeys.unnamed") }}
            </p>
            <p class="passkey-item__meta">
              {{ t("settings.security.passkeys.created", { date: formatDate(item.created_at) }) }}
              <span v-if="item.last_used_at">
                ·
                {{ t("settings.security.passkeys.lastUsed", { date: formatDate(item.last_used_at) }) }}
              </span>
            </p>
          </div>
          <button type="button" class="btn btn--secondary btn--sm" @click="askDelete(item)">
            {{ t("settings.security.passkeys.delete") }}
          </button>
        </li>
      </ul>

      <form v-if="passkeyAvailable" class="passkey-add" @submit.prevent="onAddPasskey">
        <input
          v-model.trim="nickname"
          type="text"
          maxlength="80"
          :placeholder="t('settings.security.passkeys.nicknamePlaceholder')"
        />
        <button type="submit" class="btn" :disabled="isAddingPasskey">
          {{
            isAddingPasskey
              ? t("settings.security.passkeys.adding")
              : t("settings.security.passkeys.add")
          }}
        </button>
      </form>
    </section>

    <section class="card danger">
      <h2>{{ t("settings.security.withdraw.title") }}</h2>
      <p>{{ t("settings.security.withdraw.body") }}</p>
      <button type="button" class="btn btn--danger" @click="isWithdrawOpen = true">
        {{ t("settings.security.withdraw.action") }}
      </button>
    </section>

    <WithdrawAccountModal :open="isWithdrawOpen" @close="isWithdrawOpen = false" />
    <ConfirmDeleteModal
      :open="Boolean(passkeyToDelete)"
      :title="t('settings.security.passkeys.deleteTitle')"
      :message="t('settings.security.passkeys.deleteMessage', { name: passkeyToDeleteName })"
      :confirm-label="t('settings.security.passkeys.delete')"
      :deleting-label="t('settings.security.passkeys.deleting')"
      :cancel-label="t('settings.security.passkeys.cancel')"
      @close="passkeyToDelete = null"
      @confirm="onDeletePasskey"
    />
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";
import api from "../../lib/axios";
import { isPasskeyCanceled, registerPasskey, supportsPasskeys } from "../../lib/passkey";
import { useAppStore } from "../../stores/appStore";

const { t, locale } = useI18n();
const appStore = useAppStore();
const isWithdrawOpen = ref(false);
const email = computed(() => appStore.currentUser?.email || "");

const passkeyAvailable = ref(false);
const passkeys = ref([]);
const isLoadingPasskeys = ref(false);
const isAddingPasskey = ref(false);
const passkeysError = ref("");
const nickname = ref("");
const passkeyToDelete = ref(null);

const passkeyToDeleteName = computed(
  () => passkeyToDelete.value?.nickname || t("settings.security.passkeys.unnamed"),
);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale.value === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const loadPasskeys = async () => {
  isLoadingPasskeys.value = true;
  passkeysError.value = "";
  try {
    const { data } = await api.get("/members/passkeys");
    passkeys.value = Array.isArray(data?.items) ? data.items : [];
  } catch (error) {
    passkeysError.value = error?.response?.data?.message || t("settings.security.passkeys.loadError");
  } finally {
    isLoadingPasskeys.value = false;
  }
};

const onAddPasskey = async () => {
  if (!passkeyAvailable.value || isAddingPasskey.value) return;
  isAddingPasskey.value = true;
  passkeysError.value = "";
  try {
    await registerPasskey(nickname.value);
    nickname.value = "";
    await loadPasskeys();
  } catch (error) {
    if (isPasskeyCanceled(error)) {
      passkeysError.value = t("settings.security.passkeys.canceled");
    } else {
      passkeysError.value = error?.response?.data?.message || t("settings.security.passkeys.addError");
    }
  } finally {
    isAddingPasskey.value = false;
  }
};

const askDelete = (item) => {
  passkeyToDelete.value = item;
};

const onDeletePasskey = async () => {
  const item = passkeyToDelete.value;
  if (!item) return;
  passkeysError.value = "";
  try {
    await api.delete(`/members/passkeys/${item.id}`);
    passkeyToDelete.value = null;
    await loadPasskeys();
  } catch (error) {
    passkeysError.value = error?.response?.data?.message || t("settings.security.passkeys.deleteError");
    passkeyToDelete.value = null;
  }
};

onMounted(async () => {
  passkeyAvailable.value = supportsPasskeys();
  await loadPasskeys();
});
</script>

<style scoped>
.security-page {
  display: grid;
  gap: 16px;
}

h1 {
  margin: 0;
}

.subtitle,
.status {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

.card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  padding: 16px;
  display: grid;
  gap: 10px;
}

.card h2 {
  margin: 0;
  font-size: 1rem;
}

.card.danger {
  border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
}

dl {
  margin: 0;
}

dt {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

dd {
  margin: 4px 0 0;
}

.passkey-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.passkey-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.passkey-item__name {
  margin: 0;
  font-weight: 600;
}

.passkey-item__meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.passkey-add {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.passkey-add input {
  flex: 1 1 180px;
  min-height: 38px;
  padding: 8px 12px;
  border: 1px solid var(--color-input-border);
  border-radius: 8px;
  background: var(--color-input-bg);
  color: var(--color-text);
}

@media (max-width: 640px) {
  .passkey-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
