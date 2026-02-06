import { A } from "@solidjs/router";

function Layout(props) {
  return (
    <>
      <nav class="layout-nav">
        <div class="layout-nav-brand">
          <A href="/" class="layout-nav-logo">
            <img src="/logo.svg" alt="Baeun Workspace Logo" class="logo-img" />
            <span class="logo-text">Baeun Workspace</span>
          </A>
        </div>
        <div class="layout-nav-links">
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
        </div>
      </nav>

      <main class="layout-main">{props.children}</main>
    </>
  );
}

export default Layout;
