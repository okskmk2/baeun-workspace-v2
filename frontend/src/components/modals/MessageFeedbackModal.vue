<template>
  <BaseModal :open="open" :title="t('channel.room.feedback.modal.title')" @close="handleClose">
    <div class="feedback-modal">
      <button
        v-for="option in feedbackOptions"
        :key="option.key"
        type="button"
        class="feedback-option"
        :class="{ 'is-active': isActive(option.key) }"
        @click="handleSelect(option.key)"
      >
        <span class="feedback-emoji" aria-hidden="true">{{ option.emoji }}</span>
        <span class="feedback-label">{{ t(option.labelKey) }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
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
  { key: "done", emoji: "✅", labelKey: "channel.room.feedback.done" },
  { key: "like", emoji: "👍", labelKey: "channel.room.feedback.like" },
  { key: "checking", emoji: "👀", labelKey: "channel.room.feedback.checking" },
  { key: "thanks", emoji: "🙏", labelKey: "channel.room.feedback.thanks" },
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
  grid-template-columns: repeat(2, 1fr);
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

.feedback-emoji {
  font-size: 1.25rem;
  line-height: 1;
}

.feedback-label {
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 600px) {
  .feedback-modal {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
