import { createResource, For, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";

const fetchChatRooms = async (projectId: string) => {
  // TODO: API 엔드포인트 구현 필요
  // const res = await api.get(`/project/${projectId}/chat/rooms`);
  // return res.data.data;
  return [];
};

function ChatLNB(props) {
  const [rooms] = createResource(() => props.projectId, fetchChatRooms);

  return (
    <div>
      <A href={`/project/${props.projectId}/chat/new`}>
        <button class="lnb-create-button chat">+ 대화방 생성</button>
      </A>

      <div>
        <h3 class="lnb-section-title">대화방 목록</h3>
        <Suspense fallback={<p class="lnb-loading">로딩 중...</p>}>
          <div class="lnb-list">
            <For
              each={rooms()}
              fallback={<p class="lnb-empty">대화방이 없습니다.</p>}
            >
              {(room) => (
                <A
                  href={`/project/${props.projectId}/chat/${room.id}`}
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
    </div>
  );
}

export default ChatLNB;
