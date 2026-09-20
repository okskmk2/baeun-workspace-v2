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

    <section class="card danger">
      <h2>{{ t("settings.security.withdraw.title") }}</h2>
      <p>{{ t("settings.security.withdraw.body") }}</p>
      <button type="button" class="btn btn--danger" @click="isWithdrawOpen = true">
        {{ t("settings.security.withdraw.action") }}
      </button>
    </section>

    <WithdrawAccountModal :open="isWithdrawOpen" @close="isWithdrawOpen = false" />
  </main>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "../../stores/appStore";
import WithdrawAccountModal from "../../components/modals/WithdrawAccountModal.vue";

const { t } = useI18n();
const appStore = useAppStore();
const isWithdrawOpen = ref(false);
const email = computed(() => appStore.currentUser?.email || "");
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
