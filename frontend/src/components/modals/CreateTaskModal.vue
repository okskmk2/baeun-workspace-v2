<template>
  <BaseModal
    :open="open"
    :title="t('kanban.page.modal.title')"
    :closeOnBackdrop="false"
    @close="handleClose"
  >
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label for="task-title">{{ t("backlog.page.modal.titleLabel") }}</label>
        <input
          id="task-title"
          v-model.trim="form.title"
          type="text"
          :placeholder="t('backlog.page.modal.titlePlaceholder')"
        />
      </div>

      <div class="form-field">
        <label for="task-content">{{ t("backlog.page.modal.descriptionLabel") }}</label>
        <textarea
          id="task-content"
          v-model.trim="form.content"
          rows="10"
          :placeholder="t('backlog.page.modal.descriptionPlaceholder')"
        ></textarea>
      </div>

      <template v-if="showStatusSelect">
        <div class="form-field">
          <label for="task-status">{{ t("kanban.page.modal.statusLabel") }}</label>
          <select id="task-status" v-model="form.status">
            <option v-for="status in statuses" :key="status" :value="status">
              {{ getStatusLabel(status) }}
            </option>
          </select>
        </div>
      </template>

      <div class="form-field">
        <label for="task-priority">{{ t("backlog.page.modal.priorityLabel") }}</label>
        <div class="priority-select-row">
          <MaterialSymbol
            :name="getPriorityIconName(form.priority)"
            :size="18"
            class="priority-icon"
            :style="{ color: getPriorityColor(form.priority) }"
          />
          <select id="task-priority" v-model.number="form.priority">
            <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
              {{ t(option.labelKey) }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label for="task-due-date">{{ t("backlog.page.modal.dueDateLabel") }}</label>
        <input
          id="task-due-date"
          v-model="form.due_date"
          type="date"
        />
      </div>

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
import MaterialSymbol from "../MaterialSymbol.vue";
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
  priority: 0,
  due_date: "",
});
const isCreating = ref(false);
const formError = ref("");
const priorityOptions = [
  { value: 2, labelKey: "task.priority.urgent" },
  { value: 1, labelKey: "task.priority.high" },
  { value: 0, labelKey: "task.priority.normal" },
  { value: -1, labelKey: "task.priority.relaxed" },
];

const getPriorityIconName = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return "stat_2";
  if (parsed === 1) return "stat_1";
  if (parsed === 0) return "stat_0";
  if (parsed === -1) return "stat_minus_1";
  return "stat_0";
};

const getPriorityColor = (priority) => {
  const parsed = Number(priority);
  if (parsed === 2) return "var(--color-danger)";
  if (parsed === 1) return "var(--color-warning)";
  if (parsed === 0) return "var(--color-info)";
  if (parsed === -1) return "var(--color-text-muted)";
  return "var(--color-text-muted)";
};

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
      priority: form.value.priority,
      due_date: form.value.due_date || null,
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
        priority: 0,
        due_date: "",
      };
      formError.value = "";
    }
  }
);
</script>

<style scoped>
.priority-select-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.priority-icon {
  flex-shrink: 0;
}
</style>
