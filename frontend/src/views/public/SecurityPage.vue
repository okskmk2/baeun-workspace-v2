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
      <p v-if="statusError" class="status error">{{ statusError }}</p>
      <p v-else-if="statusOk" class="status ok">{{ statusOk }}</p>
      <p v-else-if="isLoading" class="status muted">{{ t("settings.security.passkeys.loading") }}</p>
      <p v-else-if="passkeys.length === 0" class="status muted">
        {{ t("settings.security.passkeys.empty") }}
      </p>

      <ul v-if="passkeys.length > 0" class="passkey-list">
        <li v-for="item in passkeys" :key="item.id" class="passkey-item">
          <div>
            <p class="passkey-item__name">{{ deviceLabel(item) }}</p>
            <p class="passkey-item__meta">{{ deviceMeta(item) }}</p>
          </div>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="isBusy"
            @click="askDelete(item)"
          >
            {{ t("settings.security.passkeys.delete") }}
          </button>
        </li>
      </ul>

      <div class="passkey-actions">
        <button
          type="button"
          class="btn"
          :disabled="isBusy || !canAddOnThisDevice"
          @click="onAddThisDevice"
        >
          {{
            isAdding ? t("settings.security.passkeys.adding") : t("settings.security.passkeys.add")
          }}
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="isBusy || passkeys.length === 0"
          @click="askResetAll"
        >
          {{ t("settings.security.passkeys.reset") }}
        </button>
      </div>
      <p v-if="!canAddOnThisDevice" class="status muted">
        {{ t("settings.security.passkeys.unsupported") }}
      </p>
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
      :open="Boolean(pendingDelete)"
      :title="deleteTitle"
      :message="deleteMessage"
      :confirm-label="deleteConfirmLabel"
      :deleting-label="t('settings.security.passkeys.deleting')"
      :cancel-label="t('settings.security.passkeys.cancel')"
      @close="pendingDelete = null"
      @confirm="onConfirmDelete"
    />
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";
import api from "../../lib/axios";
import {
  clearPasskeyOfferDismissed,
  isPasskeyCanceled,
  isPasskeyTimeout,
  listPasskeys,
  registerPasskey,
  supportsPasskeys,
} from "../../lib/passkey";
import { useAppStore } from "../../stores/appStore";

const { t, locale } = useI18n();
const appStore = useAppStore();
const isWithdrawOpen = ref(false);
const isLoading = ref(false);
const isAdding = ref(false);
const isDeleting = ref(false);
const passkeys = ref([]);
const statusError = ref("");
const statusOk = ref("");
const pendingDelete = ref(null);
const canAddOnThisDevice = ref(false);
const email = computed(() => appStore.currentUser?.email || "");
const isBusy = computed(() => isLoading.value || isAdding.value || isDeleting.value);

const deleteTitle = computed(() =>
  pendingDelete.value?.type === "all"
    ? t("settings.security.passkeys.resetTitle")
    : t("settings.security.passkeys.deleteTitle"),
);

const deleteMessage = computed(() =>
  pendingDelete.value?.type === "all"
    ? t("settings.security.passkeys.resetMessage")
    : t("settings.security.passkeys.deleteMessage", {
        name: deviceLabel(pendingDelete.value?.item || {}),
      }),
);

const deleteConfirmLabel = computed(() =>
  pendingDelete.value?.type === "all"
    ? t("settings.security.passkeys.reset")
    : t("settings.security.passkeys.delete"),
);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale.value === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const deviceLabel = (item) => {
  if (item?.nickname) return item.nickname;
  if (item?.device_type === "multiDevice") return t("settings.security.passkeys.otherDevice");
  return t("settings.security.passkeys.thisDevice");
};

const deviceMeta = (item) => {
  const lastUsed = formatDate(item.last_used_at);
  if (lastUsed) return t("settings.security.passkeys.lastUsed", { date: lastUsed });
  const created = formatDate(item.created_at);
  if (created) return t("settings.security.passkeys.created", { date: created });
  return "";
};

const loadPasskeys = async () => {
  isLoading.value = true;
  statusError.value = "";
  try {
    passkeys.value = await listPasskeys();
  } catch {
    statusError.value = t("settings.security.passkeys.loadError");
  } finally {
    isLoading.value = false;
  }
};

const onAddThisDevice = async () => {
  if (isBusy.value || !canAddOnThisDevice.value) return;
  isAdding.value = true;
  statusError.value = "";
  statusOk.value = "";
  try {
    await registerPasskey("");
    clearPasskeyOfferDismissed(appStore.currentUser?.id);
    statusOk.value = t("settings.security.passkeys.addDone");
    await loadPasskeys();
  } catch (error) {
    if (isPasskeyTimeout(error)) {
      statusError.value = t("settings.security.passkeys.timeout");
    } else if (isPasskeyCanceled(error)) {
      statusError.value = t("settings.security.passkeys.canceled");
    } else {
      statusError.value = t("settings.security.passkeys.addError");
    }
  } finally {
    isAdding.value = false;
  }
};

const askDelete = (item) => {
  pendingDelete.value = { type: "one", item };
};

const askResetAll = () => {
  pendingDelete.value = { type: "all" };
};

const onConfirmDelete = async () => {
  const target = pendingDelete.value;
  if (!target || isDeleting.value) return;
  isDeleting.value = true;
  statusError.value = "";
  statusOk.value = "";
  try {
    if (target.type === "all") {
      await api.delete("/members/passkeys");
      clearPasskeyOfferDismissed(appStore.currentUser?.id);
      passkeys.value = [];
      statusOk.value = t("settings.security.passkeys.resetDone");
    } else {
      await api.delete(`/members/passkeys/${target.item.id}`);
      statusOk.value = t("settings.security.passkeys.deleteDone");
      await loadPasskeys();
    }
    pendingDelete.value = null;
  } catch {
    statusError.value = t("settings.security.passkeys.resetError");
    pendingDelete.value = null;
  } finally {
    isDeleting.value = false;
  }
};

onMounted(() => {
  canAddOnThisDevice.value = supportsPasskeys();
  loadPasskeys();
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

.status.ok {
  color: var(--color-text);
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

.passkey-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .passkey-item {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
