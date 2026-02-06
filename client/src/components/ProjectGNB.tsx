import { A, useParams, useNavigate } from "@solidjs/router";
import { createResource, Show, For } from "solid-js";
import api from "../lib/axios";
import { IssueIcon, ChatIcon, ProjectIcon, ProfileIcon } from "./icons";

const fetchProject = async (id) => {
  if (!id) return null;
  const res = await api.get(`/project/${id}?fields=id,name,image,workspace`);
  return res.data.data;
};

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

export default function ProjectGNB() {
  const params = useParams();
  const navigate = useNavigate();

  const [project] = createResource(() => params.projectId, fetchProject);
  const [workspace] = createResource(
    () => (project() ? project().workspace?.id : null),
    fetchWorkspace
  );
  const [user] = createResource(fetchCurrentUser);

  const handleProjectChange = (e) => {
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
            <select onChange={handleProjectChange} value={params.projectId || ""}>
              <option value="">프로젝트 선택</option>
              <For each={workspace().projects || []}>
                {(p) => <option value={p.id}>{p.name}</option>}
              </For>
            </select>
          </div>
        </Show>
      </div>

      <div class="gnb-center">
        <A href={`/project/${params.projectId}/issue`} activeClass="active">
          <IssueIcon size={16} class="nav-icon" /> 이슈
        </A>
        <A href={`/project/${params.projectId}/wiki`} activeClass="active">
          <ProjectIcon size={16} class="nav-icon" /> 위키
        </A>
        <A href={`/project/${params.projectId}/chat`} activeClass="active">
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
