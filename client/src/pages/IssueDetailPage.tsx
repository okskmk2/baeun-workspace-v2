import { createSignal, createResource, Suspense, For, Show } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import api from "../lib/axios";
import type { Issue } from "../lib/types";

export default function IssueDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal("");
  const [editContent, setEditContent] = createSignal("");

  // 이슈 상세 정보 가져오기
  const [issue, { refetch }] = createResource<Issue | null, string | undefined>(
    () => params.issueId,
    async (id) => {
      const res = await api.get(`/issue/${id}`);
      const data = res.data.data as Issue;
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
    <div class="issue-container">
      <Suspense fallback={<p>이슈 정보를 불러오는 중...</p>}>
        <Show when={issue()}>
          <header class="flex-between mb-lg">
            <button
              onClick={() => navigate(-1)}
              class="btn-link"
            >
              ← 뒤로 가기
            </button>
            <div class="flex-row gap-md">
              <button 
                onClick={() => setIsEditing(!isEditing())} 
                class="btn btn-primary"
              >
                {isEditing() ? "취소" : "수정"}
              </button>
              <button
                onClick={handleDelete}
                class="btn btn-danger btn-small"
              >
                삭제
              </button>
            </div>
          </header>

          <div class="card-content-box">
            <Show
              when={isEditing()}
              fallback={
                <>
                  <div class="flex-row gap-sm mb-md">
                    <span class="status-badge">
                      {issue().status}
                    </span>
                    <h1 class="mt-0">{issue().title}</h1>
                  </div>
                  <p class="issue-content">
                    {issue().content || "내용이 없습니다."}
                  </p>
                </>
              }
            >
              <div class="flex-col gap-sm">
                <input
                  type="text"
                  value={editTitle()}
                  onInput={(e) => setEditTitle(e.currentTarget.value)}
                  class="form-control"
                  style={{ "font-size": "1.5rem" }}
                />
                <textarea
                  value={editContent()}
                  onInput={(e) => setEditContent(e.currentTarget.value)}
                  class="form-control"
                  style={{ height: "200px" }}
                />
                <button
                  onClick={handleSave}
                  class="btn btn-success"
                >
                  저장하기
                </button>
              </div>
            </Show>

            <hr class="divider" />

            <section class="issue-section">
              <h3>상태 변경</h3>
              <div class="flex-row gap-sm">
                <For each={["백로그", "진행중", "완료"]}>
                  {(s) => (
                    <button
                      onClick={() => handleUpdateStatus(s)}
                      disabled={issue().status === s}
                      classList={{
                        "btn": true,
                        "btn-primary": issue().status === s,
                        "btn-default": issue().status !== s,
                      }}
                    >
                      {s}
                    </button>
                  )}
                </For>
              </div>
            </section>

            <section class="issue-section">
              <h3>담당자</h3>
              <div class="flex-row gap-md flex-wrap">
                <For
                  each={issue().members}
                  fallback={<p class="text-light">지정된 담당자가 없습니다.</p>}
                >
                  {(m) => (
                    <div class="card-badge">
                      {m.name}{" "}
                      <span style={{ "font-size": "0.8rem" }}>({m.role_name})</span>
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
