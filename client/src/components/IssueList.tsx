import { createResource, For, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";

export default function IssueList(props: { boardId: number; projectId?: string; filter?: string }) {
  const [issues, { refetch }] = createResource(
    () => props.boardId,
    async (id) => {
      const res = await api.get(`/board/${id}/issue`);
      return res.data.data || [];
    }
  );

  // 필터링된 이슈 목록
  const filteredIssues = () => {
    const allIssues = issues() || [];
    return allIssues;
  };

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div class="issue-card-grid">
        <For each={filteredIssues()}>
          {(issue) => {
            const href = props.projectId 
              ? `/project/${props.projectId}/issue/${issue.id}`
              : `/issue/${issue.id}`;
            
            return (
              <A
                href={href}
                class="card-link"
              >
                <div class="issue-card">
                  <div class="issue-card-header">
                    <span class="issue-card-badge">📌</span>
                  </div>
                  <div class="issue-card-body">
                    <div class="issue-card-title">{issue.title}</div>
                    <div class="issue-card-info">{issue.status}</div>
                  </div>
                  <div class="issue-card-footer">
                    <div class="issue-card-count">{issue.members?.length || 0}</div>
                    <div class="issue-card-dots">
                      <span class="dot"></span>
                      <span class="dot"></span>
                      <span class="dot"></span>
                    </div>
                  </div>
                </div>
              </A>
            );
          }}
        </For>
      </div>
    </Suspense>
  );
}
