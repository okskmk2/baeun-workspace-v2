<template>
  <div
    class="fab-area"
    :class="{
      'fab-area--open': isOpen,
      'fab-area--fixed': fixed,
      'fab-area--inline': !fixed,
    }"
    :style="{
      '--fab-right': `${right}px`,
      '--fab-top': `${top}px`,
    }"
  >
    <div
      v-if="isOpen"
      class="chat-modal"
      :class="[
        fixed ? 'chat-modal--fixed' : 'chat-modal--inline',
        isExpanded ? 'chat-modal--expanded' : '',
      ]"
      role="dialog"
      :aria-label="menuAriaLabel"
      aria-modal="false"
    >
      <header class="chat-modal__header">
        <strong>{{ menuAriaLabel }}</strong>
        <div class="chat-modal__actions">
          <button
            type="button"
            class="chat-modal__new"
            aria-label="새 대화"
            title="새 대화"
            @click="resetConversation"
          >
            <MaterialSymbol name="add_comment" :size="16" alt="" />
          </button>
          <button
            type="button"
            class="chat-modal__resize"
            :aria-label="isExpanded ? '크기 축소' : '크기 확대'"
            @click="toggleExpanded"
          >
            <MaterialSymbol :name="isExpanded ? 'zoom_in_map' : 'zoom_out_map'" :size="16" alt="" />
          </button>
          <button type="button" class="chat-modal__close" @click="toggleOpen" aria-label="닫기">
            <MaterialSymbol name="close" :size="18" alt="" />
          </button>
        </div>
      </header>

      <div ref="chatBody" class="chat-modal__body">
        <div
          v-for="message in messages"
          :key="message.id"
          class="chat-bubble"
          :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <div
            v-if="message.role === 'assistant'"
            class="markdown-body chat-bubble-markdown"
            v-html="renderAssistantMarkdown(message.text)"
            @click="handleMarkdownClick"
          ></div>
          <div v-else>{{ message.text }}</div>
        </div>

        <div v-if="isReplying" class="chat-bubble is-assistant chat-bubble--loading" aria-live="polite">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>

      <form class="chat-modal__composer" @submit.prevent="sendMessage">
        <input
          ref="composerInput"
          v-model.trim="draft"
          type="text"
          placeholder="메시지를 입력하세요"
          :disabled="isReplying"
        />
        <button type="submit" class="btn btn--sm" :disabled="!draft || isReplying">전송</button>
      </form>
    </div>

    <button
      v-if="showTrigger"
      type="button"
      class="fab-main"
      :aria-expanded="String(isOpen)"
      :aria-label="buttonAriaLabel"
      @click="toggleOpen"
    >
      <MaterialSymbol :name="mainIcon" :size="24" alt="" />
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import MaterialSymbol from "./MaterialSymbol.vue";
import { createMarkdownRenderer } from "../lib/markdown";
import api from "../lib/axios";
import { useAssistantModalStore } from "../stores/assistantModalStore";

const props = defineProps({
  actions: {
    type: Array,
    default: () => [],
  },
  right: {
    type: Number,
    default: 8,
  },
  top: {
    type: Number,
    default: 8,
  },
  mainIcon: {
    type: String,
    default: "smart_toy",
  },
  closeIcon: {
    type: String,
    default: "close",
  },
  buttonAriaLabel: {
    type: String,
    default: "챗봇 열기",
  },
  menuAriaLabel: {
    type: String,
    default: "AI 챗봇",
  },
  fixed: {
    type: Boolean,
    default: true,
  },
  showTrigger: {
    type: Boolean,
    default: true,
  },
  projectId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(["toggle"]);
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const assistantModalStore = useAssistantModalStore();
const { isOpen } = storeToRefs(assistantModalStore);
const draft = ref("");
const isReplying = ref(false);
const isExpanded = ref(false);
const chatBody = ref(null);
const composerInput = ref(null);
const markdown = createMarkdownRenderer({ openLinksInNewTab: false });
const resolvedProjectId = computed(() => {
  const explicitId = Number(props.projectId);
  if (Number.isInteger(explicitId) && explicitId > 0) return explicitId;

  const routeId = Number(route.params?.projectId);
  if (Number.isInteger(routeId) && routeId > 0) return routeId;
  return null;
});
const messages = ref([
  {
    id: "boot",
    role: "assistant",
    text: `안녕하세요. **${props.menuAriaLabel}**입니다. 무엇을 도와드릴까요?`,
  },
]);
const MAX_HISTORY_ITEMS = 8;
const createBootMessage = () => ({
  id: "boot",
  role: "assistant",
  text: `안녕하세요. **${props.menuAriaLabel}**입니다. 무엇을 도와드릴까요?`,
});

const renderAssistantMarkdown = (text) => markdown.render(String(text || ""));

const handleMarkdownClick = async (event) => {
  const anchor = event.target?.closest?.("a");
  if (!anchor) return;

  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const href = String(anchor.getAttribute("href") || "").trim();
  if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) {
    return;
  }

  if (/^https?:\/\//i.test(href)) {
    event.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    if (href.startsWith("/")) {
      event.preventDefault();
      await router.push(href);
      close();
      return;
    }

    const parsed = new URL(href, window.location.origin);
    if (parsed.origin === window.location.origin) {
      event.preventDefault();
      await router.push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
      close();
    }
  } catch {
    // Keep default browser behavior if URL parsing fails.
  }
};

const extractErrorMessage = (error) => {
  const errorCode = String(error?.response?.data?.error_code || "").trim();
  if (errorCode === "ASSISTANT_QUOTA_EXCEEDED") {
    const retryAfter = Number(error?.response?.data?.retry_after_seconds);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return t("assistantChat.errors.quotaExceededWithRetry", { seconds: retryAfter });
    }
    return t("assistantChat.errors.quotaExceeded");
  }

  if (errorCode === "ASSISTANT_GENERATION_FAILED") {
    return t("assistantChat.errors.generationFailed");
  }

  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return String(serverMessage);
  if (error?.message) return String(error.message);
  return t("assistantChat.errors.default");
};

const scrollToBottom = async () => {
  await nextTick();
  if (!chatBody.value) return;
  chatBody.value.scrollTop = chatBody.value.scrollHeight;
};

const focusComposerInput = async () => {
  await nextTick();
  composerInput.value?.focus();
};

const open = () => {
  assistantModalStore.open();
  emit("toggle", true);
  scrollToBottom();
};

const close = () => {
  assistantModalStore.close();
  emit("toggle", false);
};

const toggleOpen = () => {
  assistantModalStore.toggle();
  emit("toggle", isOpen.value);
  if (isOpen.value) {
    scrollToBottom();
  } else {
    isExpanded.value = false;
  }
};

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const resetConversation = async () => {
  messages.value = [createBootMessage()];
  draft.value = "";
  isReplying.value = false;
  await scrollToBottom();
  await focusComposerInput();
};

defineExpose({
  open,
  close,
  toggle: toggleOpen,
});

const sendMessage = async () => {
  const text = String(draft.value || "").trim();
  if (!text || isReplying.value) return;

  messages.value.push({
    id: `u-${Date.now()}`,
    role: "user",
    text,
  });
  draft.value = "";
  isReplying.value = true;
  await scrollToBottom();

  try {
    const history = messages.value
      .filter(
        (item) =>
          (item.role === "user" || item.role === "assistant") && String(item.id || "") !== "boot"
      )
      .slice(-MAX_HISTORY_ITEMS)
      .map((item) => ({
        role: item.role,
        text: String(item.text || ""),
      }));

    const payload = {
      message: text,
      history,
      ...(resolvedProjectId.value ? { project_id: resolvedProjectId.value } : {}),
    };

    const response = await api.post("/assistant/chat", payload);
    const reply = String(response?.data?.text || "").trim();

    messages.value.push({
      id: `a-${Date.now()}`,
      role: "assistant",
      text: reply || "응답 본문이 비어 있습니다.",
    });
  } catch (error) {
    messages.value.push({
      id: `a-${Date.now()}`,
      role: "assistant",
      text: extractErrorMessage(error),
    });
  } finally {
    isReplying.value = false;
    await scrollToBottom();
    await focusComposerInput();
  }
};
</script>

<style scoped>
.fab-area {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.fab-area--fixed {
  position: fixed;
  right: var(--fab-right);
  top: calc(66px - var(--fab-top));
  z-index: 30;
}

.fab-area--inline {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.fab-main {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, black 10%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: var(--color-accent);
  box-shadow: none;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.fab-main:hover {
  background: var(--color-accent-hover);
  border-color: color-mix(in srgb, var(--color-accent-hover) 50%, black 10%);
}

.chat-modal {
  width: min(360px, calc(100vw - 24px));
  height: 420px;
  max-width: calc(100dvw - 16px);
  max-height: calc(100dvh - 16px);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  box-shadow: 0px 0px 8px 0px var(--color-border);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.chat-modal--inline {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
}

.chat-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
}

.chat-modal__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chat-modal__resize {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
}

.chat-modal__resize:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.chat-modal__new {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
}

.chat-modal__new:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.chat-modal__close {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
}

.chat-modal__close:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.chat-modal--expanded {
  width: min(calc(360px * 2), calc(100vw - 24px));
  height: min(calc(420px * 1.8), calc(100vh - 80px));
}

.fab-area--fixed .chat-modal {
  max-height: calc(100dvh - (66px - var(--fab-top)) - 16px);
}

.chat-modal__body {
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-bubble {
  max-width: 85%;
  font-size: 13px;
  line-height: 1;
  padding: 8px 10px;
  border-radius: 12px;
  white-space: pre-wrap;
}

.chat-bubble.is-assistant {
  background: var(--color-surface-alt);
  color: var(--color-text);
  align-self: flex-start;
}

.chat-bubble.is-user {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  align-self: flex-end;
}

.chat-bubble-markdown {
  line-height: 1.5;
}

.chat-bubble-markdown p {
  margin-bottom: 0;
}

.chat-bubble-markdown :deep(p) {
  margin: 0;
}

.chat-bubble-markdown :deep(ul) {
  margin: 4px 0 0;
  padding-left: 18px;
}

.chat-modal .chat-bubble-markdown :deep(a) {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

.chat-modal .chat-bubble-markdown :deep(a:hover) {
  color: var(--color-accent-hover);
}

.chat-bubble--loading {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 8px 12px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-text) 70%, transparent 30%);
  opacity: 0.35;
  animation: typingDotPulse 1.1s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typingDotPulse {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-1px);
  }
}

.chat-modal__composer {
  border-top: 1px solid var(--color-border);
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
}

.chat-modal__composer input {
  width: 100%;
  border: 1px solid var(--color-input-border);
  border-radius: 10px;
  padding: 8px 10px;
  background: var(--color-input-bg);
  color: var(--color-text);
  font-size: 13px;
}

@media (max-width: 900px) {
  .fab-area--fixed {
    right: 16px;
    top: 16px;
  }

  .chat-modal {
    width: min(360px, calc(100vw - 32px));
    height: min(420px, calc(100vh - 140px));
    max-width: calc(100dvw - 16px);
    max-height: calc(100dvh - 16px);
  }

  .chat-modal--expanded {
    width: min(calc(360px * 2), calc(100vw - 16px));
    height: min(calc(420px * 1.8), calc(100vh - 32px));
  }

  .fab-area--fixed .chat-modal {
    max-height: calc(100dvh - 32px);
  }
}
</style>
