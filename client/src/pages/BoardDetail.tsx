import { createSignal, createResource, For, Suspense } from "solid-js";
import { useParams } from "@solidjs/router";
import api from "../lib/axios";

export default function BoardDetail() {
  const params = useParams();
  const [title, setTitle] = createSignal("");
  const [content, setContent] = createSignal("");
  const [showForm, setShowForm] = createSignal(false);

  // 이슈 목록 가져오기
  const fetchIssues = async (boardId: string) => {
    const res = await api.get(`/board/${boardId}/issue`);
    return res.data.data;
  };

  const [issues, { refetch }] = createResource(() => params.boardId, fetchIssues);

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
      refetch(); // 목록 새로고침
    } catch (err: any) {
      alert(err.response?.data?.message || "생성 실패");
    }
  };

  return (
    <div style={{ "max-width": "800px", margin: "0 auto", padding: "20px" }}>
      <header
        style={{
          display: "flex",
          "justify-content": "between",
          "align-items": "center",
          "margin-bottom": "30px",
        }}
      >
        <h1>📋 보드 상세</h1>
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
          {showForm() ? "취소" : "+ 새 이슈"}
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

      {/* 이슈 목록 */}
      <Suspense fallback={<p>이슈를 불러오는 중...</p>}>
        <div style={{ display: "flex", "flex-direction": "column", gap: "15px" }}>
          <For each={issues()} fallback={<p style={{ color: "#999" }}>등록된 이슈가 없습니다.</p>}>
            {(issue) => (
              <div
                style={{
                  padding: "15px",
                  border: "1px solid #ddd",
                  "border-radius": "8px",
                  background: "white",
                }}
              >
                <div style={{ display: "flex", "justify-content": "space-between" }}>
                  <h3 style={{ margin: "0 0 10px 0" }}>{issue.title}</h3>
                  <span
                    style={{
                      "font-size": "0.8rem",
                      background: "#eee",
                      padding: "2px 8px",
                      "border-radius": "10px",
                      height: "fit-content",
                    }}
                  >
                    {issue.status}
                  </span>
                </div>
                <p style={{ margin: "0", color: "#666", "white-space": "pre-wrap" }}>
                  {issue.content}
                </p>
                <small style={{ color: "#aaa", display: "block", "margin-top": "10px" }}>
                  생성일: {new Date(issue.created_at).toLocaleString()}
                </small>
              </div>
            )}
          </For>
        </div>
      </Suspense>
    </div>
  );
}
