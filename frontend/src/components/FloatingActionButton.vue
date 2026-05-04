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
      :class="fixed ? 'chat-modal--fixed' : 'chat-modal--inline'"
      role="dialog"
      :aria-label="menuAriaLabel"
      aria-modal="false"
    >
      <header class="chat-modal__header">
        <strong>{{ menuAriaLabel }}</strong>
        <button type="button" class="chat-modal__close" @click="toggleOpen" aria-label="닫기">
          <MaterialSymbol name="close" :size="18" alt="" />
        </button>
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
          ></div>
          <div v-else>{{ message.text }}</div>
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
import { nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import MaterialSymbol from "./MaterialSymbol.vue";
import { createMarkdownRenderer } from "../lib/markdown";
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
});

const emit = defineEmits(["toggle"]);
const assistantModalStore = useAssistantModalStore();
const { isOpen } = storeToRefs(assistantModalStore);
const draft = ref("");
const isReplying = ref(false);
const chatBody = ref(null);
const composerInput = ref(null);
const markdown = createMarkdownRenderer();
const messages = ref([
  {
    id: "boot",
    role: "assistant",
    text: `안녕하세요. **${props.menuAriaLabel}**입니다. 무엇을 도와드릴까요?`,
  },
]);

const renderAssistantMarkdown = (text) => markdown.render(String(text || ""));

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
  }
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

  setTimeout(async () => {
    messages.value.push({
      id: `a-${Date.now()}`,
      role: "assistant",
      text: `요청을 확인했습니다.\n- 입력: ${text}\n- 상태: 프로토타입 데모 응답`,
    });
    isReplying.value = false;
    await scrollToBottom();
    await focusComposerInput();
  }, 350);
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
  line-height: 1;
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
  }
}
</style>
