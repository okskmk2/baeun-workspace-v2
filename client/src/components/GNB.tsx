import { A, useLocation, useNavigate } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import api from "../lib/axios";
import { HomeIcon, IssueIcon, ChatIcon, ProjectIcon, ProfileIcon } from "./icons";
import { getCurrentProjectId, getCurrentWorkspaceId } from "../store/appStore";
import type { Workspace, Project } from "../lib/types";

const fetchWorkspace = async (id): Promise<Workspace | null> => {
  if (!id) return null;
  const res = await api.get(`/workspace/${id}`);
  return res.data.data as Workspace;
};

export default function GNB() {
  const location = useLocation();
  const navigate = useNavigate();

  // prefer store workspace id; fallback to pathname match
  const workspaceMatch = () => getCurrentWorkspaceId() || (location.pathname.match(/\/workspace\/(\d+)/) || [])[1] || null;

  const [workspace] = createResource<Workspace | null, string | undefined>(workspaceMatch, fetchWorkspace);

  const [projects] = createResource<Project[], Workspace | null>(
    () => workspace(),
    (w) => (w ? w.projects || [] : []) as Project[]
  );

  const projectId = () => getCurrentProjectId() || null;

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
            <select onChange={(e) => { handleProjectChange(e); /* also set project via navigation; ProjectLayout will pick it up */ }} value={projectId() || ""} aria-label="프로젝트 선택">
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
