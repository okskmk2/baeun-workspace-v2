<template>
  <BaseModal :open="open" :title="t('workspaceList.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="workspace-name">{{ t("workspaceList.modal.nameLabel") }}</label>
        <input
          id="workspace-name"
          v-model.trim="form.name"
          type="text"
          :placeholder="t('workspaceList.modal.namePlaceholder')"
        />
      </div>
      <p v-if="slotHint" class="slot-hint" :class="{ 'is-short': remaining < 1 }">{{ slotHint }}</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <p v-if="remaining < 1" class="form-error">
        <router-link :to="buyTo">{{ t("workspaceList.slots.buy") }}</router-link>
      </p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("workspaceList.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating || remaining < 1">
          {{ isCreating ? t("workspaceList.actions.creating") : t("workspaceList.actions.create") }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";
import { monthlyCartTo, slotErrorMessage } from "../../lib/slots";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  remaining: {
    type: Number,
    default: 0,
  },
  granted: {
    type: Number,
    default: 0,
  },
});

const remaining = computed(() => Number(props.remaining) || 0);
const buyTo = computed(() => monthlyCartTo("WORKSPACE"));
const slotHint = computed(() =>
  t("workspaceList.slots.remaining", { remaining: remaining.value, granted: Number(props.granted) || 0 })
);

const emit = defineEmits(["close", "created"]);

const form = ref({ name: "" });
const isCreating = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.name) {
    formError.value = t("workspaceList.validation.nameRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/workspaces", {
      name: form.value.name,
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value =
      slotErrorMessage(error, t("workspaceList.status.errorCreate")) || t("workspaceList.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { name: "" };
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.slot-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.slot-hint.is-short {
  color: var(--color-danger);
}
</style>

