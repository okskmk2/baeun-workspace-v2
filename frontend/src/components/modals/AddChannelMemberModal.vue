<template>
  <BaseModal :open="open" :title="t('channel.room.invite.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="invite-member">{{ t("channel.room.invite.modal.membersLabel") }}</label>
        <select id="invite-member" v-model="selectedMemberId" :disabled="!inviteableMembers.length">
          <option value="">{{ t("channel.room.invite.modal.selectPlaceholder") }}</option>
          <option v-for="member in inviteableMembers" :key="member.id" :value="member.id">
            {{ member.name }} ({{ member.email }})
          </option>
        </select>
        <p v-if="!inviteableMembers.length" class="form-help">
          {{ t("channel.room.invite.empty.noInviteable") }}
        </p>
      </div>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("channel.room.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting || !inviteableMembers.length">
          {{
            isInviting
              ? t("channel.room.actions.inviting")
              : t("channel.room.actions.inviteSubmit")
          }}
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
const channelMemberIds = ref([]);

const inviteableMembers = computed(() => {
  const excluded = new Set(channelMemberIds.value.map((id) => String(id)));
  return (props.projectMembers || []).filter((member) => !excluded.has(String(member.id)));
});

const fetchChannelMembers = async () => {
  if (!props.channelId) {
    channelMemberIds.value = [];
    return;
  }

  try {
    const res = await api.get(`/channels/${props.channelId}/members`);
    const members = res.data || [];
    channelMemberIds.value = members.map((member) => member.id);
  } catch (error) {
    channelMemberIds.value = [];
  }
};

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!selectedMemberId.value) {
    formError.value = t("channel.room.validation.memberRequired");
    return;
  }

  isInviting.value = true;
  formError.value = "";

  try {
    await api.post(`/channels/${props.channelId}/invite`, {
      member_id: selectedMemberId.value,
    });
    emit("invited");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("channel.room.status.errorInvite");
  } finally {
    isInviting.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  async (newVal) => {
    if (newVal) {
      await fetchChannelMembers();
      selectedMemberId.value = "";
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.form-help {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
</style>
