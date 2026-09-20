<template>
  <BaseModal
    :open="open"
    :title="done ? t('auth.login.passkeyOffer.doneTitle') : t('auth.login.passkeyOffer.title')"
    :close-on-backdrop="!busy"
    @close="onClose"
  >
    <div class="passkey-offer">
      <div class="passkey-offer__hero" aria-hidden="true">
        <MaterialSymbol :name="done ? 'check_circle' : icon" :size="40" alt="" />
      </div>
      <p>
        {{
          done
            ? t("auth.login.passkeyOffer.doneBody", { method })
            : t("auth.login.passkeyOffer.body", { method })
        }}
      </p>
      <p v-if="error" class="passkey-offer__error" role="alert" aria-live="assertive">{{ error }}</p>
      <div class="modal-actions">
        <template v-if="done">
          <button type="button" class="btn" @click="$emit('continue')">
            {{ t("auth.login.passkeyOffer.continue") }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn btn--secondary" :disabled="busy" @click="onSkip">
            {{ t("auth.login.passkeyOffer.later") }}
          </button>
          <button type="button" class="btn" :disabled="busy" @click="$emit('accept')">
            {{ busy ? t("auth.login.passkeyOffer.saving") : t("auth.login.passkeyOffer.accept") }}
          </button>
        </template>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BaseModal from "../BaseModal.vue";
import MaterialSymbol from "../MaterialSymbol.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  error: { type: String, default: "" },
  method: { type: String, default: "" },
  icon: { type: String, default: "fingerprint" },
});

const emit = defineEmits(["skip", "accept", "continue"]);
const { t } = useI18n();

const onSkip = () => {
  emit("skip");
};

const onClose = () => {
  if (props.done) {
    emit("continue");
    return;
  }
  emit("skip");
};
</script>

<style scoped>
.passkey-offer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.passkey-offer__hero {
  display: flex;
  justify-content: center;
  color: var(--color-accent);
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
