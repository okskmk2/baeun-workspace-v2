<template>
  <BaseModal :open="open" :title="t('channel.room.members.modal.title')" @close="handleClose">
    <div class="member-list">
      <p v-if="isLoading" class="status">{{ t("channel.room.members.status.loading") }}</p>
      <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
      <p v-else-if="!chatMembers.length" class="status">
        {{ t("channel.room.members.empty") }}
      </p>
      <ul v-else>
        <li v-for="member in chatMembers" :key="member.id">
          <span class="member-name">{{ member.name }}</span>
          <span class="member-meta">{{ member.email }}</span>
          <span class="member-role">
            {{ getRoleLabel("channel_member", member.role_name) }}
          </span>
        </li>
      </ul>
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
  channelId: {
    type: [Number, String],
    required: true,
  },
});

const emit = defineEmits(["close"]);

const chatMembers = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");

const handleClose = () => {
  emit("close");
};

const fetchChatMembers = async () => {
  if (!props.channelId) {
    chatMembers.value = [];
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await api.get(`/channels/${props.channelId}/members`);
    chatMembers.value = res.data || [];
  } catch (error) {
    chatMembers.value = [];
    errorMessage.value = t("channel.room.members.status.errorLoad");
  } finally {
    isLoading.value = false;
  }
};

// Fetch members when modal opens
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      fetchChatMembers();
    }
  }
);
</script>

<style scoped>
.member-list {
  min-height: 200px;
}

.status {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
}

.member-name {
  font-weight: 500;
  flex: 1;
}

.member-meta {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0 1rem;
}

.member-role {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
</style>
