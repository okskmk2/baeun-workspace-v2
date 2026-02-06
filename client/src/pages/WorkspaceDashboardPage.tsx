import { createSignal, createResource, For, Show, Suspense } from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import WorkspaceMembers from "../components/WorkspaceMembers";

/**
 * 데이터 페칭 함수
 */
const fetchProjects = async (workspaceId) => {
  if (!workspaceId) return [];
  const res = await api.get(`/workspace/${workspaceId}`);
  return res.data.data;
};

export default function WorkspaceDashboardPage() {
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
    <div class="workspace-container">
      {/* 헤더 섹션 */}
      <header class="workspace-header">
        <h1>🚀 워크스페이스 관리</h1>
        <p>Workspace ID: {params.workspaceId}</p>
      </header>

      {/* 탭 메뉴 */}
      <nav class="tabs-nav">
        <button
          onClick={() => setActiveTab("projects")}
          classList={{ "tab-button": true, active: activeTab() === "projects" }}
        >
          📁 프로젝트 목록
        </button>
        <button
          onClick={() => setActiveTab("members")}
          classList={{ "tab-button": true, active: activeTab() === "members" }}
        >
          👥 멤버 관리
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          classList={{ "tab-button": true, active: activeTab() === "settings", danger: activeTab() === "settings" }}
        >
          ⚙️ 설정
        </button>
      </nav>

      {/* 컨텐츠 섹션 */}
      <main>
        {/* 1. 프로젝트 탭 */}
        <Show when={activeTab() === "projects"}>
          <div class="flex-between mb-lg">
            <A href={`/workspace/${params.workspaceId}/project/new`}>
              <button class="btn btn-primary btn-large">
                + 새 프로젝트 생성
              </button>
            </A>
          </div>

          <Suspense fallback={<p>프로젝트를 불러오는 중...</p>}>
            <div class="card-grid">
              <For
                each={projects()}
                fallback={<p class="text-light">아직 프로젝트가 없습니다.</p>}
              >
                {(project) => (
                  <A
                    href={`/project/${project.id}`}
                    class="card-link"
                  >
                    <div class="card">
                      <h3>{project.name}</h3>
                      <p>
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
          <div class="danger-zone">
            <h3>위험 구역 (Danger Zone)</h3>
            <p>
              워크스페이스를 삭제하면 해당 워크스페이스에 속한 모든 프로젝트, 보드, 이슈 및 채팅
              내역이
              <strong> 영구적으로 삭제</strong>되며 복구할 수 없습니다.
            </p>
            <button
              onClick={handleDeleteWorkspace}
              class="btn btn-danger btn-large mt-lg"
            >
              워크스페이스 영구 삭제
            </button>
          </div>
        </Show>
      </main>

      <footer class="footer">
        <A href="/profile" class="back-link">
          ← 내 워크스페이스 목록으로 돌아가기
        </A>
      </footer>
    </div>
  );
}
