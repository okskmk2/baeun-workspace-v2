import { A, useNavigate } from "@solidjs/router";
import { createResource, Show, For } from "solid-js";
import api from "../lib/axios";
import { IssueIcon, ChatIcon, ProjectIcon, ProfileIcon } from "./icons";
import { getCurrentProjectId, setCurrentProjectId } from "../store/appStore";
import type { Project, Workspace, User } from "../lib/types";

const fetchProject = async (id: any): Promise<Project | null> => {
  if (!id) return null;
  const res = await api.get(`/project/${id}?fields=id,name,image,workspace`);
  return res.data.data as Project;
};

const fetchWorkspace = async (id: any): Promise<Workspace | null> => {
  if (!id) return null;
  const res = await api.get(`/workspace/${id}`);
  return res.data.data as Workspace;
};

const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await api.get("/member/me");
    return res.data.data as User;
  } catch {
    return null;
  }
};

export default function ProjectGNB() {
  const navigate = useNavigate();

  const [project] = createResource<Project | null, string | undefined>(() => getCurrentProjectId(), fetchProject);
  const [workspace] = createResource<Workspace | null, string | undefined>(
    () => (project() ? (project()!.workspace as any)?.id : null),
    fetchWorkspace
  );
  const [user] = createResource<User | null>(fetchCurrentUser);

  const handleProjectChange = (
    e: Event & { currentTarget: HTMLSelectElement; target: HTMLSelectElement }
  ) => {
    const id = e.target.value;
    if (id) navigate(`/project/${id}`);
  };

  return (
    <nav class="gnb gnb-project">
      <div class="gnb-left">
        <A href="/" class="gnb-brand">
          <img src="/logo.svg" alt="logo" class="gnb-logo" />
          <span class="gnb-title">Baeun Workspace</span>
        </A>

        <Show when={workspace()}>
          <div class="gnb-project-select">
            <select
              onChange={(e) => {
                handleProjectChange(e);
                setCurrentProjectId(e.target.value);
              }}
              value={getCurrentProjectId() || ""}
            >
              <option value="">프로젝트 선택</option>
              <For each={workspace().projects || []}>
                {(p) => <option value={p.id}>{p.name}</option>}
              </For>
            </select>
          </div>
        </Show>
      </div>

      <div class="gnb-center">
        <A href={`/project/${getCurrentProjectId()}/issue`} activeClass="active">
          <IssueIcon size={16} className="nav-icon" /> 이슈
        </A>
        <A href={`/project/${getCurrentProjectId()}/wiki`} activeClass="active">
          <ProjectIcon size={16} className="nav-icon" /> 위키
        </A>
        <A href={`/project/${getCurrentProjectId()}/chat`} activeClass="active">
          <ChatIcon size={16} className="nav-icon" /> Chat
        </A>
      </div>

      <div class="gnb-right">
        <Show when={!user()}>
          <A href="/signup" activeClass="active">
            회원가입
          </A>
          <A href="/login" activeClass="active">
            로그인
          </A>
        </Show>
        <A href="/profile" activeClass="active">
          <ProfileIcon size={16} className="nav-icon" /> 마이페이지
        </A>
      </div>
    </nav>
  );
}
