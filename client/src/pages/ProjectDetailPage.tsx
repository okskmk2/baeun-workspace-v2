import { createResource, For, Suspense, createSignal } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import api from "../lib/axios";
import type { Project, Member } from "../lib/types";
import { getCurrentProjectId } from "../store/appStore";
import type { Board, Page } from "../lib/types";

// 프로젝트 정보 페칭 함수
const fetchProject = async (projectId: string): Promise<Project | null> => {
  if (!projectId) return null;
  const res = await api.get(`/project/${projectId}`);
  return res.data.data as Project;
};

// 프로젝트 멤버 목록 페칭 함수
const fetchProjectMembers = async (projectId: string): Promise<Member[]> => {
  if (!projectId) return [];
  const res = await api.get(`/project/${projectId}/members`);
  return (res.data.data || []) as Member[];
};

// 워크스페이스 멤버 목록 페칭 함수
const fetchWorkspaceMembers = async (workspaceId: string) => {
  if (!workspaceId) return [];
  const res = await api.get(`/workspace/${workspaceId}/members`);
  return res.data.data || [];
};

export default function ProjectDetailPage() {
  const location = useLocation();
  const [project, { refetch: refetchProject }] = createResource<Project | null, string | undefined>(() => getCurrentProjectId(), fetchProject);
  const [projectMembers, { refetch: refetchMembers }] = createResource<Member[], string | undefined>(
    () => getCurrentProjectId(),
    fetchProjectMembers
  );
  
  /* Issue / Wiki main resources */
  const fetchBoards = async (projectId: string | undefined): Promise<Board[]> => {
    if (!projectId) return [];
    try {
      const res = await api.get(`/project/${projectId}/boards`);
      return (res.data.data || []) as Board[];
    } catch (e) {
      console.error("fetchBoards error", e);
      return [];
    }
  };

  const fetchPages = async (projectId: string | undefined): Promise<Page[]> => {
    if (!projectId) return [];
    try {
      const res = await api.get(`/project/${projectId}/pages`);
      return (res.data.data || []) as Page[];
    } catch (e) {
      console.error("fetchPages error", e);
      return [];
    }
  };

  const [boards] = createResource<Board[], string | undefined>(() => getCurrentProjectId(), fetchBoards);
  const [pages] = createResource<Page[], string | undefined>(() => getCurrentProjectId(), fetchPages);
  const isIssueRoute = () => location.pathname.includes("/issue");
  const isWikiRoute = () => location.pathname.includes("/wiki");
  const isIssueEmpty = () => isIssueRoute() && boards() && boards().length === 0;
  const isWikiEmpty = () => isWikiRoute() && pages() && pages().length === 0;
  const [activeTab, setActiveTab] = createSignal("info");
  const [showAddMemberModal, setShowAddMemberModal] = createSignal(false);
  const [workspaceMembers] = createResource(
    () => (showAddMemberModal() ? project()?.workspace_id?.toString() : undefined),
    fetchWorkspaceMembers
  );
  const [selectedMemberId, setSelectedMemberId] = createSignal<number | null>(null);
  const [editImgUrl, setEditImgUrl] = createSignal("");
  const [isSaving, setIsSaving] = createSignal(false);

  // 프로젝트에 아직 추가되지 않은 워크스페이스 멤버들만 필터링
  const availableMembers = () => {
    const wsMembers = workspaceMembers() || [];
    const pMembers = projectMembers() || [];
    const pMemberIds = new Set(pMembers.map((m) => m.id));
    return wsMembers.filter((m) => !pMemberIds.has(m.id));
  };

  const handleAddMember = async () => {
    const projectId = getCurrentProjectId();
    if (!selectedMemberId() || !projectId) return;

    try {
      await api.post(`/project/${projectId}/member`, {
        member_id: selectedMemberId(),
      });
      setSelectedMemberId(null);
      setShowAddMemberModal(false);
      refetchMembers();
    } catch (error) {
      console.error("Failed to add member:", error);
      alert("멤버 추가에 실패했습니다.");
    }
  };

  const handleSaveImgUrl = async () => {
    const projectId2 = getCurrentProjectId();
    if (!editImgUrl() || !projectId2) return;

    setIsSaving(true);
    try {
      await api.patch(`/project/${projectId2}`, {
        img_url: editImgUrl(),
      });
      setEditImgUrl("");
      refetchProject();
      alert("프로젝트 이미지가 업데이트되었습니다.");
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("이미지 업데이트에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <A href="/profile" class="back-link">
            ← 내 워크스페이스
          </A>
          {isIssueEmpty() ? (
            <>
              <h1 class="page-header-info">📋 이슈 보드</h1>
              <p>좌측의 보드를 선택하거나 새 보드를 만들어보세요.</p>
            </>
          ) : isWikiEmpty() ? (
            <>
              <h1 class="page-header-info">📚 위키 문서</h1>
              <p>위키 문서를 생성하여 내용을 추가해보세요.</p>
            </>
          ) : (
            <>
              <h1 class="page-header-info">📂 {project()?.name || "프로젝트 상세"}</h1>
              <p>Project ID: {getCurrentProjectId()}</p>
            </>
          )}
        </div>
      </header>

      {/* If route is /issue or /wiki, show section-specific header instead of tabs */}
      {location.pathname.includes("/issue") || location.pathname.includes("/wiki") ? null : (
        <nav class="tabs-nav">
          <button
            class={activeTab() === "info" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("info")}
          >
            ℹ️ 기본 정보
          </button>
          <button
            class={activeTab() === "members" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("members")}
          >
            👥 멤버
          </button>
        </nav>
      )}

      {/* 기본 정보 탭 (only when not viewing issue/wiki routes) */}
      {!location.pathname.includes("/issue") && !location.pathname.includes("/wiki") && activeTab() === "info" && (
        <section class="tab-content">
          <h3 class="section-title">프로젝트 기본 정보</h3>
          <div class="info-section">
            <div class="info-item">
              <label class="info-label">프로젝트명</label>
              <p class="info-value">{project()?.name || "-"}</p>
            </div>
            <div class="info-item">
              <label class="info-label">Created Date</label>
              <p class="info-value">
                {project()?.created_at
                  ? new Date(project()?.created_at).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div class="info-item">
              <label class="info-label">프로젝트 이미지 URL</label>
              <div class="info-edit">
                <input
                  type="text"
                  placeholder="이미지 URL을 입력하세요"
                  value={editImgUrl()}
                  onInput={(e) => setEditImgUrl(e.currentTarget.value)}
                  class="form-input"
                />
                <button
                  class="btn btn-primary btn-small"
                  onClick={handleSaveImgUrl}
                  disabled={!editImgUrl() || isSaving()}
                >
                  {isSaving() ? "저장 중..." : "저장"}
                </button>
              </div>
              {project()?.img_url && (
                <div class="preview-image">
                  <img
                    src={project()?.img_url}
                    alt="프로젝트 이미지"
                    class="project-thumbnail"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 멤버 탭 */}
      {!location.pathname.includes("/issue") && !location.pathname.includes("/wiki") && activeTab() === "members" && (
        <section class="tab-content">
          <div class="flex-between">
            <h3 class="section-title">프로젝트 멤버</h3>
            <button
              class="btn btn-secondary btn-small"
              onClick={() => setShowAddMemberModal(true)}
            >
              + 멤버 추가
            </button>
          </div>

          <Suspense fallback={<p>멤버를 불러오는 중...</p>}>
            <div class="member-list">
              <For
                each={projectMembers()}
                fallback={<p class="text-light">아직 멤버가 없습니다.</p>}
              >
                {(member) => (
                  <div class="member-item">
                    <div>
                      <strong>{member.name}</strong>
                      <span class="member-role">{member.role_name}</span>
                    </div>
                    <span class="member-email">{member.email}</span>
                  </div>
                )}
              </For>
            </div>
          </Suspense>
        </section>
      )}

      {/* Issue main view */}
      {location.pathname.includes("/issue") && !isIssueEmpty() && (
        <section class="tab-content">
          <div class="flex-between">
            <h3 class="section-title">이슈 보드</h3>
            <A href={`/project/${getCurrentProjectId()}/board/new`}>
              <button class="btn btn-primary">+ 새 보드 만들기</button>
            </A>
          </div>
          <Suspense fallback={<p>보드를 불러오는 중...</p>}>
            <div class="card-grid">
              <For each={boards()} fallback={<p class="text-light">보드가 없습니다.</p>}>
                {(b: Board) => (
                  <A href={`/project/${getCurrentProjectId()}/board/${b.id}`} class="card-link">
                    <div class="card">
                      <h3>{b.name}</h3>
                      <p class="text-light">{b.type || "KANBAN"}</p>
                    </div>
                  </A>
                )}
              </For>
            </div>
          </Suspense>
        </section>
      )}

      {/* Wiki main view */}
      {location.pathname.includes("/wiki") && !isWikiEmpty() && (
        <section class="tab-content">
          <div class="flex-between">
            <h3 class="section-title">위키 문서</h3>
            <A href={`/project/${getCurrentProjectId()}/wiki/new`}>
              <button class="btn btn-primary">+ 새 페이지 생성</button>
            </A>
          </div>
          <Suspense fallback={<p>위키 페이지를 불러오는 중...</p>}>
            <div class="lnb-list">
              <For each={pages()} fallback={<p class="text-light">페이지가 없습니다.</p>}>
                {(p: Page) => (
                  <A href={`/project/${getCurrentProjectId()}/wiki/${p.id}`} class="lnb-item">
                    {p.title}
                  </A>
                )}
              </For>
            </div>
          </Suspense>
        </section>
      )}

      {/* Empty state: Issue */}
      {isIssueEmpty() && (
        <section class="empty-state-container">
          <div class="empty-state">
            <p>보드가 없습니다. 좌측에서 보드를 선택하거나 새 보드를 만들어보세요.</p>
            <p class="text-light">또는 우측 상단의 버튼으로 새 보드를 생성할 수 있습니다.</p>
          </div>
        </section>
      )}

      {/* Empty state: Wiki */}
      {isWikiEmpty() && (
        <section class="empty-state-container">
          <div class="empty-state">
            <p>페이지가 없습니다. 새 페이지를 생성하여 위키를 시작하세요.</p>
            <p class="text-light">또는 우측 상단의 버튼으로 새 페이지를 생성할 수 있습니다.</p>
          </div>
        </section>
      )}

      {/* 멤버 추가 모달 */}
      {showAddMemberModal() && (
        <div class="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>프로젝트 멤버 추가</h3>
            <Suspense fallback={<p>멤버를 불러오는 중...</p>}>
              <select
                value={selectedMemberId() || ""}
                onChange={(e) => setSelectedMemberId(Number(e.currentTarget.value))}
                class="form-select"
              >
                <option value="">멤버를 선택하세요</option>
                <For each={availableMembers()}>
                  {(member) => (
                    <option value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  )}
                </For>
              </select>
            </Suspense>
            <div class="modal-actions">
              <button
                class="btn btn-primary"
                onClick={handleAddMember}
                disabled={!selectedMemberId()}
              >
                추가
              </button>
              <button
                class="btn btn-secondary"
                onClick={() => setShowAddMemberModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
