import { createSignal, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import IssueList from "../components/IssueList"; // IssueList 컴포넌트 임포트

export default function BoardDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [showForm, setShowForm] = createSignal(false);
  const [filterTab, setFilterTab] = createSignal("all"); // "all", "mine", "created"

  // IssueList의 refetch를 트리거하기 위한 변수 (필요 시)
  let issueListRef: any;

  // 이슈 생성 핸들러
  const handleCreateIssue = async (e: Event) => {
    e.preventDefault();
    try {
      await api.post("/issue", {
        title: title(),
        content: content(),
        board_id: params.boardId,
      });
      alert("이슈가 생성되었습니다.");
      setTitle("");
      setContent("");
      setShowForm(false);

      // 생성 후 목록을 새로고침하기 위해 페이지를 재로드하거나
      // IssueList 내부의 refetch를 호출하는 로직이 필요할 수 있습니다.
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || "생성 실패");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", "flex-direction": "column" }}>
      {/* 상단 필터 및 액션 바 */}
      <div class="flex-between p-lg" style={{ "border-bottom": "1px solid var(--color-border-light)" }}>
        <div class="flex-row gap-md">
          <button
            onClick={() => setFilterTab("all")}
            classList={{
              "filter-button": true,
              active: filterTab() === "all",
            }}
          >
            모두 이슈
          </button>
          <button
            onClick={() => setFilterTab("mine")}
            classList={{
              "filter-button": true,
              active: filterTab() === "mine",
            }}
          >
            나의 이슈
          </button>
          <button
            onClick={() => setFilterTab("created")}
            classList={{
              "filter-button": true,
              active: filterTab() === "created",
            }}
          >
            내가 만든 이슈
          </button>
        </div>
        <div class="flex-row gap-md">
          <button
            onClick={() => setShowForm(true)}
            class="btn btn-primary btn-small"
          >
            이슈 생성
          </button>
          <button class="btn btn-secondary btn-small">
            보드 설정
          </button>
        </div>
      </div>

      {/* 이슈 생성 모달 */}
      {showForm() && (
        <div class="modal-overlay" onClick={() => setShowForm(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h2>🎯 새 이슈 생성</h2>
            </div>
            <form onSubmit={handleCreateIssue}>
              <div class="modal-body">
                <div class="form-group">
                  <label>이슈 제목</label>
                  <input
                    type="text"
                    placeholder="예: 로그인 기능 개발"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    required
                    class="form-control"
                    autofocus
                  />
                </div>
                <div class="form-group">
                  <label>상세 내용</label>
                  <textarea
                    placeholder="이슈에 대한 상세 설명을 입력하세요"
                    value={content()}
                    onInput={(e) => setContent(e.currentTarget.value)}
                    class="form-control"
                    style={{ height: "120px" }}
                  />
                </div>
              </div>
              <div class="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  class="btn"
                >
                  취소
                </button>
                <button
                  type="submit"
                  class="btn btn-success"
                >
                  이슈 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 이슈 리스트 */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        <IssueList 
          boardId={Number(params.boardId)} 
          projectId={params.projectId}
          filter={filterTab()} 
        />
      </div>
    </div>
  );
}
