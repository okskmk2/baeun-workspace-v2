<template>
  <BaseModal
    :open="open"
    :title="t('wiki.page.permissions.modal.title')"
    @close="handleClose"
  >
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="permission-member">{{ t("wiki.page.permissions.membersLabel") }}</label>
      <select id="permission-member" v-model="form.memberId">
        <option value="">{{ t("wiki.page.permissions.selectPlaceholder") }}</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <label for="permission-role">{{ t("wiki.page.permissions.roleLabel") }}</label>
      <select id="permission-role" v-model="form.roleName">
        <option v-for="option in permissionRoleOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("wiki.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isSaving">
          {{ isSaving ? t("wiki.page.actions.saving") : t("wiki.page.actions.save") }}
        </button>
      </div>
    </form>
    <div v-if="pageMembers.length" class="permission-list">
      <div v-for="member in pageMembers" :key="member.member_id" class="permission-row">
        <span>{{ member.name }}</span>
        <span class="role">{{ getRoleLabel("page_member", member.role_name) }}</span>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";
import { useRoleLabels } from "../../lib/roleLabels";

const { t } = useI18n();
const { getRoleLabel } = useRoleLabels();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  pageId: {
    type: [Number, String],
    required: true,
  },
  projectId: {
    type: [Number, String],
    required: true,
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  pageMembers: {
    type: Array,
    default: () => [],
  },
  permissionRoleOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "saved"]);

const form = ref({ memberId: "", roleName: "VIEWER" });
const isSaving = ref(false);
const formError = ref("");

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.memberId) {
    formError.value = t("wiki.page.permissions.validation.selectMember");
    return;
  }

  isSaving.value = true;
  formError.value = "";

  try {
    await api.post(
      `/pages/${props.pageId}/members`,
      {
        member_id: form.value.memberId,
        role_name: form.value.roleName,
      },
      {
        params: { project_id: props.projectId },
      }
    );
    emit("saved");
  } catch (error) {
    formError.value =
      error?.response?.data?.message || t("wiki.page.permissions.status.errorUpdate");
  } finally {
    isSaving.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = { memberId: "", roleName: "VIEWER" };
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
.permission-list {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.permission-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--color-surface);
  border-radius: 4px;
}
.role {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
</style>
