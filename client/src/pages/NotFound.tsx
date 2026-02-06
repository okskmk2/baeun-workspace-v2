import { useNavigate } from "@solidjs/router";
import { onCleanup } from "solid-js";

export default function NotFound() {
  // const navigate = useNavigate();

  // // (선택 사항) 5초 뒤에 자동으로 홈으로 리다이렉트
  // const timer = setTimeout(() => {
  //   navigate("/", { replace: true });
  // }, 5000);

  // onCleanup(() => clearTimeout(timer));

  return (
    <div class="flex-col" style={{ "text-align": "center", padding: "100px 20px", "align-items": "center" }}>
      <h1 style={{ "font-size": "5rem", margin: "0", color: "#ff4757" }}>404</h1>
      <h2>길을 잃으셨나요?</h2>
      <p class="text-secondary">요청하신 페이지를 찾을 수 없습니다.</p>

      <div class="mt-lg">
        <button
          onClick={() => navigate("/")}
          class="btn btn-primary"
        >
          홈으로 돌아가기
        </button>
      </div>

      <p style={{ "font-size": "0.8rem", color: "#999", "margin-top": "30px" }}>
        5초 뒤에 자동으로 메인 화면으로 이동합니다...
      </p>
    </div>
  );
}
