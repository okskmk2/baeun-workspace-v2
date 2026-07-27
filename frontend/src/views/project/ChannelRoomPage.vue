<template>
  <hgroup>
    <div>
      <h1>{{ displayRoomTitle }}</h1>
      <span
        class="room-status"
        :class="{ offline: !isConnected }"
        role="status"
        :aria-label="
          isConnected ? t('channel.room.status.connected') : t('channel.room.status.disconnected')
        "
        :title="
          isConnected ? t('channel.room.status.connected') : t('channel.room.status.disconnected')
        "
      ></span>
    </div>
    <div class="actions">
      <router-link v-if="linkedIssuePath" class="btn btn--sm btn--secondary" :to="linkedIssuePath">
        <MaterialSymbol name="link" :size="16" alt="" />
        {{ t("channel.room.actions.linkedIssue") }}
      </router-link>
      <button v-if="!isNoticeChannel" type="button" class="btn btn--sm" @click="openInviteModal">
        <MaterialSymbol name="person_add" :size="16" alt="" />
        {{ t("channel.room.actions.invite") }}
      </button>
      <button
        v-if="!isDmChannel && !isNoticeChannel && !isChannelOwner"
        type="button"
        class="btn btn--sm btn--secondary"
        @click="leaveChannel"
      >
        <MaterialSymbol name="logout" :size="16" alt="" />
        {{ t("channel.room.actions.leave") }}
      </button>
      <router-link
        v-if="!isNoticeChannel"
        class="btn btn--icon"
        :aria-label="t('channel.room.actions.settings')"
        :title="t('channel.room.actions.settings')"
        :to="channelSettingsPath"
      >
        <MaterialSymbol name="settings" :size="18" />
      </router-link>
    </div>
  </hgroup>

  <div class="chat-panel">
    <div ref="messagesContainer" class="messages" @scroll.passive="onMessagesScroll">
      <p
        v-if="isLoadingMoreMessages"
        class="messages-loading-more"
        role="status"
        aria-live="polite"
      >
        {{ t("channel.room.actions.loadingMore") }}
      </p>
      <div v-if="isIssueChannel" class="message system issue-notice">
        <div class="message-content">{{ t("channel.room.system.issueArchiveNotice") }}</div>
      </div>
      <div v-if="!messages.length" class="empty-state" role="status" aria-live="polite">
        <p class="empty-title">{{ t("channel.room.empty.messages") }}</p>
        <p class="empty-description">{{ t("channel.room.empty.description") }}</p>
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="{ system: isSystemMessage(message), agent: isAgentMessage(message) }"
      >
        <template v-if="isSystemMessage(message)">
          <div class="message-content">{{ message.content }}</div>
        </template>
        <template v-else>
          <Avatar
            class="message-avatar"
            :text="getInitials(getMessageAuthor(message))"
            :label="getMessageAuthor(message)"
            :size="36"
          />
          <div class="message-body">
            <div class="message-header">
              <span class="message-author">
                {{ getMessageAuthor(message) }}
              </span>
              <span v-if="isAgentMessage(message)" class="message-type-badge">
                {{ t("channel.room.messageType.agent") }}
              </span>
              <span class="message-time">{{ formatTime(message.created_at) }}</span>
            </div>
            <div v-if="message.content" class="message-content">{{ message.content }}</div>
            <div
              v-if="message.attachments && message.attachments.length"
              class="message-attachments"
            >
              <a
                v-for="attachment in message.attachments"
                :key="attachment.id"
                :href="attachment.url"
                target="_blank"
                rel="noopener noreferrer"
                class="message-attachment"
              >
                <img
                  v-if="isImageAttachment(attachment)"
                  :src="attachment.url"
                  :alt="attachment.original_file_name"
                  class="attachment-image"
                />
                <template v-else>
                  <MaterialSymbol name="attach_file" :size="16" />
                  <span class="attachment-file-name">{{ attachment.original_file_name }}</span>
                  <span class="attachment-file-size">{{
                    formatFileSize(attachment.file_size_bytes)
                  }}</span>
                </template>
              </a>
            </div>
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
                  <span class="feedback-emoji" aria-hidden="true">{{ option.emoji }}</span>
                  <span class="feedback-count">{{ getFeedbackCount(message, option.key) }}</span>
                </div>
              </div>
              <button
                type="button"
                class="feedback-button"
                :aria-label="t('channel.room.feedback.add')"
                @click="openFeedbackModal(message)"
              >
                <MaterialSymbol name="add_reaction" :size="16" />
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="composer-wrap">
      <div v-if="pendingFiles.length" class="pending-files">
        <div v-for="(file, index) in pendingFiles" :key="index" class="pending-file">
          <img
            v-if="isImageFile(file)"
            :src="pendingFileUrls[index]"
            :alt="file.name"
            class="pending-file-thumb"
          />
          <MaterialSymbol v-else name="attach_file" :size="16" />
          <span class="pending-file-name">{{ file.name }}</span>
          <button
            type="button"
            class="pending-file-remove"
            :aria-label="t('channel.room.composer.removeFile')"
            @click="removePendingFile(index)"
          >
            <MaterialSymbol name="close" :size="14" />
          </button>
        </div>
      </div>
      <form class="composer" @submit.prevent="sendMessage">
        <button
          type="button"
          class="btn btn--icon"
          :disabled="isSending || !canPostMessage"
          :aria-label="t('channel.room.composer.attach')"
          :title="t('channel.room.composer.attach')"
          @click="triggerFileInput"
        >
          <MaterialSymbol name="attach_file" :size="18" />
        </button>
        <input
          ref="fileInput"
          type="file"
          class="composer-file-input"
          multiple
          @change="onFilesSelected"
        />
        <textarea
          ref="composerTextarea"
          v-model.trim="draft"
          class="composer-textarea"
          rows="1"
          :placeholder="t('channel.room.composer.placeholder')"
          :disabled="isSending || !canPostMessage"
          @keydown="onComposerKeydown"
          @input="resizeComposerTextarea"
        ></textarea>
        <button
          type="submit"
          class="btn"
          :disabled="isSending || (!draft && !pendingFiles.length) || !canPostMessage"
        >
          {{ t("channel.room.composer.send") }}
        </button>
      </form>
      <p v-if="!canPostMessage" class="composer-notice">
        {{ t("channel.room.status.readOnlyNotice") }}
      </p>
    </div>
  </div>

  <AddChannelMemberModal
    :open="isInviteOpen"
    :channel-id="roomId"
    :project-members="projectMembers"
    @close="closeInviteModal"
    @invited="onMemberInvited"
  />

  <MessageFeedbackModal
    :open="isFeedbackOpen"
    :channel-id="roomId"
    :message-id="activeFeedbackMessageId"
    :current-feedback="activeMessageFeedback"
    @close="closeFeedbackModal"
    @selected="onFeedbackSelected"
  />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import api from "../../lib/axios";
import Avatar from "../../components/Avatar.vue";
import MaterialSymbol from "../../components/MaterialSymbol.vue";
import AddChannelMemberModal from "../../components/modals/AddChannelMemberModal.vue";
import MessageFeedbackModal from "../../components/modals/MessageFeedbackModal.vue";
import { addToast } from "../../lib/toast";
import { useProjectMemberStore } from "../../stores/projectMemberStore";
import { useAppStore } from "../../stores/appStore";
import { useRealtimeStore } from "../../stores/realtimeStore";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const projectMemberStore = useProjectMemberStore();
const appStore = useAppStore();
const realtimeStore = useRealtimeStore();
const roomId = computed(() => route.params.roomId);
const projectId = computed(() => route.params.projectId);

const messages = ref([]);
const messagesContainer = ref(null);
const draft = ref("");
const composerTextarea = ref(null);
const isSending = ref(false);
const fileInput = ref(null);
const pendingFiles = ref([]);
const pendingFileUrls = ref([]);
const MAX_ATTACHMENT_FILES = 10;
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const isConnected = ref(false);
const MESSAGE_PAGE_SIZE = 30;
const LOAD_MORE_TOP_THRESHOLD = 24;
const hasMoreMessages = ref(false);
const isLoadingMoreMessages = ref(false);
const isPrependingMessages = ref(false);
const roomTitle = ref("");
const channelDetail = ref(null);
const currentUserId = computed(() => appStore.currentUser?.id);
const memberNameById = computed(() => {
  const map = {};
  (projectMembers.value || []).forEach((member) => {
    map[String(member.id)] = member.name;
  });
  return map;
});
const isDmChannel = computed(() => String(channelDetail.value?.type || "").toUpperCase() === "DM");
const isNoticeChannel = computed(
  () => String(channelDetail.value?.type || "").toUpperCase() === "NOTICE"
);
const isChannelOwner = computed(
  () => String(channelDetail.value?.viewer_role_name || "").toUpperCase() === "OWNER"
);
const canPostMessage = computed(() => {
  if (!isNoticeChannel.value) return true;
  return Boolean(channelDetail.value?.can_post_message);
});
const dmPeerName = computed(() => {
  if (!isDmChannel.value) return "";
  const pairKey = String(channelDetail.value?.dm_pair_key || "");
  if (!pairKey.includes(":")) return "";
  const [firstMemberId, secondMemberId] = pairKey.split(":");
  const currentId = String(currentUserId.value || "");
  const peerId =
    currentId === String(firstMemberId) ? String(secondMemberId) : String(firstMemberId);
  return memberNameById.value[String(peerId)] || "";
});
const displayRoomTitle = computed(() => {
  if (isDmChannel.value && dmPeerName.value) {
    return dmPeerName.value;
  }
  return roomTitle.value || t("channel.room.fallback.roomTitle");
});
const isIssueChannel = computed(() =>
  Boolean(channelDetail.value?.task_id || channelDetail.value?.issue_id)
);
const linkedIssuePath = computed(() => {
  if (!projectId.value) return "";
  const taskId = channelDetail.value?.task_id || channelDetail.value?.issue_id;
  const kanbanId = channelDetail.value?.kanban_id || channelDetail.value?.board_id;
  if (!taskId || !kanbanId) return "";
  return `/project/${projectId.value}/kanban/${kanbanId}/task/${taskId}`;
});
let unsubscribeMessage = null;
let unsubscribeFeedback = null;
let unsubscribeOpen = null;
let unsubscribeClose = null;
const isInviteOpen = ref(false);
const projectMembers = computed(() => projectMemberStore.getProjectMembers(projectId.value));
const isFeedbackOpen = ref(false);
const activeFeedbackMessageId = ref(null);
const feedbackOptions = [
  { key: "done", emoji: "✅", labelKey: "channel.room.feedback.done" },
  { key: "like", emoji: "👍", labelKey: "channel.room.feedback.like" },
  { key: "checking", emoji: "👀", labelKey: "channel.room.feedback.checking" },
  { key: "thanks", emoji: "🙏", labelKey: "channel.room.feedback.thanks" },
];

const fetchchannelDetail = async () => {
  if (!roomId.value) {
    roomTitle.value = "";
    return;
  }

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    channelDetail.value = res.data || null;
    roomTitle.value = res.data?.name || "";
  } catch (error) {
    channelDetail.value = null;
    roomTitle.value = "";
  }
};

const fetchMessages = async ({ loadMore = false } = {}) => {
  if (!roomId.value) return;

  if (loadMore && (isLoadingMoreMessages.value || messages.value.length === 0)) {
    return;
  }

  const beforeMessageId = loadMore ? messages.value[0]?.id : null;
  if (loadMore && !beforeMessageId) return;

  const previousScrollHeight =
    loadMore && messagesContainer.value ? messagesContainer.value.scrollHeight : 0;

  if (loadMore) {
    isLoadingMoreMessages.value = true;
    isPrependingMessages.value = true;
  }

  try {
    const res = await api.get(`/channels/${roomId.value}/messages`, {
      params: {
        limit: MESSAGE_PAGE_SIZE,
        ...(beforeMessageId ? { before_id: beforeMessageId } : {}),
      },
    });
    const fetchedMessages = Array.isArray(res.data) ? res.data : [];

    if (loadMore) {
      const existingIds = new Set(messages.value.map((message) => String(message?.id || "")));
      const uniqueOlderMessages = fetchedMessages.filter(
        (message) => !existingIds.has(String(message?.id || ""))
      );

      if (uniqueOlderMessages.length === 0) {
        hasMoreMessages.value = false;
        return;
      }

      messages.value = [...uniqueOlderMessages, ...messages.value];
      hasMoreMessages.value = fetchedMessages.length === MESSAGE_PAGE_SIZE;
    } else {
      messages.value = fetchedMessages;
      hasMoreMessages.value = fetchedMessages.length === MESSAGE_PAGE_SIZE;
      await scrollMessagesToBottom();
    }

    if (loadMore && messagesContainer.value) {
      await nextTick();
      const container = messagesContainer.value;
      const newScrollHeight = container.scrollHeight;
      container.scrollTop += newScrollHeight - previousScrollHeight;
    }
  } finally {
    if (loadMore) {
      isLoadingMoreMessages.value = false;
      isPrependingMessages.value = false;
    }
  }
};

const loadMoreMessages = async () => {
  await fetchMessages({ loadMore: true });
};

const onMessagesScroll = () => {
  const container = messagesContainer.value;
  if (!container) return;
  if (!hasMoreMessages.value || isLoadingMoreMessages.value || isPrependingMessages.value) return;
  if (container.scrollTop > LOAD_MORE_TOP_THRESHOLD) return;
  loadMoreMessages();
};

const scrollMessagesToBottom = async () => {
  await nextTick();
  if (!messagesContainer.value) return;
  messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
};

const connectSocket = () => {
  isConnected.value = realtimeStore.isConnected;

  unsubscribeOpen = realtimeStore.subscribe("open", () => {
    isConnected.value = true;
    if (roomId.value) {
      realtimeStore.joinRoom(roomId.value);
    }
  });

  unsubscribeClose = realtimeStore.subscribe("close", () => {
    isConnected.value = false;
  });

  unsubscribeMessage = realtimeStore.subscribe("message", (data) => {
    if (!data) return;
    if (String(data.channel_id) !== String(roomId.value)) return;
    messages.value = [...messages.value, data];
  });

  unsubscribeFeedback = realtimeStore.subscribe("feedback", (data) => {
    if (!data) return;
    const messageId = data.message_id;
    const counts = data.feedback_counts || {};
    messages.value = messages.value.map((message) =>
      String(message.id) === String(messageId)
        ? {
            ...message,
            feedback_counts: counts,
            feedback_mine: message.feedback_mine || [],
          }
        : message
    );
  });

  if (roomId.value) {
    realtimeStore.joinRoom(roomId.value);
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const isImageFile = (file) => file.type.startsWith("image/");

const onFilesSelected = (event) => {
  const selected = Array.from(event.target.files || []);
  event.target.value = "";
  const remaining = MAX_ATTACHMENT_FILES - pendingFiles.value.length;
  if (remaining <= 0) {
    addToast({ message: t("channel.room.composer.filesTooMany"), type: "error" });
    return;
  }
  const toAdd = selected.slice(0, remaining);
  const oversized = toAdd.filter((f) => f.size > MAX_ATTACHMENT_SIZE);
  if (oversized.length > 0) {
    addToast({ message: t("channel.room.composer.fileTooBig"), type: "error" });
    return;
  }
  const urls = toAdd.map((file) =>
    file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
  );
  pendingFiles.value = [...pendingFiles.value, ...toAdd];
  pendingFileUrls.value = [...pendingFileUrls.value, ...urls];
};

const removePendingFile = (index) => {
  const url = pendingFileUrls.value[index];
  if (url) URL.revokeObjectURL(url);
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index);
  pendingFileUrls.value = pendingFileUrls.value.filter((_, i) => i !== index);
};

const clearPendingFiles = () => {
  pendingFileUrls.value.forEach((url) => {
    if (url) URL.revokeObjectURL(url);
  });
  pendingFiles.value = [];
  pendingFileUrls.value = [];
};

const isImageAttachment = (attachment) => String(attachment?.mime_type || "").startsWith("image/");

const formatFileSize = (bytes) => {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const resizeComposerTextarea = () => {
  const el = composerTextarea.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};

const onComposerKeydown = (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  sendMessage();
};

const sendMessage = async () => {
  if ((!draft.value && !pendingFiles.value.length) || !roomId.value) return;
  if (isSending.value) return;
  isSending.value = true;
  try {
    let attachments = [];
    if (pendingFiles.value.length > 0) {
      const formData = new FormData();
      pendingFiles.value.forEach((file) => formData.append("files", file));
      const uploadRes = await api.post(`/channels/${roomId.value}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      attachments = Array.isArray(uploadRes.data) ? uploadRes.data : [];
    }
    const ok = realtimeStore.send({
      type: "message",
      channelId: roomId.value,
      content: draft.value,
      messageType: "USER",
      attachments,
    });
    if (!ok) return;
    draft.value = "";
    clearPendingFiles();
    await nextTick();
    resizeComposerTextarea();
  } catch (error) {
    const message = error?.response?.data?.message || t("channel.room.status.errorSend");
    addToast({ message, type: "error" });
  } finally {
    isSending.value = false;
  }
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
  return getMessageType(message) === "SYSTEM";
};

const isAgentMessage = (message) => {
  return getMessageType(message) === "AGENT";
};

const getMessageType = (message) => {
  const explicitType = String(message?.type || "").toUpperCase();
  if (["SYSTEM", "USER", "AGENT"].includes(explicitType)) {
    return explicitType;
  }
  const content = message?.content || "";
  if (/님이 .*님을 초대했습니다\.$/.test(content)) {
    return "SYSTEM";
  }
  return "USER";
};

const getMessageAuthor = (message) => {
  if (isAgentMessage(message)) {
    return message?.creator_name || t("channel.room.messageType.agent");
  }
  return message?.creator_name || t("channel.room.fallback.unknownUser");
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

const activeMessageFeedback = computed(() => {
  if (!activeFeedbackMessageId.value) return [];
  const target = messages.value.find(
    (message) => String(message.id) === String(activeFeedbackMessageId.value)
  );
  return target?.feedback_mine || [];
});

const openFeedbackModal = (message) => {
  activeFeedbackMessageId.value = message?.id || null;
  if (!activeFeedbackMessageId.value) return;
  isFeedbackOpen.value = true;
};

const closeFeedbackModal = () => {
  isFeedbackOpen.value = false;
  activeFeedbackMessageId.value = null;
};

const onFeedbackSelected = ({ messageId, feedbackCounts, feedbackMine }) => {
  messages.value = messages.value.map((message) =>
    String(message.id) === String(messageId)
      ? { ...message, feedback_counts: feedbackCounts, feedback_mine: feedbackMine }
      : message
  );
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
  isInviteOpen.value = true;
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const onMemberInvited = () => {
  // Member invited successfully
};

const leaveChannel = async () => {
  if (!roomId.value) return;
  const confirmed = window.confirm(t("channel.room.confirm.leave"));
  if (!confirmed) return;

  try {
    await api.post(`/channels/${roomId.value}/leave`);
    addToast({ message: t("channel.room.status.left"), type: "success" });
    router.push(`/project/${projectId.value}/channel`);
  } catch (error) {
    const message = error?.response?.data?.message || t("channel.room.status.errorLeave");
    addToast({ message, type: "error" });
  }
};

const channelSettingsPath = computed(() => {
  if (!roomId.value) return "";
  return `/project/${projectId.value}/channel/${roomId.value}/settings`;
});

onMounted(async () => {
  await projectMemberStore.fetchProjectMembers(projectId.value);
  await fetchchannelDetail();
  await fetchMessages({ loadMore: false });
  connectSocket();
});

watch(roomId, async () => {
  await projectMemberStore.fetchProjectMembers(projectId.value);
  await fetchchannelDetail();
  await fetchMessages({ loadMore: false });
  realtimeStore.joinRoom(roomId.value);
});

watch(
  () => messages.value.length,
  (nextLength, previousLength) => {
    if (isPrependingMessages.value) return;
    if (nextLength > previousLength) {
      scrollMessagesToBottom();
    }
  }
);

onBeforeUnmount(() => {
  if (roomId.value) {
    realtimeStore.leaveRoom(roomId.value);
  }
  if (unsubscribeMessage) unsubscribeMessage();
  if (unsubscribeFeedback) unsubscribeFeedback();
  if (unsubscribeOpen) unsubscribeOpen();
  if (unsubscribeClose) unsubscribeClose();
  unsubscribeMessage = null;
  unsubscribeFeedback = null;
  unsubscribeOpen = null;
  unsubscribeClose = null;
  clearPendingFiles();
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

.chat-panel {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.messages {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background-color: var(--color-card-bg);
  flex-grow: 1;
  flex-basis: 0;
  min-height: 0;
  overflow-y: auto;
}

.messages-loading-more {
  margin: 0;
  padding: 10px 12px 4px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
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

.message.agent {
  background-color: var(--color-surface-alt);
}

.issue-notice {
  position: sticky;
  top: 0;
  z-index: 1;
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

.message-type-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
}

.message-content {
  line-height: 1.5;
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

.feedback-add-emoji {
  line-height: 1;
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

.feedback-emoji {
  line-height: 1;
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

.empty-state {
  flex: 1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 6px;
  padding: 16px;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.empty-description {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.composer-wrap {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.composer {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--color-input-border);
  border-radius: 10px;
  background-color: var(--color-input-bg);
  transition: border-color 0.15s;
}

.composer:focus-within {
  border-color: var(--color-accent);
}

.composer .btn--icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.composer .btn--icon:hover {
  color: var(--color-text);
  background-color: var(--color-surface-alt);
}

.composer-textarea {
  flex: 1;
  padding: 8px 6px;
  border: none;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.4;
  background-color: transparent;
  color: var(--color-text);
  resize: none;
  overflow-y: auto;
  max-height: 200px;
}

.composer-textarea:focus {
  outline: none;
}

.composer-notice {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}

.composer-file-input {
  display: none;
}

.pending-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-surface-alt);
}

.pending-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-card-bg);
  font-size: 12px;
  max-width: 200px;
}

.pending-file-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}

.pending-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  color: var(--color-text);
}

.pending-file-remove {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
}

.pending-file-remove:hover {
  color: var(--color-danger);
}

.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.message-attachment {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 13px;
  text-decoration: none;
  max-width: 300px;
}

.message-attachment:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.attachment-image {
  max-width: 240px;
  max-height: 200px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
  border: none;
  padding: 0;
}

.attachment-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.attachment-file-size {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-muted);
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
