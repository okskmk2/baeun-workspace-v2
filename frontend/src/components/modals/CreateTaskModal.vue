<template>
  <BaseModal
    :open="open"
    :title="t('kanban.page.modal.title')"
    :closeOnBackdrop="false"
    @close="handleClose"
  >
    <form class="modal-form" @submit.prevent="handleSubmit">
      <label for="task-title">{{ t("backlog.page.modal.titleLabel") }}</label>
      <input
        id="task-title"
        v-model.trim="form.title"
        type="text"
        :placeholder="t('backlog.page.modal.titlePlaceholder')"
      />

      <label for="task-content">{{ t("backlog.page.modal.descriptionLabel") }}</label>
      <textarea
        id="task-content"
        v-model.trim="form.content"
        rows="10"
        :placeholder="t('backlog.page.modal.descriptionPlaceholder')"
      ></textarea>

      <template v-if="showStatusSelect">
        <label for="task-status">{{ t("kanban.page.modal.statusLabel") }}</label>
        <select id="task-status" v-model="form.status">
          <option v-for="status in statuses" :key="status" :value="status">
            {{ getStatusLabel(status) }}
          </option>
        </select>
      </template>

      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="handleClose">
          {{ t("backlog.page.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isCreating">
          {{ isCreating ? t("backlog.page.actions.creating") : t("backlog.page.actions.create") }}
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
import { convertSnakeToCamel } from "../../lib/utils";

const { t } = useI18n();

const props = defineProps({
  open: {
    type: Boolean,
    required: true,
  },
  kanbanId: {
    type: [Number, String],
    default: null,
  },
  showStatusSelect: {
    type: Boolean,
    default: false,
  },
  statuses: {
    type: Array,
    default: () => ["BACKLOG"],
  },
  defaultStatus: {
    type: String,
    default: "BACKLOG",
  },
});

const emit = defineEmits(["close", "created"]);

const form = ref({
  title: "",
  content: "",
  status: "BACKLOG",
});
const isCreating = ref(false);
const formError = ref("");

const getStatusLabel = (status) => {
  const key = convertSnakeToCamel(status);
  return t(`task.status.${key}`);
};

const handleClose = () => {
  emit("close");
};

const handleSubmit = async () => {
  if (!form.value.title) {
    formError.value = t("backlog.page.validation.titleRequired");
    return;
  }

  isCreating.value = true;
  formError.value = "";

  try {
    await api.post("/tasks", {
      title: form.value.title,
      content: form.value.content,
      kanban_id: props.kanbanId,
      status: form.value.status,
    });
    emit("created");
    handleClose();
  } catch (error) {
    formError.value = error?.response?.data?.message || t("backlog.page.status.errorCreate");
  } finally {
    isCreating.value = false;
  }
};

// Reset form when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      form.value = {
        title: "",
        content: "",
        status: props.defaultStatus || "BACKLOG",
      };
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
