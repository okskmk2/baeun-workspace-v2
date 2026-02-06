import { createResource, Show, Suspense } from "solid-js";
import { A } from "@solidjs/router";
import api from "../lib/axios";

// 현재 로그인한 사용자 정보를 가져오는 비동기 함수
const fetchUser = async () => {
  try {
    const res = await api.get("/member/me");
    return res.data.data;
  } catch (err) {
    // 로그인이 안 되어 있을 경우 null 반환
    return null;
  }
};

export default function Home() {
  const [user] = createResource(fetchUser);

  return (
    <div class="page-container" style={{ "text-align": "center" }}>
      <h1>🚀 협업 툴 플랫폼</h1>
      <p>팀원들과 함께 실시간으로 프로젝트를 관리하세요.</p>

      <Suspense fallback={<p>사용자 정보 확인 중...</p>}>
        <Show
          when={user()}
          fallback={
            <div class="mt-lg">
              <p>로그인하여 서비스를 이용해보세요!</p>
              <div class="flex-row gap-md flex-center">
                <A href="/login">
                  <button class="btn btn-primary">로그인하러 가기</button>
                </A>
                <A href="/signup">
                  <button class="btn">회원가입</button>
                </A>
              </div>
            </div>
          }
        >
          <div class="card mt-lg">
            <h3>환영합니다, {user().name}님! 👋</h3>
            <p>오늘의 업무를 확인하러 가볼까요?</p>
            <A href="/profile">
              <button class="btn btn-primary">내 프로필 보기</button>
            </A>
          </div>
        </Show>
      </Suspense>
    </div>
  );
}
