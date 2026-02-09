<template>
  <hgroup>
    <div>
      <h1>{{ roomTitle }}</h1>
      <span class="room-status" :class="{ offline: !isConnected }">
        {{ isConnected ? "연결됨" : "연결 끊김" }}
      </span>
    </div>
    <div class="actions">
      <button type="button" class="btn btn--sm" @click="openInviteModal">초대하기</button>
      <button
        type="button"
        class="btn btn--danger btn--sm"
        :disabled="isDeleting"
        @click="deletechannel"
      >
        {{ isDeleting ? "삭제 중..." : "삭제" }}
      </button>
      <button type="button" class="btn btn--secondary btn--sm" @click="openMembersModal">
        참여자 확인
      </button>
    </div>
  </hgroup>

  <p v-if="deleteError" class="form-error">{{ deleteError }}</p>

  <div class="messages">
    <div
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="{ system: isSystemMessage(message) }"
    >
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
    <button type="submit" class="btn btn--sm" :disabled="isSending || !draft">전송</button>
  </form>

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

  <BaseModal :open="isMembersOpen" title="참여자 목록" @close="closeMembersModal">
    <div class="member-list">
      <p v-if="isMembersLoading" class="status">불러오는 중...</p>
      <p v-else-if="membersError" class="status error">{{ membersError }}</p>
      <p v-else-if="!chatMembers.length" class="status">참여자가 없습니다.</p>
      <ul v-else>
        <li v-for="member in chatMembers" :key="member.id">
          <span class="member-name">{{ member.name }}</span>
          <span class="member-meta">{{ member.email }}</span>
          <span class="member-role">{{ member.role_name }}</span>
        </li>
      </ul>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "../lib/axios";
import BaseModal from "../components/BaseModal.vue";
import { useProjectMemberStore } from "../stores/projectMemberStore";
import { useChatStore } from "../stores/chatStore";

const route = useRoute();
const router = useRouter();
const projectMemberStore = useProjectMemberStore();
const chatStore = useChatStore();
const roomId = computed(() => route.params.roomId);
const projectId = computed(() => route.params.projectId);
const workspaceId = computed(() => route.params.workspaceId);

const messages = ref([]);
const draft = ref("");
const isSending = ref(false);
const isConnected = ref(false);
const roomTitle = ref("채널");
let socket = null;
const isInviteOpen = ref(false);
const isInviting = ref(false);
const inviteError = ref("");
const projectMembers = computed(() =>
  projectMemberStore.getProjectMembers(projectId.value)
);
const selectedMemberId = ref("");
const isDeleting = ref(false);
const deleteError = ref("");
const isMembersOpen = ref(false);
const isMembersLoading = ref(false);
const membersError = ref("");
const chatMembers = ref([]);

const fetchchannelDetail = async () => {
  if (!roomId.value) {
    roomTitle.value = "채널";
    return;
  }

  try {
    const res = await api.get(`/channels/${roomId.value}`);
    roomTitle.value = res.data?.data?.name || "채널";
  } catch (error) {
    roomTitle.value = "채널";
  }
};

const fetchMessages = async () => {
  if (!roomId.value) return;
  const res = await api.get(`/channels/${roomId.value}/messages`);
  messages.value = res.data?.data || [];
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
    membersError.value = "참여자 목록을 불러오지 못했습니다.";
  } finally {
    isMembersLoading.value = false;
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
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isSystemMessage = (message) => {
  if (message?.message_type === "SYSTEM") return true;
  const content = message?.content || "";
  return /님이 .*님을 초대했습니다\.$/.test(content);
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
    inviteError.value = "초대할 멤버를 선택해 주세요.";
    return;
  }

  if (!roomId.value) {
    inviteError.value = "채널이 선택되지 않았습니다.";
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
    inviteError.value = error?.response?.data?.message || "초대에 실패했습니다.";
  } finally {
    isInviting.value = false;
  }
};

const deletechannel = async () => {
  if (!roomId.value) return;
  const confirmed = window.confirm("채널을 삭제할까요? 되돌릴 수 없습니다.");
  if (!confirmed) return;

  isDeleting.value = true;
  deleteError.value = "";

  try {
    await api.delete(`/channels/${roomId.value}`);
    if (socket) {
      socket.close();
      socket = null;
    }
    await chatStore.fetchRooms(projectId.value);
    await router.push(`/workspace/${workspaceId.value}/project/${projectId.value}/messenger`);
  } catch (error) {
    deleteError.value = error?.response?.data?.message || "채널 삭제에 실패했습니다.";
  } finally {
    isDeleting.value = false;
  }
};

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

.message.system {
  align-items: center;
  text-align: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f4f6;
}

.message.system .message-meta {
  display: none;
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
  margin-top: 8px;
}

.composer input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
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
  grid-template-columns: 1fr auto;
  gap: 4px 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
}

.member-name {
  font-weight: 600;
  color: #111827;
}

.member-meta {
  font-size: 12px;
  color: #6b7280;
}

.member-role {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  justify-self: end;
}

.status {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.status.error {
  color: #b91c1c;
}
</style>
