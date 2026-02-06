import { createResource, For, Suspense, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";
import { getBoardsForProject, setBoardsForProject, addBoard } from "../store/boardStore";

const fetchBoards = async (projectId: string) => {
  const res = await api.get(`/project/${projectId}/boards`);
  const boards = res.data.data;
  // API에서 가져온 보드를 store에 저장
  setBoardsForProject(projectId, boards);
  return boards;
};

function IssueLNB(props) {
  const [boardsResource] = createResource(() => props.projectId, fetchBoards);
  const [showModal, setShowModal] = createSignal(false);
  const [boardName, setBoardName] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  // Store의 보드 목록을 사용
  const getBoards = () => {
    // 처음에는 API에서 데이터가 로드될 때까지 대기, 이후 store에서 직접 읽기
    const stored = getBoardsForProject(props.projectId);
    const resource = boardsResource();
    
    // store에 데이터가 있으면 store 사용, 없으면 resource 사용
    return stored && stored.length > 0 ? stored : resource;
  };

  const handleCreateBoard = async (e: Event) => {
    e.preventDefault();
    if (!boardName().trim()) return;

    setLoading(true);
    try {
      const res = await api.post("/board", {
        name: boardName(),
        project_id: props.projectId,
        type: "KANBAN",
      });

      const newBoard = res.data.data;
      addBoard(props.projectId, newBoard);

      setBoardName("");
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "보드 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        class="lnb-create-button issue"
      >
        + 보드 생성
      </button>

      <div>
        <h3 class="lnb-section-title">보드 목록</h3>
        <Suspense fallback={<p class="lnb-loading">로딩 중...</p>}>
          <div class="lnb-list">
            <For
              each={getBoards()}
              fallback={<p class="lnb-empty">보드가 없습니다.</p>}
            >
              {(board) => (
                <A href={`/project/${props.projectId}/board/${board.id}`} class="lnb-item" activeClass="active">
                  {board.name}
                </A>
              )}
            </For>
          </div>
        </Suspense>
      </div>

      {/* 보드 생성 모달 */}
      {showModal() && (
        <div class="modal-overlay" onClick={() => setShowModal(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>📋 새 보드 만들기</h2>
            </div>
            <form onSubmit={handleCreateBoard}>
              <div class="modal-body">
                <div class="form-group">
                  <label>보드 이름</label>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="예: 개발 백로그, 업무 자동화 보드"
                    value={boardName()}
                    onInput={(e) => setBoardName(e.currentTarget.value)}
                    autofocus
                    required
                  />
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  class="btn"
                  disabled={loading()}
                >
                  취소
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={loading()}
                >
                  {loading() ? "생성 중..." : "보드 생성"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default IssueLNB;
