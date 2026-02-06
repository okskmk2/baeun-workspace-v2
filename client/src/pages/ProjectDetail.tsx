import { createResource, For, Suspense, createSignal } from "solid-js";
import { useParams, A } from "@solidjs/router";
import api from "../lib/axios";

// 프로젝트 정보 페칭 함수
const fetchProject = async (projectId: string) => {
  if (!projectId) return null;
  const res = await api.get(`/project/${projectId}`);
  return res.data.data;
};

// 보드 목록 페칭 함수
const fetchBoards = async (projectId: string) => {
  if (!projectId) return [];
  const res = await api.get(`/project/${projectId}/boards`);
  return res.data.data || [];
};

// 프로젝트 멤버 목록 페칭 함수
const fetchProjectMembers = async (projectId: string) => {
  if (!projectId) return [];
  const res = await api.get(`/project/${projectId}/members`);
  return res.data.data || [];
};

// 워크스페이스 멤버 목록 페칭 함수
const fetchWorkspaceMembers = async (workspaceId: string) => {
  if (!workspaceId) return [];
  const res = await api.get(`/workspace/${workspaceId}/members`);
  return res.data.data || [];
};

export default function ProjectDetail() {
  const params = useParams();
  const [project] = createResource(() => params.projectId, fetchProject);
  const [boards] = createResource(() => params.projectId, fetchBoards);
  const [projectMembers, { refetch: refetchMembers }] = createResource(
    () => params.projectId,
    fetchProjectMembers
  );
  const [showAddMemberModal, setShowAddMemberModal] = createSignal(false);
  const [workspaceMembers] = createResource(
    () => showAddMemberModal() ? project()?.workspace_id?.toString() : undefined,
    fetchWorkspaceMembers
  );
  const [selectedMemberId, setSelectedMemberId] = createSignal<number | null>(null);

  // 프로젝트에 아직 추가되지 않은 워크스페이스 멤버들만 필터링
  const availableMembers = () => {
    const wsMembers = workspaceMembers() || [];
    const pMembers = projectMembers() || [];
    const pMemberIds = new Set(pMembers.map((m) => m.id));
    return wsMembers.filter((m) => !pMemberIds.has(m.id));
  };

  const handleAddMember = async () => {
    if (!selectedMemberId() || !params.projectId) return;

    try {
      await api.post(`/project/${params.projectId}/member`, {
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

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <A href="/profile" class="back-link">
            ← 내 워크스페이스
          </A>
          <h1 class="page-header-info">📂 {project()?.name || "프로젝트 상세"}</h1>
          <p>Project ID: {params.projectId}</p>
        </div>

        {/* 보드 생성 화면으로 이동하는 버튼 */}
        <A href={`/project/${params.projectId}/board/new`}>
          <button class="btn btn-primary btn-large">
            + 새 보드 만들기
          </button>
        </A>
      </header>

      {/* 프로젝트 멤버 섹션 */}
      <section>
        <div class="flex-between">
          <h3 class="section-title">👥 프로젝트 멤버</h3>
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

      {/* 보드 목록 섹션 */}
      <section>
        <h3 class="section-title">
          📋 보드 목록
        </h3>
        <Suspense fallback={<p>보드를 불러오는 중...</p>}>
          <div class="card-grid">
            <For
              each={boards()}
              fallback={<p class="text-light">아직 생성된 보드가 없습니다.</p>}
            >
              {(board) => (
                <A
                  href={`/project/${params.projectId}/board/${board.id}`}
                  class="card-link"
                >
                  <div class="card">
                    <h4>{board.name}</h4>
                    <span class="card-badge">
                      {board.type}
                    </span>
                  </div>
                </A>
              )}
            </For>
          </div>
        </Suspense>
      </section>
    </div>
  );
}
