import { A, useNavigate } from "@solidjs/router";
import { createResource, Show, For } from "solid-js";
import api from "../lib/axios";
import { IssueIcon, ChatIcon, ProjectIcon, ProfileIcon } from "./icons";

const fetchWorkspace = async (id) => {
  if (!id) return null;
  const res = await api.get(`/workspace/${id}`);
  return res.data.data;
};

const fetchCurrentUser = async () => {
  try {
    const res = await api.get("/member/me");
    return res.data.data;
  } catch {
    return null;
  }
};

export default function WorkspaceGNB(props) {
  const navigate = useNavigate();
  const [workspace] = createResource(() => props.workspaceId, fetchWorkspace);
  const [user] = createResource(fetchCurrentUser);

  const handleProjectChange = (e) => {
    const id = e.target.value;
    if (id) navigate(`/project/${id}`);
  };

  return (
    <nav class="gnb gnb-workspace">
      <div class="gnb-left">
        <A href="/" class="gnb-brand">
          <Show
            when={workspace()}
            fallback={
              <>
                <img src="/logo.svg" alt="logo" class="gnb-logo" />
                <span class="gnb-title">Baeun Workspace</span>
              </>
            }
          >
            <>
              <img src={workspace().image || "/logo.svg"} alt="ws" class="gnb-logo" />
              <span class="gnb-title">{workspace().name}</span>
            </>
          </Show>
        </A>

        <Show when={workspace()}>
          <div class="gnb-project-select">
            <select onChange={handleProjectChange} title="프로젝트 선택">
              <option value="">프로젝트 선택</option>
              <For each={workspace().projects || []}>
                {(p) => <option value={p.id}>{p.name}</option>}
              </For>
            </select>
          </div>
        </Show>
      </div>

      <div class="gnb-center">
        <A href={`/project/1/issue`} activeClass="active">
          <IssueIcon size={16} class="nav-icon" /> 이슈
        </A>
        <A href={`/project/1/wiki`} activeClass="active">
          <ProjectIcon size={16} class="nav-icon" /> 위키
        </A>
        <A href={`/project/1/chat`} activeClass="active">
          <ChatIcon size={16} class="nav-icon" /> Chat
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
