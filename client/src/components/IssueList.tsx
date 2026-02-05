import { createResource, For, Suspense } from "solid-js";
import api from "../lib/axios";

export default function IssueList(props: { boardId: number }) {
  const [issues, { refetch }] = createResource(
    () => props.boardId,
    async (id) => {
      const res = await api.get(`/issue/board/${id}`);
      return res.data.data;
    }
  );

  const updateStatus = async (issueId: number, newStatus: string) => {
    try {
      await api.patch(`/issue/${issueId}`, { status: newStatus });
      refetch(); // 목록 새로고침
    } catch (err) {
      alert("상태 변경 실패");
    }
  };

  return (
    <div style={{ background: "#f4f4f4", padding: "10px", "border-radius": "8px" }}>
      <h4>Task List</h4>
      <Suspense fallback={<li>Loading...</li>}>
        <For each={issues()}>
          {(issue) => (
            <div
              style={{
                background: "white",
                margin: "5px 0",
                padding: "10px",
                "border-radius": "4px",
                "box-shadow": "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ "font-weight": "bold" }}>{issue.title}</div>
              <div style={{ "font-size": "0.8rem", color: "#666" }}>상태: {issue.status}</div>

              <select
                value={issue.status}
                onChange={(e) => updateStatus(issue.id, e.currentTarget.value)}
                style={{ "margin-top": "5px" }}
              >
                <option value="백로그">백로그</option>
                <option value="진행중">진행중</option>
                <option value="완료">완료</option>
              </select>
            </div>
          )}
        </For>
      </Suspense>
    </div>
  );
}
