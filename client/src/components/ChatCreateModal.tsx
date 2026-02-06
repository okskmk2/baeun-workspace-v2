import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import api from "../lib/axios";

function ChatCreateModal(props) {
  const [name, setName] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const navigate = useNavigate();

  const submit = async () => {
    setError(null);
    if (!name().trim()) {
      setError("대화방 이름을 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/chatroom`, {
        name: name().trim(),
        project_id: props.projectId,
      });
      if (res.data && res.data.success) {
        const room = res.data.data;
        // inform parent to refresh list
        props.onCreated && props.onCreated(room);
        props.onClose && props.onClose();
        // navigate to the new chatroom
        navigate(`/project/${props.projectId}/chat/${room.id}`);
      } else {
        setError(res.data?.message || "생성에 실패했습니다.");
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || "서버 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>대화방 생성</h2>
        </div>
        <div class="modal-body">
          <input
            type="text"
            placeholder="대화방 이름"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class="modal-input"
          />
          <Show when={error()}>
            <p class="modal-error">{error()}</p>
          </Show>
        </div>
        <div class="modal-footer">
          <button onClick={props.onClose} class="btn btn-secondary">
            취소
          </button>
          <button onClick={submit} class="btn btn-primary" disabled={loading()}>
            {loading() ? "생성중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatCreateModal;
