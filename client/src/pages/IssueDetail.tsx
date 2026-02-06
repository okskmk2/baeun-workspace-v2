import { createSignal, createResource, Suspense, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../lib/axios";

export default function IssueDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editContent, setEditContent] = createSignal("");

  // 이슈 상세 정보 가져오기
  const [issue, { refetch }] = createResource(
    () => params.issueId,
    async (id) => {
      const res = await api.get(`/issue/${id}`);
      const data = res.data.data;
      setEditTitle(data.title);
      setEditContent(data.content || "");
      return data;
    }
  );

  // 이슈 상태 업데이트 (PATCH)
  const handleUpdateStatus = async (status: string) => {
    try {
      await api.patch(`/issue/${params.issueId}`, { status });
      refetch();
    } catch (err) {
      alert("상태 변경 실패");
    }
  };

  // 이슈 내용 수정 저장
  const handleSave = async () => {
    try {
      await api.patch(`/issue/${params.issueId}`, {
        title: editTitle(),
        content: editContent(),
      });
      setIsEditing(false);
      refetch();
    } catch (err) {
      alert("수정 실패");
    }
  };

  // 이슈 삭제
  const handleDelete = async () => {
    if (!confirm("정말 이 이슈를 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/issue/${params.issueId}`);
      alert("삭제되었습니다.");
      navigate(-1); // 이전 페이지(보드 상세)로 이동
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    <div style={{ "max-width": "800px", margin: "40px auto", padding: "20px" }}>
      <Suspense fallback={<p>이슈 정보를 불러오는 중...</p>}>
        <Show when={issue()}>
          <header
            style={{ "margin-bottom": "20px", display: "flex", "justify-content": "space-between" }}
          >
            <button
              onClick={() => navigate(-1)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}
            >
              ← 뒤로 가기
            </button>
            <div>
              <button onClick={() => setIsEditing(!isEditing())} style={{ "margin-right": "10px" }}>
                {isEditing() ? "취소" : "수정"}
              </button>
              <button
                onClick={handleDelete}
                style={{
                  background: "#e74c3c",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  "border-radius": "4px",
                }}
              >
                삭제
              </button>
            </div>
          </header>

          <div
            style={{
              border: "1px solid #ddd",
              padding: "30px",
              "border-radius": "12px",
              background: "white",
            }}
          >
            <Show
              when={isEditing()}
              fallback={
                <>
                  <div
                    style={{
                      display: "flex",
                      "align-items": "center",
                      gap: "10px",
                      "margin-bottom": "10px",
                    }}
                  >
                    <span
                      style={{
                        background: "#eee",
                        padding: "4px 12px",
                        "border-radius": "20px",
                        "font-size": "0.85rem",
                      }}
                    >
                      {issue().status}
                    </span>
                    <h1 style={{ margin: 0 }}>{issue().title}</h1>
                  </div>
                  <p style={{ "white-space": "pre-wrap", color: "#333", "line-height": "1.6" }}>
                    {issue().content || "내용이 없습니다."}
                  </p>
                </>
              }
            >
              <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
                <input
                  type="text"
                  value={editTitle()}
                  onInput={(e) => setEditTitle(e.currentTarget.value)}
                  style={{ "font-size": "1.5rem", padding: "10px" }}
                />
                <textarea
                  value={editContent()}
                  onInput={(e) => setEditContent(e.currentTarget.value)}
                  style={{ height: "200px", padding: "10px" }}
                />
                <button
                  onClick={handleSave}
                  style={{ background: "#2ecc71", color: "white", padding: "10px", border: "none" }}
                >
                  저장하기
                </button>
              </div>
            </Show>

            <hr style={{ margin: "30px 0", border: "0", "border-top": "1px solid #eee" }} />

            <section>
              <h3>상태 변경</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <For each={["백로그", "진행중", "완료"]}>
                  {(s) => (
                    <button
                      onClick={() => handleUpdateStatus(s)}
                      disabled={issue().status === s}
                      style={{
                        padding: "8px 16px",
                        background: issue().status === s ? "#4A90E2" : "white",
                        color: issue().status === s ? "white" : "#333",
                        border: "1px solid #ddd",
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  )}
                </For>
              </div>
            </section>

            <section style={{ "margin-top": "30px" }}>
              <h3>담당자</h3>
              <div style={{ display: "flex", gap: "10px", "flex-wrap": "wrap" }}>
                <For
                  each={issue().members}
                  fallback={<p style={{ color: "#999" }}>지정된 담당자가 없습니다.</p>}
                >
                  {(m) => (
                    <div
                      style={{
                        padding: "5px 12px",
                        background: "#f0f0f0",
                        "border-radius": "4px",
                        "font-size": "0.9rem",
                      }}
                    >
                      {m.name}{" "}
                      <span style={{ color: "#888", "font-size": "0.8rem" }}>({m.role_name})</span>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
