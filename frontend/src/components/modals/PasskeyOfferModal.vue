<template>
  <BaseModal
    :open="open"
    :title="t('auth.login.passkeyOffer.title')"
    :close-on-backdrop="!busy"
    @close="onSkip"
  >
    <div class="passkey-offer">
      <p>{{ t("auth.login.passkeyOffer.body") }}</p>
      <p v-if="error" class="passkey-offer__error">{{ error }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" :disabled="busy" @click="onSkip">
          {{ t("auth.login.passkeyOffer.later") }}
        </button>
        <button type="button" class="btn" :disabled="busy" @click="$emit('accept')">
          {{ busy ? t("auth.login.passkeyOffer.saving") : t("auth.login.passkeyOffer.accept") }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BaseModal from "../BaseModal.vue";

defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  error: { type: String, default: "" },
});

const emit = defineEmits(["skip", "accept"]);
const { t } = useI18n();

const onSkip = () => {
  emit("skip");
};
</script>

<style scoped>
.passkey-offer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.passkey-offer p {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text);
}

.passkey-offer__error {
  color: var(--color-danger);
  font-size: 13px;
}
</style>
