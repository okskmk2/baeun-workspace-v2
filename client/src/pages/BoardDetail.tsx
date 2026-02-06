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
    <div style={{ "max-width": "800px", margin: "0 auto", padding: "20px" }}>
      <header
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "margin-bottom": "30px",
        }}
      >
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666",
              "margin-bottom": "10px",
            }}
          >
            ← 뒤로 가기
          </button>
          <h1>📋 보드 상세</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm())}
          style={{
            padding: "10px 15px",
            background: "#4A90E2",
            color: "white",
            border: "none",
            "border-radius": "5px",
            cursor: "pointer",
          }}
        >
          {showForm() ? "취oc" : "+ 새 이슈"}
        </button>
      </header>

      {/* 이슈 생성 폼 */}
      {showForm() && (
        <form
          onSubmit={handleCreateIssue}
          style={{
            background: "#f9f9f9",
            padding: "20px",
            "border-radius": "8px",
            "margin-bottom": "30px",
          }}
        >
          <div style={{ "margin-bottom": "10px" }}>
            <input
              type="text"
              placeholder="이슈 제목"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              required
              style={{ width: "100%", padding: "10px", "box-sizing": "border-box" }}
            />
          </div>
          <div style={{ "margin-bottom": "10px" }}>
            <textarea
              placeholder="상세 내용"
              value={content()}
              onInput={(e) => setContent(e.currentTarget.value)}
              style={{
                width: "100%",
                padding: "10px",
                height: "100px",
                "box-sizing": "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              background: "#2ecc71",
              color: "white",
              border: "none",
              "border-radius": "5px",
            }}
          >
            이슈 등록
          </button>
        </form>
      )}

      {/* 통합된 이슈 리스트 컴포넌트 */}
      <section>
        <IssueList boardId={Number(params.boardId)} />
      </section>
    </div>
  );
}
