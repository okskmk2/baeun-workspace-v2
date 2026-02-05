import { createSignal, createResource, For, Show, Suspense } from "solid-js";
import { useParams, A } from "@solidjs/router";
import api from "../lib/axios";
import WorkspaceMembers from "./WorkspaceMembers"; // 이전에 만든 멤버 관리 컴포넌트

/**
 * 프로젝트 목록 데이터를 가져오는 페칭 함수
 */
const fetchProjects = async (workspaceId) => {
  if (!workspaceId) return [];
  const res = await api.get(`/workspace/workspace/${workspaceId}`);
  return res.data.data;
};

export default function WorkspaceDashboard() {
  const params = useParams();

  // 현재 활성화된 탭 상태 ("projects" 또는 "members")
  const [activeTab, setActiveTab] = createSignal("projects");

  // 워크스페이스 ID가 변경될 때마다 프로젝트 리소스를 갱신
  const [projects, { refetch }] = createResource(
    () => params.workspaceId,
    fetchProjects,
  );

  return (
    <div style={{ "max-width": "1200px", margin: "0 auto", padding: "20px" }}>
      {/* 1. 상단 워크스페이스 헤더 */}
      <header style={{ "margin-bottom": "30px" }}>
        <h2 style={{ margin: 0 }}>🚀 워크스페이스 관리</h2>
        <p style={{ color: "#666" }}>ID: {params.workspaceId}</p>
      </header>

      {/* 2. 탭 네비게이션 */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          "margin-bottom": "30px",
          "border-bottom": "1px solid #ddd",
        }}
      >
        <button
          onClick={() => setActiveTab("projects")}
          style={{
            padding: "10px 5px",
            border: "none",
            background: "none",
            cursor: "pointer",
            "font-weight": "bold",
            "border-bottom":
              activeTab() === "projects"
                ? "3px solid #4A90E2"
                : "3px solid transparent",
            color: activeTab() === "projects" ? "#4A90E2" : "#666",
          }}
        >
          📁 프로젝트 목록
        </button>
        <button
          onClick={() => setActiveTab("members")}
          style={{
            padding: "10px 5px",
            border: "none",
            background: "none",
            cursor: "pointer",
            "font-weight": "bold",
            "border-bottom":
              activeTab() === "members"
                ? "3px solid #4A90E2"
                : "3px solid transparent",
            color: activeTab() === "members" ? "#4A90E2" : "#666",
          }}
        >
          👥 멤버 관리
        </button>
      </div>

      {/* 3. 탭별 컨텐츠 영역 */}
      <main>
        {/* 프로젝트 탭 */}
        <Show when={activeTab() === "projects"}>
          <div
            style={{
              "margin-bottom": "20px",
              display: "flex",
              "justify-content": "flex-end",
            }}
          >
            <A href={`/workspace/${params.workspaceId}/project/new`}>
              <button
                style={{
                  padding: "10px 20px",
                  background: "#4A90E2",
                  color: "white",
                  border: "none",
                  "border-radius": "5px",
                  cursor: "pointer",
                }}
              >
                + 새 프로젝트 생성
              </button>
            </A>
          </div>

          <Suspense fallback={<p>프로젝트를 불러오는 중...</p>}>
            <div
              style={{
                display: "grid",
                "grid-template-columns":
                  "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              <For
                each={projects()}
                fallback={
                  <p>프로젝트가 없습니다. 첫 프로젝트를 생성해보세요!</p>
                }
              >
                {(project) => (
                  <A
                    href={`/project/${project.id}`}
                    style={{ "text-decoration": "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        padding: "20px",
                        border: "1px solid #eee",
                        "border-radius": "10px",
                        background: "white",
                        "box-shadow": "0 2px 5px rgba(0,0,0,0.05)",
                      }}
                    >
                      <h4 style={{ margin: "0 0 10px 0" }}>{project.name}</h4>
                      <p style={{ "font-size": "0.8rem", color: "#888" }}>
                        생성일:{" "}
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </A>
                )}
              </For>
            </div>
          </Suspense>
        </Show>

        {/* 멤버 관리 탭 */}
        <Show when={activeTab() === "members"}>
          <WorkspaceMembers />
        </Show>
      </main>

      {/* 4. 뒤로 가기 */}
      <footer style={{ "margin-top": "40px" }}>
        <A href="/profile" style={{ color: "#888", "text-decoration": "none" }}>
          ← 내 프로필(워크스페이스 목록)로 돌아가기
        </A>
      </footer>
    </div>
  );
}
