import { A } from "@solidjs/router";
import { createResource, Show } from "solid-js";
import api from "../lib/axios";
import { ProfileIcon } from "./icons";

const fetchCurrentUser = async () => {
  try {
    const res = await api.get("/member/me");
    return res.data.data;
  } catch {
    return null;
  }
};

export default function SimpleGNB() {
  const [user] = createResource(fetchCurrentUser);

  return (
    <nav class="gnb gnb-simple">
      <div class="gnb-left">
        <A href="/" class="gnb-brand">
          <img src="/logo.svg" alt="logo" class="gnb-logo" />
          <span class="gnb-title">Baeun Workspace</span>
        </A>
      </div>

      <div class="gnb-right">
        <Show when={!user()}>
          <A href="/signup" activeClass="active">회원가입</A>
          <A href="/login" activeClass="active">로그인</A>
        </Show>
        <A href="/profile" activeClass="active">
          <ProfileIcon size={16} class="nav-icon" /> 마이페이지
        </A>
      </div>
    </nav>
  );
}
