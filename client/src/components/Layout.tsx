import { A } from "@solidjs/router";

function Layout(props) {
  return (
    <>
      <nav class="layout-nav">
        <A href="/" activeClass="active">
          홈
        </A>
        <A href="/signup" activeClass="active">
          회원가입
        </A>
        <A href="/login" activeClass="active">
          로그인
        </A>
        <A href="/profile" activeClass="active">
          내 프로필
        </A>
      </nav>

      <main class="layout-main">{props.children}</main>
    </>
  );
}

export default Layout;
