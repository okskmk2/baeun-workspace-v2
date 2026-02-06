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
    <div class="page-container">
      <h3>👥 멤버 관리</h3>

      {/* 초대 폼 */}
      <form
        onSubmit={inviteMember}
        class="flex-row gap-md mb-lg"
      >
        <input
          type="email"
          class="form-control flex-1"
          placeholder="초대할 사용자 이메일"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          required
        />
        <button type="submit" class="btn btn-primary">
          추대하기
        </button>
      </form>

      {/* 멤버 리스트 */}
      <Suspense fallback={<p>로딩 중...</p>}>
        <table class="member-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>권한</th>
            </tr>
          </thead>
          <tbody>
            <For each={members()}>
              {(m) => (
                <tr>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <span class="card-badge">
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
