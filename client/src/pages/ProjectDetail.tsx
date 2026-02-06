import { createResource, For, Suspense } from "solid-js";
import { useParams, A } from "@solidjs/router";
import api from "../lib/axios";

// 보드 목록 페칭 함수
const fetchBoards = async (projectId: string) => {
  const res = await api.get(`/project/${projectId}/boards`);
  return res.data.data;
};

export default function ProjectDetail() {
  const params = useParams();
  const [boards] = createResource(() => params.projectId, fetchBoards);

  return (
    <div class="page-container">
      <header class="page-header">
        <div>
          <A href="/profile" class="back-link">
            ← 내 워크스페이스
          </A>
          <h1 class="page-header-info">📂 프로젝트 상세</h1>
          <p>Project ID: {params.projectId}</p>
        </div>

        {/* 보드 생성 화면으로 이동하는 버튼 */}
        <A href={`/project/${params.projectId}/board/new`}>
          <button class="btn btn-primary btn-large">
            + 새 보드 만들기
          </button>
        </A>
      </header>

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
