import { createResource, For, Suspense } from "solid-js";
import { A } from "@solidjs/router"; // 링크 컴포넌트 추가
import api from "../lib/axios";

export default function IssueList(props: { boardId: number }) {
  const [issues, { refetch }] = createResource(
    () => props.boardId,
    async (id) => {
      const res = await api.get(`/board/${id}/issue`);
      return res.data.data;
    }
  );

  return (
    <div style={{ background: "#f4f4f4", padding: "10px", "border-radius": "8px" }}>
      <h4>Task List</h4>
      <Suspense fallback={<p>Loading...</p>}>
        <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
          <For each={issues()}>
            {(issue) => (
              <A
                href={`/issue/${issue.id}`} // 클릭 시 상세 페이지 이동
                style={{ "text-decoration": "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "white",
                    padding: "15px",
                    "border-radius": "4px",
                    "box-shadow": "0 2px 4px rgba(0,0,0,0.1)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ "font-weight": "bold", "margin-bottom": "5px" }}>{issue.title}</div>
                  <div style={{ "font-size": "0.8rem", color: "#666" }}>
                    상태: <span style={{ color: "#4A90E2" }}>{issue.status}</span>
                  </div>
                </div>
              </A>
            )}
          </For>
        </div>
      </Suspense>
    </div>
  );
}
