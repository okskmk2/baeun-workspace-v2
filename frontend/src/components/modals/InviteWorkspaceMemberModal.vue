<template>
  <BaseModal :open="open" :title="t('workspace.home.members.modal.title')" @close="handleClose">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="member-email">{{ t("workspace.home.members.emailLabel") }}</label>
        <input
          id="member-email"
          v-model.trim="form.email"
          type="email"
          placeholder="member@example.com"
        />
      </div>
      <div class="form-field">
        <label for="member-role">{{ t("workspace.home.members.roleLabel") }}</label>
        <select id="member-role" v-model="form.role">
          <option value="OWNER">{{ t("roles.workspace_member.owner") }}</option>
          <option value="ADMIN">{{ t("roles.workspace_member.admin") }}</option>
          <option value="MEMBER">{{ t("roles.workspace_member.member") }}</option>
        </select>
      </div>
      <p class="slot-hint" :class="{ 'is-short': remaining < 1 }">
        {{ t("workspace.home.slots.memberRemaining", { remaining, granted }) }}
      </p>
      <p v-if="remaining < 1" class="form-error">
        <router-link :to="buyTo">{{ t("workspace.home.slots.buy") }}</router-link>
      </p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("workspace.home.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting || remaining < 1">
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
  workspaceId: {
    type: [Number, String],
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
const granted = computed(() => Number(props.granted) || 0);
const buyTo = computed(() => monthlyCartTo("WORKSPACE_MEMBER", props.workspaceId));

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
      role_name: form.value.role,
    });
    emit("invited");
    handleClose();
  } catch (error) {
    formError.value = slotErrorMessage(error, t("workspace.home.status.errorInvite"));
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
.slot-hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.slot-hint.is-short {
  color: var(--color-danger);
}
</style>

