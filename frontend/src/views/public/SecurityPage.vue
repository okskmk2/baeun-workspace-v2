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
      <p v-else class="status muted">{{ passkeyCountLabel }}</p>
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="isLoading || isResetting || passkeyCount === 0"
        @click="isResetOpen = true"
      >
        {{ t("settings.security.passkeys.reset") }}
      </button>
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
      :open="isResetOpen"
      :title="t('settings.security.passkeys.resetTitle')"
      :message="t('settings.security.passkeys.resetMessage')"
      :confirm-label="t('settings.security.passkeys.reset')"
      :deleting-label="t('settings.security.passkeys.resetting')"
      :cancel-label="t('settings.security.passkeys.cancel')"
      @close="isResetOpen = false"
      @confirm="onResetPasskeys"
    />
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfirmDeleteModal from "../../components/modals/ConfirmDeleteModal.vue";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";
import api from "../../lib/axios";
import { clearPasskeyOfferDismissed } from "../../lib/passkey";
import { useAppStore } from "../../stores/appStore";

const { t } = useI18n();
const appStore = useAppStore();
const isWithdrawOpen = ref(false);
const isResetOpen = ref(false);
const isLoading = ref(false);
const isResetting = ref(false);
const passkeyCount = ref(0);
const statusError = ref("");
const statusOk = ref("");
const email = computed(() => appStore.currentUser?.email || "");

const passkeyCountLabel = computed(() => {
  if (passkeyCount.value === 0) return t("settings.security.passkeys.empty");
  return t("settings.security.passkeys.count", { count: passkeyCount.value });
});

const loadPasskeys = async () => {
  isLoading.value = true;
  statusError.value = "";
  try {
    const { data } = await api.get("/members/passkeys");
    passkeyCount.value = Array.isArray(data?.items) ? data.items.length : 0;
  } catch (error) {
    statusError.value = error?.response?.data?.message || t("settings.security.passkeys.loadError");
  } finally {
    isLoading.value = false;
  }
};

const onResetPasskeys = async () => {
  if (isResetting.value) return;
  isResetting.value = true;
  statusError.value = "";
  statusOk.value = "";
  try {
    await api.delete("/members/passkeys");
    clearPasskeyOfferDismissed(appStore.currentUser?.id);
    passkeyCount.value = 0;
    statusOk.value = t("settings.security.passkeys.resetDone");
    isResetOpen.value = false;
  } catch (error) {
    statusError.value = error?.response?.data?.message || t("settings.security.passkeys.resetError");
    isResetOpen.value = false;
  } finally {
    isResetting.value = false;
  }
};

onMounted(loadPasskeys);
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
</style>
