import { createResource, For, Suspense, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import api from "../lib/axios";

const fetchChatroom = async (chatroomId: string) => {
  if (!chatroomId) return null;
  try {
    const res = await api.get(`/chatroom/${chatroomId}`);
    if (res.data && res.data.success) return res.data.data;
  } catch (e) {
    console.error("Failed to fetch chatroom:", e);
  }
  return null;
};

const fetchMessages = async (chatroomId: string) => {
  if (!chatroomId) return [];
  try {
    const res = await api.get(`/chatroom/${chatroomId}/messages`);
    if (res.data && res.data.success) return res.data.data;
  } catch (e) {
    console.error("Failed to fetch messages:", e);
  }
  return [];
};

function ChatRoomDetail() {
  const params = useParams();
  const [chatroom] = createResource(() => params.chatroomId, fetchChatroom);
  const [messages] = createResource(() => params.chatroomId, fetchMessages);
  const [messageInput, setMessageInput] = createSignal("");
  const [sending, setSending] = createSignal(false);

  const handleSendMessage = async (e: Event) => {
    e.preventDefault();
    const content = messageInput().trim();
    if (!content) return;

    setSending(true);
    try {
      // TODO: Implement message send API
      // await api.post(`/chatroom/${params.chatroomId}/messages`, { content });
      setMessageInput("");
      // TODO: Refetch messages after successful send
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div class="chatroom-container">
      <div class="chatroom-header">
        <Suspense fallback={<h2>로딩 중...</h2>}>
          <h2>{chatroom()?.name || "대화방"}</h2>
        </Suspense>
      </div>

      <div class="chatroom-messages">
        <Suspense fallback={<p class="loading">메시지 로딩 중...</p>}>
          <For
            each={messages()}
            fallback={<p class="empty-state">아직 메시지가 없습니다.</p>}
          >
            {(msg) => (
              <div class="message-item">
                <div class="message-avatar">
                  {msg.creator_img ? (
                    <img src={msg.creator_img} alt={msg.creator_name} />
                  ) : (
                    <div class="avatar-placeholder">{msg.creator_name?.[0] || "?"}</div>
                  )}
                </div>
                <div class="message-body">
                  <div class="message-header">
                    <span class="message-author">{msg.creator_name || "Unknown"}</span>
                    <span class="message-time">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div class="message-content">{msg.content}</div>
                </div>
              </div>
            )}
          </For>
        </Suspense>
      </div>

      <form class="chatroom-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={messageInput()}
          onInput={(e) => setMessageInput(e.currentTarget.value)}
          placeholder="메시지를 입력하세요..."
          class="message-input"
          disabled={sending()}
        />
        <button type="submit" class="message-send-btn" disabled={sending()}>
          {sending() ? "전송중..." : "전송"}
        </button>
      </form>
    </div>
  );
}

export default ChatRoomDetail;
