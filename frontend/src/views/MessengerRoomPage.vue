<template>
  <hgroup>
    <div>
      <h1>{{ displayRoomTitle }}</h1>
      <span
        class="room-status"
        :class="{ offline: !isConnected }"
        role="status"
        :aria-label="
          isConnected
            ? t('messenger.room.status.connected')
            : t('messenger.room.status.disconnected')
        "
        :title="
          isConnected
            ? t('messenger.room.status.connected')
            : t('messenger.room.status.disconnected')
        "
      ></span>
    </div>
    <div class="actions">
      <button type="button" class="btn btn--sm" @click="openInviteModal">
        {{ t("messenger.room.actions.invite") }}
      </button>
      <button type="button" class="btn btn--sm btn--secondary" @click="openMembersModal">
        {{ t("messenger.room.actions.members") }}
      </button>
      <router-link
        class="btn btn--icon"
        :aria-label="t('messenger.room.actions.settings')"
        :title="t('messenger.room.actions.settings')"
        :to="channelSettingsPath"
      >
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <div ref="messagesContainer" class="messages">
    <div
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="{ system: isSystemMessage(message) }"
    >
      <template v-if="isSystemMessage(message)">
        <div class="message-content">{{ message.content }}</div>
      </template>
      <template v-else>
        <Avatar
          class="message-avatar"
          :text="getInitials(message.creator_name)"
          :label="message.creator_name || t('messenger.room.fallback.unknownUser')"
          :size="36"
        />
        <div class="message-body">
          <div class="message-header">
            <span class="message-author">
              {{ message.creator_name || t("messenger.room.fallback.unknownUser") }}
            </span>
            <span class="message-time">{{ formatTime(message.created_at) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
          <div class="message-feedback">
            <div class="feedback-items">
              <div
                v-for="option in feedbackOptions"
                :key="option.key"
                v-show="getFeedbackCount(message, option.key) > 0"
                class="feedback-chip"
                :class="{ active: isFeedbackMine(message, option.key) }"
                :aria-label="t(option.labelKey)"
              >
                <MaterialSymbol :name="option.icon" :size="16" />
                <span class="feedback-count">{{ getFeedbackCount(message, option.key) }}</span>
              </div>
            </div>
            <button
              type="button"
              class="feedback-button"
              :aria-label="t('messenger.room.feedback.add')"
              @click="openFeedbackModal(message)"
            >
              <MaterialSymbol name="add_reaction" :size="16" />
            </button>
          </div>
        </div>
      </template>
    </div>
    <p v-if="!messages.length" class="empty">{{ t("messenger.room.empty.messages") }}</p>
  </div>

  <form class="composer" @submit.prevent="sendMessage">
    <input
      v-model.trim="draft"
      type="text"
      :placeholder="t('messenger.room.composer.placeholder')"
      :disabled="isSending"
    />
    <button type="submit" class="btn" :disabled="isSending || !draft">
      {{ t("messenger.room.composer.send") }}
    </button>
  </form>

  <BaseModal
    :open="isInviteOpen"
    :title="t('messenger.room.invite.modal.title')"
    @close="closeInviteModal"
  >
    <form class="modal-form" @submit.prevent="inviteMember">
      <label for="invite-member">{{ t("messenger.room.invite.modal.membersLabel") }}</label>
      <select id="invite-member" v-model="selectedMemberId">
        <option value="">{{ t("messenger.room.invite.modal.selectPlaceholder") }}</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <p v-if="inviteError" class="form-error">{{ inviteError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeInviteModal">
          {{ t("messenger.room.actions.cancel") }}
        </button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{
            isInviting
              ? t("messenger.room.actions.inviting")
              : t("messenger.room.actions.inviteSubmit")
          }}
        </button>
      </div>
    </form>
  </BaseModal>

  <BaseModal
    :open="isMembersOpen"
    :title="t('messenger.room.members.modal.title')"
    @close="closeMembersModal"
  >
    <div class="member-list">
      <p v-if="isMembersLoading" class="status">{{ t("messenger.room.members.status.loading") }}</p>
      <p v-else-if="membersError" class="status error">{{ membersError }}</p>
      <p v-else-if="!chatMembers.length" class="status">
        {{ t("messenger.room.members.empty") }}
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

  <BaseModal
    :open="isFeedbackOpen"
    :title="t('messenger.room.feedback.modal.title')"
    @close="closeFeedbackModal"
  >
    <div class="feedback-modal">
      <button
        v-for="option in feedbackOptions"
        :key="option.key"
        type="button"
        class="feedback-option"
        :class="{ 'is-active': isActiveFeedbackOption(option.key) }"
        @click="selectFeedback(option.key)"
      >
        <MaterialSymbol :name="option.icon" :size="20" />
        <span>{{ t(option.labelKey) }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import Avatar from "../components/Avatar.vue";
import MaterialSymbol from "../components/MaterialSymbol.vue";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useRoleLabels } from "../lib/roleLabels";

const { t, locale } = useI18n();
const { getRoleLabel } = useRoleLabels();
const route = useRoute();
const projectMemberStore = useProjectMemberStore();
const roomId = computed(() => route.params.roomId);
const projectId = computed(() => route.params.projectId);
const workspaceId = computed(() => route.params.workspaceId);

const messages = ref([]);
const messagesContainer = ref(null);
const draft = ref("");
const isSending = ref(false);
const isConnected = ref(false);
const roomTitle = ref("");
const displayRoomTitle = computed(() => roomTitle.value || t("messenger.room.fallback.roomTitle"));
let socket = null;
const isInviteOpen = ref(false);
const isInviting = ref(false);
const inviteError = ref("");
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const selectedMemberId = ref("");
const isMembersOpen = ref(false);
const isMembersLoading = ref(false);
const membersError = ref("");
const chatMembers = ref([]);
const isFeedbackOpen = ref(false);
const activeFeedbackMessageId = ref(null);
const feedbackOptions = [
  { key: "like", icon: "thumb_up", labelKey: "messenger.room.feedback.like" },
  { key: "checking", icon: "schedule", labelKey: "messenger.room.feedback.checking" },
  { key: "done", icon: "task_alt", labelKey: "messenger.room.feedback.done" },
  { key: "excited", icon: "celebration", labelKey: "messenger.room.feedback.excited" },
  { key: "sad", icon: "sentiment_dissatisfied", labelKey: "messenger.room.feedback.sad" },
  { key: "funny", icon: "sentiment_very_satisfied", labelKey: "messenger.room.feedback.funny" },
];

const fetchchannelDetail = async () => {
  if (!roomId.value) {
    roomTitle.value = "";
    return;
  }

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    roomTitle.value = res.data?.data?.name || "";
  } catch (error) {
    roomTitle.value = "";
  }
};

const fetchMessages = async () => {
  if (!roomId.value) return;
  const res = await api.get(`/channels/${roomId.value}/messages`);
  messages.value = res.data?.data || [];
};

const scrollMessagesToBottom = async () => {
  await nextTick();
  if (!messagesContainer.value) return;
  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
};

const fetchChatMembers = async () => {
  if (!roomId.value) {
    chatMembers.value = [];
    return;
  }

  isMembersLoading.value = true;
  membersError.value = "";

  try {
    const res = await api.get(`/channels/${roomId.value}/members`);
    chatMembers.value = res.data?.data || [];
  } catch (error) {
    chatMembers.value = [];
    membersError.value = t("messenger.room.members.status.errorLoad");
  } finally {
    isMembersLoading.value = false;
  }
};

const connectSocket = () => {
  if (socket) {
    socket.close();
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const port = window.location.hostname.includes("localhost") ? ":8080" : "";
  socket = new WebSocket(`${protocol}://${window.location.hostname}${port}/ws`);

  socket.addEventListener("open", () => {
    isConnected.value = true;
    if (roomId.value) {
      socket.send(JSON.stringify({ type: "join", channelId: roomId.value }));
      console.log("연결됨");
    }
  });
  socket.addEventListener("close", () => {
    isConnected.value = false;
  });
  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload?.type === "message" && payload?.data) {
        messages.value = [...messages.value, payload.data];
        return;
      }
      if (payload?.type === "feedback" && payload?.data) {
        const messageId = payload.data.message_id;
        const counts = payload.data.feedback_counts || {};
        messages.value = messages.value.map((message) =>
          String(message.id) === String(messageId)
            ? {
                ...message,
                feedback_counts: counts,
                feedback_mine: message.feedback_mine || [],
              }
            : message
        );
      }
    } catch (error) {
      // ignore bad payloads
    }
  });
};

const sendMessage = async () => {
  if (!draft.value || !roomId.value || !socket || socket.readyState !== 1) return;
  isSending.value = true;
  socket.send(
    JSON.stringify({
      type: "message",
      channelId: roomId.value,
      content: draft.value,
    })
  );
  draft.value = "";
  isSending.value = false;
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localeMap = {
    ko: "ko-KR",
    en: "en-US",
    id: "id-ID",
  };
  const timeLocale = localeMap[locale.value] || "en-US";
  return date.toLocaleTimeString(timeLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isSystemMessage = (message) => {
  if (message?.message_type === "SYSTEM") return true;
  const content = message?.content || "";
  return /님이 .*님을 초대했습니다\.$/.test(content);
};

const getFeedbackCount = (message, key) => {
  if (!message?.id) return 0;
  const baseCounts = message.feedback_counts || message.feedbackCounts || {};
  return baseCounts[key] || 0;
};

const isFeedbackMine = (message, key) => {
  const mine = message?.feedback_mine || message?.feedbackMine || [];
  return mine.includes(key);
};

const isActiveFeedbackOption = (key) => {
  if (!activeFeedbackMessageId.value) return false;
  const target = messages.value.find(
    (message) => String(message.id) === String(activeFeedbackMessageId.value)
  );
  if (!target) return false;
  return isFeedbackMine(target, key);
};

const openFeedbackModal = (message) => {
  activeFeedbackMessageId.value = message?.id || null;
  if (!activeFeedbackMessageId.value) return;
  isFeedbackOpen.value = true;
};

const closeFeedbackModal = () => {
  isFeedbackOpen.value = false;
  activeFeedbackMessageId.value = null;
};

const selectFeedback = (key) => {
  const messageId = activeFeedbackMessageId.value;
  if (!messageId || !roomId.value) return;
  api
    .post(`/channels/${roomId.value}/messages/${messageId}/feedback`, {
      feedback_key: key,
    })
    .then((res) => {
      const counts = res.data?.data?.feedback_counts || {};
      const mine = res.data?.data?.feedback_mine || [];
      messages.value = messages.value.map((message) =>
        String(message.id) === String(messageId)
          ? { ...message, feedback_counts: counts, feedback_mine: mine }
          : message
      );
      closeFeedbackModal();
    })
    .catch(() => {
      // keep modal open on error
    });
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const openInviteModal = () => {
  inviteError.value = "";
  selectedMemberId.value = "";
  isInviteOpen.value = true;
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const openMembersModal = async () => {
  isMembersOpen.value = true;
  await fetchChatMembers();
};

const closeMembersModal = () => {
  isMembersOpen.value = false;
};

const inviteMember = async () => {
  if (!selectedMemberId.value) {
    inviteError.value = t("messenger.room.invite.validation.selectMember");
    return;
  }

  if (!roomId.value) {
    inviteError.value = t("messenger.room.invite.validation.noChannel");
    return;
  }

  isInviting.value = true;
  inviteError.value = "";

  try {
    await api.post(`/channels/${roomId.value}/invite`, {
      member_id: selectedMemberId.value,
    });
    closeInviteModal();
  } catch (error) {
    inviteError.value = error?.response?.data?.message || t("messenger.room.invite.status.error");
  } finally {
    isInviting.value = false;
  }
};

const channelSettingsPath = computed(() => {
  if (!roomId.value) return "";
  return `/workspace/${workspaceId.value}/project/${projectId.value}/messenger/${roomId.value}/settings`;
});

onMounted(async () => {
  await fetchchannelDetail();
  await fetchMessages();
  connectSocket();
});

watch(roomId, async () => {
  await fetchchannelDetail();
  await fetchMessages();
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ type: "join", channelId: roomId.value }));
  }
});

watch(
  () => messages.value.length,
  (nextLength, previousLength) => {
    if (nextLength > previousLength) {
      scrollMessagesToBottom();
    }
  }
);

onBeforeUnmount(() => {
  if (socket) {
    socket.close();
    socket = null;
    console.log("소켓 닫힘");
  }
});
</script>

<style scoped>
.room-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.room-status {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background-color: var(--color-success);
}

.room-status.offline {
  background-color: var(--color-danger);
}

.messages {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  /* padding: 16px 24px; */
  display: flex;
  flex-direction: column;
  /* gap: 16px; */
  background-color: var(--color-card-bg);
  height: calc(100vh - 268px);
  overflow-y: scroll;
}

.message {
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message:hover {
  background-color: var(--color-surface);
}

.message.system {
  justify-content: center;
  text-align: center;
  padding: 6px 10px;
  background-color: var(--color-surface-alt);
}

.message-avatar {
  flex-shrink: 0;
}

.message-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.message-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.message-author {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.message-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.message-content {
  font-size: 14px;
  color: var(--color-text);
}

.message-feedback {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.feedback-items {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.feedback-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  /* border-style: none; */
  background-color: var(--color-surface);
  /* background-color: transparent; */
  color: var(--color-text-muted);
  cursor: pointer;
}

.feedback-button:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.feedback-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
}

.feedback-chip.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.feedback-count {
  min-width: 12px;
  text-align: center;
}

.feedback-modal {
  display: grid;
  gap: 8px;
}

.feedback-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background-color: var(--color-card-bg);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.feedback-option.is-active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.feedback-option:hover {
  border-color: var(--color-text-muted);
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
}

.composer {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.composer input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--color-input-bg);
  color: var(--color-text);
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-list li {
  display: grid;
  gap: 4px 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-card-bg);
}

.member-name {
  font-weight: 600;
  color: var(--color-text);
}

.member-meta {
  font-size: 12px;
  color: var(--color-text-muted);
}

.member-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  justify-self: end;
}

.status {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.status.error {
  color: var(--color-danger);
}
</style>
