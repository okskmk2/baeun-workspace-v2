import { createSignal, createResource, For, Show, Suspense } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import WorkspaceMembers from "./WorkspaceMembers";

/**
 * 데이터 페칭 함수
 */
const fetchProjects = async (workspaceId) => {
  if (!workspaceId) return [];
  const res = await api.get(`/workspace/${workspaceId}`);
  return res.data.data;
};

export default function WorkspaceDashboard() {
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = createSignal("projects");

  // 프로젝트 목록 리소스
  const [projects, { refetch }] = createResource(() => params.workspaceId, fetchProjects);

  /**
   * 워크스페이스 삭제 로직
   */
  const handleDeleteWorkspace = async () => {
    const confirmDelete = confirm(
      "경고: 워크스페이스를 삭제하면 모든 프로젝트, 멤버, 데이터가 영구적으로 삭제됩니다.\n정말로 삭제하시겠습니까?"
    );

    if (confirmDelete) {
      try {
        await api.delete(`/workspace/${params.workspaceId}`);
        alert("워크스페이스가 삭제되었습니다.");
        navigate("/profile");
      } catch (err) {
        alert(err.response?.data?.message || "삭제 권한이 없거나 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div style={{ "max-width": "1200px", margin: "0 auto", padding: "40px 20px" }}>
      {/* 헤더 섹션 */}
      <header style={{ "margin-bottom": "40px" }}>
        <h1 style={{ margin: 0, "font-size": "2rem" }}>🚀 워크스페이스 관리</h1>
        <p style={{ color: "#888" }}>Workspace ID: {params.workspaceId}</p>
      </header>

      {/* 탭 메뉴 */}
      <nav
        style={{
          display: "flex",
          gap: "30px",
          "margin-bottom": "30px",
          "border-bottom": "1px solid #eee",
        }}
      >
        <button
          onClick={() => setActiveTab("projects")}
          style={{
            padding: "15px 5px",
            border: "none",
            background: "none",
            cursor: "pointer",
            "font-weight": "600",
            "border-bottom":
              activeTab() === "projects" ? "3px solid #4A90E2" : "3px solid transparent",
            color: activeTab() === "projects" ? "#4A90E2" : "#666",
          }}
        >
          📁 프로젝트 목록
        </button>
        <button
          onClick={() => setActiveTab("members")}
          style={{
            padding: "15px 5px",
            border: "none",
            background: "none",
            cursor: "pointer",
            "font-weight": "600",
            "border-bottom":
              activeTab() === "members" ? "3px solid #4A90E2" : "3px solid transparent",
            color: activeTab() === "members" ? "#4A90E2" : "#666",
          }}
        >
          👥 멤버 관리
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          style={{
            padding: "15px 5px",
            border: "none",
            background: "none",
            cursor: "pointer",
            "font-weight": "600",
            "border-bottom":
              activeTab() === "settings" ? "3px solid #e74c3c" : "3px solid transparent",
            color: activeTab() === "settings" ? "#e74c3c" : "#666",
          }}
        >
          ⚙️ 설정
        </button>
      </nav>

      {/* 컨텐츠 섹션 */}
      <main style={{ "min-height": "400px" }}>
        {/* 1. 프로젝트 탭 */}
        <Show when={activeTab() === "projects"}>
          <div
            style={{
              display: "flex",
              "justify-content": "flex-end",
              "margin-bottom": "20px",
            }}
          >
            <A href={`/workspace/${params.workspaceId}/project/new`}>
              <button
                style={{
                  padding: "10px 20px",
                  background: "#4A90E2",
                  color: "white",
                  border: "none",
                  "border-radius": "6px",
                  cursor: "pointer",
                  "font-weight": "bold",
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
                "grid-template-columns": "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              <For
                each={projects()}
                fallback={<p style={{ color: "#999" }}>아직 프로젝트가 없습니다.</p>}
              >
                {(project) => (
                  <A
                    href={`/project/${project.id}`}
                    style={{ "text-decoration": "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        padding: "24px",
                        border: "1px solid #eee",
                        "border-radius": "12px",
                        background: "white",
                        "box-shadow": "0 4px 6px rgba(0,0,0,0.02)",
                        transition: "transform 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>{project.name}</h3>
                      <p
                        style={{
                          "font-size": "0.85rem",
                          color: "#888",
                          margin: 0,
                        }}
                      >
                        생성일: {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </A>
                )}
              </For>
            </div>
          </Suspense>
        </Show>

        {/* 2. 멤버 관리 탭 */}
        <Show when={activeTab() === "members"}>
          <WorkspaceMembers />
        </Show>

        {/* 3. 설정 탭 (삭제 포함) */}
        <Show when={activeTab() === "settings"}>
          <div
            style={{
              padding: "30px",
              border: "1px solid #ffcece",
              "border-radius": "12px",
              "background-color": "#fffafa",
            }}
          >
            <h3 style={{ color: "#e74c3c", "margin-top": 0 }}>위험 구역 (Danger Zone)</h3>
            <p style={{ color: "#666", "line-height": "1.6" }}>
              워크스페이스를 삭제하면 해당 워크스페이스에 속한 모든 프로젝트, 보드, 이슈 및 채팅
              내역이
              <strong> 영구적으로 삭제</strong>되며 복구할 수 없습니다.
            </p>
            <button
              onClick={handleDeleteWorkspace}
              style={{
                "margin-top": "20px",
                padding: "12px 24px",
                background: "#e74c3c",
                color: "white",
                border: "none",
                "border-radius": "6px",
                cursor: "pointer",
                "font-weight": "bold",
              }}
            >
              워크스페이스 영구 삭제
            </button>
          </div>
        </Show>
      </main>

      <footer
        style={{
          "margin-top": "60px",
          "border-top": "1px solid #eee",
          "padding-top": "20px",
        }}
      >
        <A href="/profile" style={{ color: "#4A90E2", "text-decoration": "none" }}>
          ← 내 워크스페이스 목록으로 돌아가기
        </A>
      </footer>
    </div>
  );
}
