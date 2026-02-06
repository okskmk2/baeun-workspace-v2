import { createResource, For, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";

const fetchMyWorkspaces = async () => {
  const res = await api.get("/workspace/my");
  return res.data.data;
};

export default function Profile() {
  const [workspaces] = createResource(fetchMyWorkspaces);

  return (
    <div class="page-container">
      <h2>내 프로필</h2>
      <div class="mt-xl">
        <h3>내가 참여 중인 워크스페이스</h3>
        <Suspense fallback={<p>불러오는 중...</p>}>
          <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
            <For each={workspaces()}>
              {(ws) => (
                <A
                  href={`/workspace/${ws.id}`}
                  style={{
                    padding: "15px",
                    border: "1px solid #ccc",
                    display: "block",
                    "text-decoration": "none",
                    color: "black",
                    "border-radius": "8px",
                  }}
                >
                  <strong>{ws.name}</strong>
                  <span
                    style={{
                      "font-size": "0.8rem",
                      color: "#666",
                      "margin-left": "10px",
                    }}
                  >
                    권한: {ws.role_name}
                  </span>
                </A>
              )}
            </For>
          </div>
        </Suspense>

        <A href="/workspace/create">
          <button class="btn btn-primary mt-lg">+ 새 워크스페이스 만들기</button>
        </A>
      </div>
    </div>
  );
}
