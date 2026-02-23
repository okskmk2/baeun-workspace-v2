<template>
  <BaseModal :open="open" :title="t('workspace.home.members.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="member-email">{{ t("workspace.home.members.emailLabel") }}</label>
      <input
        id="member-email"
        v-model.trim="form.email"
        type="email"
        placeholder="member@example.com"
      />
      <label for="member-role">{{ t("workspace.home.members.roleLabel") }}</label>
      <select id="member-role" v-model="form.role">
        <option value="OWNER">{{ t("roles.workspace_member.owner") }}</option>
        <option value="ADMIN">{{ t("roles.workspace_member.admin") }}</option>
        <option value="MEMBER">{{ t("roles.workspace_member.member") }}</option>
      </select>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("workspace.home.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{
            isInviting
              ? t("workspace.home.actions.invitingMember")
              : t("workspace.home.actions.submit")
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
  workspaceId: {
    type: [Number, String],
    required: true,
  },
});

const emit = defineEmits(["close", "invited"]);

const form = ref({ email: "", role: "MEMBER" });
const isInviting = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.email) {
    formError.value = t("workspace.home.validation.emailRequired");
    return;
  }

  isInviting.value = true;
  formError.value = "";

  try {
    await api.post(`/workspaces/${props.workspaceId}/members`, {
      email: form.value.email,
      role: form.value.role,
    });
    emit("invited");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("workspace.home.status.errorInvite");
  } finally {
    isInviting.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { email: "", role: "MEMBER" };
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
