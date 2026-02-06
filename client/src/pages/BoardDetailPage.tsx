import { createResource, For, Suspense, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import { A } from "@solidjs/router";
import api from "../lib/axios";
import type { Issue } from "../lib/types";
import { getCurrentProjectId } from "../store/appStore";

const ISSUE_STATUSES = ["백로그", "진행중", "검토중", "완료"];

const fetchBoard = async (boardId: string) => {
  if (!boardId) return null;
  const res = await api.get(`/board/${boardId}`);
  return res.data.data || null;
};

const fetchIssues = async (boardId: string): Promise<Issue[]> => {
  if (!boardId) return [];
  const res = await api.get(`/board/${boardId}/issue`);
  return (res.data.data || []) as Issue[];
};

export default function BoardDetailPage() {
  const params = useParams();
  const [board] = createResource(() => params.boardId, fetchBoard);
  const [issues, { refetch }] = createResource<Issue[], string | undefined>(() => params.boardId, fetchIssues);
  const [draggedIssueId, setDraggedIssueId] = createSignal<number | null>(null);

  const getIssuesByStatus = (status: string) => {
    const allIssues = issues() || [];
    return allIssues.filter((issue) => issue.status === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "백로그":
        return "#f0f0f0";
      case "진행중":
        return "#fff3cd";
      case "검토중":
        return "#d1ecf1";
      case "완료":
        return "#d4edda";
      default:
        return "#f5f5f5";
    }
  };

  const handleDragStart = (issueId: number, e: DragEvent) => {
    setDraggedIssueId(issueId);
    const target = e.currentTarget as HTMLElement;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("issueId", String(issueId));
    }
    target.classList.add("dragging");
  };

  const handleDragEnd = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("dragging");
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    const columnElement = (e.currentTarget as HTMLElement).closest(".kanban-column");
    if (columnElement) {
      columnElement.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    const columnElement = (e.currentTarget as HTMLElement).closest(".kanban-column");
    if (columnElement && e.relatedTarget) {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!columnElement.contains(relatedTarget)) {
        columnElement.classList.remove("drag-over");
      }
    }
  };

  const handleDrop = async (newStatus: string, e: DragEvent) => {
    e.preventDefault();
    const columnElement = (e.currentTarget as HTMLElement).closest(".kanban-column");
    if (columnElement) {
      columnElement.classList.remove("drag-over");
    }

    const issueId = e.dataTransfer?.getData("issueId");

    if (!issueId) return;

    try {
      await api.patch(`/issue/${issueId}`, { status: newStatus });
      setDraggedIssueId(null);
      // 목록 새로고침
      refetch();
    } catch (error) {
      console.error("Failed to update issue status:", error);
      alert("상태 변경에 실패했습니다.");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", "flex-direction": "column" }}>
      {/* 상단 액션 바 */}
      <div
        class="flex-between p-lg"
        style={{ "border-bottom": "1px solid var(--color-border-light)" }}
      >
        <h2 style={{ margin: 0 }}>{board()?.name || "칸반보드"}</h2>
        <div class="flex-row gap-md">
          <button class="btn btn-primary btn-small">+ 이슈 생성</button>
          <button class="btn btn-secondary btn-small">보드 설정</button>
        </div>
      </div>

      {/* 칸반보드 */}
      <div class="kanban-board">
        <Suspense fallback={<p>로딩 중...</p>}>
          <For each={ISSUE_STATUSES}>
            {(status) => (
              <div
                class="kanban-column"
                style={{ "background-color": getStatusColor(status) }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(status, e)}
              >
                <div class="kanban-column-header">
                  <h3 class="kanban-column-title">{status}</h3>
                  <span class="kanban-column-count">{getIssuesByStatus(status).length}</span>
                </div>
                <div class="kanban-column-content">
                  <For
                    each={getIssuesByStatus(status)}
                    fallback={<p class="kanban-empty">이슈 없음</p>}
                  >
                    {(issue) => (
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(issue.id, e)}
                        onDragEnd={handleDragEnd}
                        classList={{
                          "kanban-card-wrapper": true,
                          "is-dragged": draggedIssueId() === issue.id,
                        }}
                      >
                          <A href={`/project/${getCurrentProjectId()}/issue/${issue.id}`}
                          class="kanban-card-link"
                        >
                          <div class="kanban-card">
                            <div class="kanban-card-title">{issue.title}</div>
                            <div class="kanban-card-meta">
                              <span class="kanban-card-status">{issue.status}</span>
                            </div>
                          </div>
                        </A>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </Suspense>
      </div>
    </div>
  );
}
