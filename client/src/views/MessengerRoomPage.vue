<template>
  <main class="messenger-room">
    <div class="room-header">
      <h1>채팅방</h1>
      <span class="room-status" :class="{ offline: !isConnected }">
        {{ isConnected ? "연결됨" : "연결 끊김" }}
      </span>
      <button type="button" class="btn btn--sm" @click="openInviteModal">초대하기</button>
    </div>

    <div class="messages">
      <div v-for="message in messages" :key="message.id" class="message">
        <div class="message-content">{{ message.content }}</div>
        <div class="message-meta">
          {{ message.creator_name || "알수없음" }} · {{ formatTime(message.created_at) }}
        </div>
      </div>
      <p v-if="!messages.length" class="empty">메시지가 없습니다.</p>
    </div>

    <form class="composer" @submit.prevent="sendMessage">
      <input
        v-model.trim="draft"
        type="text"
        placeholder="메시지를 입력하세요"
        :disabled="isSending"
      />
      <button type="submit" class="btn btn--sm" :disabled="isSending || !draft">
        전송
      </button>
    </form>
  </main>

  <BaseModal :open="isInviteOpen" title="멤버 초대" @close="closeInviteModal">
    <form class="modal-form" @submit.prevent="inviteMember">
      <label for="invite-member">프로젝트 구성원</label>
      <select id="invite-member" v-model="selectedMemberId">
        <option value="">선택하세요</option>
        <option v-for="member in projectMembers" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.email }})
        </option>
      </select>
      <p v-if="inviteError" class="form-error">{{ inviteError }}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" @click="closeInviteModal">취소</button>
        <button type="submit" class="btn" :disabled="isInviting">
          {{ isInviting ? "초대 중..." : "초대" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";

const route = useRoute();
const roomId = computed(() => route.params.roomId);
const projectId = computed(() => route.params.projectId);

const messages = ref([]);
const draft = ref("");
const isSending = ref(false);
const isConnected = ref(false);
let socket = null;
const isInviteOpen = ref(false);
const isInviting = ref(false);
const inviteError = ref("");
const projectMembers = ref([]);
const selectedMemberId = ref("");

const fetchMessages = async () => {
  if (!roomId.value) return;
  const res = await api.get(`/chatroom/${roomId.value}/messages`);
  messages.value = res.data?.data || [];
};

const fetchProjectMembers = async () => {
  if (!projectId.value) {
    projectMembers.value = [];
    return;
  }

  try {
    const res = await api.get(`/project/${projectId.value}/members`);
    projectMembers.value = res.data?.data || [];
  } catch (error) {
    projectMembers.value = [];
  }
};

const connectSocket = () => {
  if (socket) {
    socket.close();
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  socket = new WebSocket(`${protocol}://${window.location.hostname}:3000/ws`);

  socket.addEventListener("open", () => {
    isConnected.value = true;
    if (roomId.value) {
      socket.send(JSON.stringify({ type: "join", chatroomId: roomId.value }));
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
      chatroomId: roomId.value,
      content: draft.value,
    })
  );
  draft.value = "";
  isSending.value = false;
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const openInviteModal = async () => {
  inviteError.value = "";
  selectedMemberId.value = "";
  isInviteOpen.value = true;
  await fetchProjectMembers();
};

const closeInviteModal = () => {
  isInviteOpen.value = false;
};

const inviteMember = async () => {
  if (!selectedMemberId.value) {
    inviteError.value = "초대할 멤버를 선택해주세요.";
    return;
  }

  if (!roomId.value) {
    inviteError.value = "대화방이 선택되지 않았습니다.";
    return;
  }

  isInviting.value = true;
  inviteError.value = "";

  try {
    await api.post(`/chatroom/${roomId.value}/invite`, {
      member_id: selectedMemberId.value,
    });
    closeInviteModal();
  } catch (error) {
    inviteError.value = error?.response?.data?.message || "초대에 실패했습니다.";
  } finally {
    isInviting.value = false;
  }
};

onMounted(async () => {
  await fetchMessages();
  connectSocket();
});

watch(roomId, async () => {
  await fetchMessages();
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ type: "join", chatroomId: roomId.value }));
  }
});

watch(projectId, fetchProjectMembers);

onBeforeUnmount(() => {
  if (socket) {
    socket.close();
    socket = null;
  }
});
</script>

<style scoped>
.messenger-room {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.messenger-room h1 {
  margin: 0;
  font-size: 20px;
}

.room-status {
  font-size: 12px;
  color: #16a34a;
}

.room-status.offline {
  color: #b91c1c;
}

.messages {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #ffffff;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-content {
  font-size: 14px;
  color: #111827;
}

.message-meta {
  font-size: 12px;
  color: #6b7280;
}

.empty {
  margin: 0;
  color: #9ca3af;
}

.composer {
  display: flex;
  gap: 8px;
}

.composer input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}
</style>
