<template>
  <BaseModal
    :open="open"
    :title="t('messenger.room.invite.modal.title')"
    @close="handleClose"
  >
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="invite-member">{{ t("messenger.room.invite.modal.membersLabel") }}</label>
      <select id="invite-member" v-model="selectedMemberId">
        <option value="">{{ t("messenger.room.invite.modal.selectPlaceholder") }}</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("messenger.room.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{
            isInviting
              ? t("messenger.room.actions.inviting")
              : t("messenger.room.actions.inviteSubmit")
          }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  channelId: {
    type: [Number, String],
    required: true,
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "invited"]);

const selectedMemberId = ref("");
const isInviting = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!selectedMemberId.value) {
    formError.value = t("messenger.room.validation.memberRequired");
    return;
  }

  isInviting.value = true;
  formError.value = "";

  try {
    await api.post(`/channels/${props.channelId}/members`, {
      member_id: selectedMemberId.value,
    });
    emit("invited");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("messenger.room.status.errorInvite");
  } finally {
    isInviting.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      selectedMemberId.value = "";
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-error {
  color: var(--color-danger);
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
