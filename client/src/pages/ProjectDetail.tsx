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
    <div style={{ "max-width": "1000px", margin: "0 auto", padding: "30px" }}>
      <header
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "margin-bottom": "30px",
        }}
      >
        <div>
          <A
            href="/profile"
            style={{ color: "#666", "text-decoration": "none", "font-size": "0.9rem" }}
          >
            ← 내 워크스페이스
          </A>
          <h1 style={{ margin: "10px 0 0 0" }}>📂 프로젝트 상세</h1>
          <p style={{ color: "#888", margin: "5px 0" }}>Project ID: {params.projectId}</p>
        </div>

        {/* 보드 생성 화면으로 이동하는 버튼 */}
        <A href={`/project/${params.projectId}/board/new`}>
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
            + 새 보드 만들기
          </button>
        </A>
      </header>

      <section>
        <h3 style={{ "border-bottom": "1px solid #eee", "padding-bottom": "10px" }}>
          📋 보드 목록
        </h3>
        <Suspense fallback={<p>보드를 불러오는 중...</p>}>
          <div
            style={{
              display: "grid",
              "grid-template-columns": "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "20px",
              "margin-top": "20px",
            }}
          >
            <For
              each={boards()}
              fallback={<p style={{ color: "#999" }}>아직 생성된 보드가 없습니다.</p>}
            >
              {(board) => (
                <A
                  href={`/board/${board.id}`}
                  style={{ "text-decoration": "none", color: "inherit" }}
                >
                  <div
                    style={{
                      padding: "20px",
                      border: "1px solid #ddd",
                      "border-radius": "10px",
                      background: "#f9f9f9",
                      transition: "box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <h4 style={{ margin: "0 0 10px 0" }}>{board.name}</h4>
                    <span
                      style={{
                        "font-size": "0.75rem",
                        background: "#eee",
                        padding: "2px 6px",
                        "border-radius": "4px",
                      }}
                    >
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
