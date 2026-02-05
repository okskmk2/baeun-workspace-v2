import { createSignal, createResource, For, Suspense } from "solid-js";
import { useParams } from "@solidjs/router";
import api from "../lib/axios";

export default function WorkspaceMembers() {
  const params = useParams();
  const [email, setEmail] = createSignal("");

  // 현재 멤버 목록 가져오기
  const fetchMembers = async () => {
    const res = await api.get(`/workspace/${params.workspaceId}/members`);
    return res.data.data;
  };
  const [members, { refetch }] = createResource(fetchMembers);

  const inviteMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/workspace/${params.workspaceId}/member`, {
        email: email(),
      });
      alert("멤버를 초대했습니다!");
      setEmail("");
      refetch(); // 목록 갱신
    } catch (err) {
      alert(err.response?.data?.message || "초대 실패");
    }
  };

  return (
    <div style={{ padding: "20px", background: "white", "border-radius": "8px" }}>
      <h3>👥 멤버 관리</h3>

      {/* 초대 폼 */}
      <form
        onSubmit={inviteMember}
        style={{ display: "flex", gap: "10px", "margin-bottom": "20px" }}
      >
        <input
          type="email"
          placeholder="초대할 사용자 이메일"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
          style={{ flex: 1, padding: "8px" }}
        />
        <button
          type="submit"
          style={{
            background: "#4A90E2",
            color: "white",
            border: "none",
            padding: "8px 15px",
          }}
        >
          추대하기
        </button>
      </form>

      {/* 멤버 리스트 */}
      <Suspense fallback={<p>로딩 중...</p>}>
        <table style={{ width: "100%", "border-collapse": "collapse" }}>
          <thead>
            <tr
              style={{
                "border-bottom": "2px solid #eee",
                "text-align": "left",
              }}
            >
              <th style={{ padding: "10px" }}>이름</th>
              <th>이메일</th>
              <th>권한</th>
            </tr>
          </thead>
          <tbody>
            <For each={members()}>
              {(m) => (
                <tr style={{ "border-bottom": "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <span
                      style={{
                        background: "#eee",
                        padding: "2px 6px",
                        "border-radius": "4px",
                      }}
                    >
                      {m.role_name}
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Suspense>
    </div>
  );
}
