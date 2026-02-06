import { A, useLocation, useParams, useNavigate } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import api from "../lib/axios";
import { HomeIcon, IssueIcon, ChatIcon, ProjectIcon, ProfileIcon } from "./icons";

const fetchWorkspace = async (id) => {
  if (!id) return null;
  const res = await api.get(`/workspace/${id}`);
  return res.data.data;
};

export default function GNB() {
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  // try to derive workspaceId from pathname if present
  const workspaceMatch = () => {
    const m = location.pathname.match(/\/workspace\/(\d+)/);
    return m ? m[1] : null;
  };

  const [workspace] = createResource(workspaceMatch, fetchWorkspace);

  const [projects] = createResource(
    () => (workspace() ? workspace().projects || [] : []),
    async (projects) => projects
  );

  const projectId = () => params.projectId || null;

  const handleProjectChange = (e) => {
    const id = e.target.value;
    if (id) navigate(`/project/${id}`);
  };

  const projectBase = (id) => (id ? `/project/${id}` : "#");

  // 로그인 상태 예시 (실제 구현은 store/context 활용)
  const [isLoggedIn] = createSignal(false); // TODO: 실제 인증 연동
  const [user] = createSignal({ name: "홍길동", avatar: "/avatar.svg" }); // 예시

  return (
    <nav class="gnb" aria-label="Global Navigation">
      <div class="gnb-left">
        <A href="/" class="gnb-brand" aria-label="홈">
          <Show
            when={workspace()}
            fallback={(
              <>
                <img src="/logo.svg" alt="logo" class="gnb-logo" />
                <span class="gnb-title">Baeun Workspace</span>
              </>
            )}
          >
            <>
              <img src={workspace().image || "/logo.svg"} alt="ws" class="gnb-logo" />
              <span class="gnb-title">{workspace().name}</span>
            </>
          </Show>
        </A>
        <Show when={workspace()}>
          <div class="gnb-project-select">
            <select onChange={handleProjectChange} value={projectId() || ""} aria-label="프로젝트 선택">
              <option value="">프로젝트 선택</option>
              <Show when={projects()}>
                {projects().map((p) => (
                  <option value={p.id}>{p.name}</option>
                ))}
              </Show>
            </select>
          </div>
        </Show>
      </div>

      <div class="gnb-center">
        <A href={projectBase(projectId()) + "/issue"} activeClass="active" aria-label="이슈">
          <IssueIcon size={16} class="nav-icon" />
          <span class="gnb-link-text">이슈</span>
        </A>
        <A href={projectBase(projectId()) + "/wiki"} activeClass="active" aria-label="위키">
          <ProjectIcon size={16} class="nav-icon" />
          <span class="gnb-link-text">위키</span>
        </A>
        <A href={projectBase(projectId()) + "/chat"} activeClass="active" aria-label="채팅">
          <ChatIcon size={16} class="nav-icon" />
          <span class="gnb-link-text">Chat</span>
        </A>
      </div>

      <div class="gnb-right">
        <Show when={isLoggedIn()} fallback={(
          <>
            <A href="/signup" activeClass="active">회원가입</A>
            <A href="/login" activeClass="active">로그인</A>
          </>
        )}>
          <A href="/profile" activeClass="active" aria-label="마이페이지">
            <ProfileIcon size={16} class="nav-icon" />
            <span class="gnb-link-text">{user().name}</span>
            <img src={user().avatar} alt="프로필" class="gnb-avatar" />
          </A>
        </Show>
      </div>
    </nav>
  );
}
