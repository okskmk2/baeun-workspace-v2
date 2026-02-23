<template>
  <BaseModal :open="open" :title="t('messenger.room.feedback.modal.title')" @close="handleClose">
    <div class="feedback-modal">
      <button
        v-for="option in feedbackOptions"
        :key="option.key"
        type="button"
        class="feedback-option"
        :class="{ 'is-active': isActive(option.key) }"
        @click="handleSelect(option.key)"
      >
        <MaterialSymbol :name="option.icon" :size="20" />
        <span>{{ t(option.labelKey) }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import api from "../../lib/axios";
import BaseModal from "../BaseModal.vue";
import MaterialSymbol from "../MaterialSymbol.vue";

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
  messageId: {
    type: [Number, String],
    default: null,
  },
  currentFeedback: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["close", "selected"]);

const feedbackOptions = [
  { key: "like", icon: "thumb_up", labelKey: "messenger.room.feedback.like" },
  { key: "checking", icon: "schedule", labelKey: "messenger.room.feedback.checking" },
  { key: "done", icon: "task_alt", labelKey: "messenger.room.feedback.done" },
  { key: "excited", icon: "celebration", labelKey: "messenger.room.feedback.excited" },
  { key: "sad", icon: "sentiment_dissatisfied", labelKey: "messenger.room.feedback.sad" },
  { key: "funny", icon: "sentiment_very_satisfied", labelKey: "messenger.room.feedback.funny" },
];

const isActive = (key) => {
  return props.currentFeedback.includes(key);
};

const handleClose = () => {
  emit("close");
};

const handleSelect = async (key) => {
  if (!props.messageId || !props.channelId) return;

  try {
    const res = await api.post(
      `/channels/${props.channelId}/messages/${props.messageId}/feedback`,
      {
        feedback_key: key,
      }
    );
    emit("selected", {
      messageId: props.messageId,
      feedbackCounts: res.data?.feedback_counts || {},
      feedbackMine: res.data?.feedback_mine || [],
    });
    handleClose();
  } catch (error) {
    console.error("Failed to send feedback:", error);
    // Keep modal open on error
  }
};
</script>

<style scoped>
.feedback-modal {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.feedback-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.feedback-option:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-light, #f0f9ff);
}

.feedback-option.is-active {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: white;
}

.feedback-option span {
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 600px) {
  .feedback-modal {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
