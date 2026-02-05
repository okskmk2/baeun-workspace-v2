import { A } from "@solidjs/router";

function App(props) {
  return (
    <>
      <nav
        style={{
          padding: "1rem",
          background: "#333",
          color: "white",
          display: "flex",
          gap: "15px",
        }}
      >
        <A href="/" activeClass="active" style={{ color: "white" }}>
          홈
        </A>
        <A href="/signup" activeClass="active" style={{ color: "white" }}>
          회원가입
        </A>
        <A href="/login" activeClass="active" style={{ color: "white" }}>
          로그인
        </A>
        <A href="/profile" activeClass="active" style={{ color: "white" }}>
          내 프로필
        </A>
      </nav>

      <main style={{ padding: "20px" }}>
        {/* 현재 경로에 맞는 컴포넌트가 이 자리에 들어옵니다 */}
        {props.children}
      </main>
    </>
  );
}

export default App;
