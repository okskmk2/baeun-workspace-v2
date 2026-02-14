<template>
  <BaseModal
    :open="open"
    :title="t('profile.withdraw.title')"
    @close="handleClose"
  >
    <form class="withdraw-form" @submit.prevent="handleSubmit">
      <p class="withdraw-description">{{ t("profile.withdraw.description") }}</p>
      <label for="withdraw-password" class="control-label">{{
        t("profile.withdraw.password")
      }}</label>
      <input
        id="withdraw-password"
        v-model.trim="password"
        class="control-input"
        type="password"
        autocomplete="current-password"
        :placeholder="t('profile.withdraw.passwordPlaceholder')"
      />
      <p v-if="formError" class="status error">{{ formError }}</p>
      <div class="withdraw-actions">
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="isWithdrawing"
          @click="handleClose"
        >
          {{ t("profile.withdraw.cancel") }}
        </button>
        <button type="submit" class="btn btn--danger" :disabled="isWithdrawing">
          {{ isWithdrawing ? t("profile.withdraw.withdrawing") : t("profile.withdraw.confirm") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import api from "../../lib/axios";
import { useAppStore } from "../../stores/appStore";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();
const router = useRouter();
const appStore = useAppStore();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["close"]);

const password = ref("");
const isWithdrawing = ref(false);
const formError = ref("");

const handleClose = () => {
  if (!isWithdrawing.value) {
    emit("close");
  }
};

const handleSubmit = async () => {
  if (!password.value) {
    formError.value = t("profile.withdraw.validation.passwordRequired");
    return;
  }

  isWithdrawing.value = true;
  formError.value = "";

  try {
    await api.post("/members/withdraw", {
      password: password.value,
    });
    appStore.setCurrentUser(null);
    router.push("/login");
  } catch (error) {
    formError.value = error?.response?.data?.message || t("profile.withdraw.error");
  } finally {
    isWithdrawing.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      password.value = "";
      formError.value = "";
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.withdraw-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.withdraw-description {
  margin: 0;
  color: var(--color-text-muted);
}

.control-label {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.control-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.status.error {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 0;
}

.withdraw-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
