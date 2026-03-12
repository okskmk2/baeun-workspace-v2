<template>
  <BaseModal :open="open" :title="t('settings.member.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="workspace-member">{{ t("settings.member.modal.membersLabel") }}</label>
        <select id="workspace-member" v-model="selectedMemberId">
          <option value="">{{ t("settings.member.modal.selectPlaceholder") }}</option>
          <option
            v-for="member in availableMembers"
            :key="member.id"
            :value="member.id"
            :disabled="member.isAlreadyMember"
          >
            {{ member.name }} ({{ member.email }})
          </option>
        </select>
      </div>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("settings.member.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{
            isInviting
              ? t("settings.member.actions.inviting")
              : t("settings.member.actions.submitInvite")
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
  projectId: {
    type: [Number, String],
    required: true,
  },
  workspaceMembers: {
    type: Array,
    default: () => [],
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

const availableMembers = computed(() => {
  return props.workspaceMembers.map((member) => ({
    ...member,
    isAlreadyMember: props.projectMembers.some((pm) => String(pm.id) === String(member.id)),
  }));
});

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!selectedMemberId.value) {
    formError.value = t("settings.member.validation.memberRequired");
    return;
  }

  isInviting.value = true;
  formError.value = "";

  try {
    await api.post(`/projects/${props.projectId}/members`, {
      member_id: selectedMemberId.value,
    });
    emit("invited");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("settings.member.status.errorInvite");
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

