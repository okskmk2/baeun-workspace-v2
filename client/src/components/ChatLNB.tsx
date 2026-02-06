import { createResource, For, Suspense, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";
import ChatCreateModal from "./ChatCreateModal";
import { ChatIcon } from "./icons";
import { getCurrentProjectId } from "../store/appStore";
import type { ChatRoom } from "../lib/types";

const fetchChatRooms = async (projectId: string): Promise<ChatRoom[]> => {
  if (!projectId) return [];
  const res = await api.get(`/chatroom`, { params: { project_id: projectId } });
  if (res.data && res.data.success) return res.data.data as ChatRoom[];
  return [];
};

function ChatLNB() {
  const [rooms, { refetch }] = createResource<ChatRoom[], string | undefined>(() => getCurrentProjectId(), fetchChatRooms);

  const [showModal, setShowModal] = createSignal(false);

  return (
    <div>
      <button class="lnb-create-button chat" onClick={() => setShowModal(true)}>
        <ChatIcon size={14} class="btn-icon" /> 대화방 생성
      </button>

      <div>
        <h3 class="lnb-section-title">대화방 목록</h3>
        <Suspense fallback={<p class="lnb-loading">로딩 중...</p>}>
          <div class="lnb-list">
            <For each={rooms()} fallback={<p class="lnb-empty">대화방이 없습니다.</p>}>
              {(room) => (
                <A
                  href={`/project/${getCurrentProjectId()}/chat/${room.id}`}
                  class="lnb-item"
                  activeClass="active"
                >
                  {room.name}
                </A>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      {showModal() && (
        <ChatCreateModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            try {
              refetch();
            } catch (e) {
              // ignore
            }
          }}
        />
      )}
    </div>
  );
}

export default ChatLNB;
