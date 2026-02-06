import { useParams, useLocation, A } from "@solidjs/router";
import { Show } from "solid-js";
import IssueLNB from "./IssueLNB";
import WikiLNB from "./WikiLNB";
import ChatLNB from "./ChatLNB";

function ProjectLayout(props) {
  const params = useParams();
  const location = useLocation();

  const isIssuePage = () => location.pathname.includes("/issue") || location.pathname.includes("/board");
  const isWikiPage = () => location.pathname.includes("/wiki");
  const isChatPage = () => location.pathname.includes("/chat");

  return (
    <div class="project-layout">
      {/* GNB */}
      <nav class="project-gnb">
        <A href={`/project/${params.projectId}`}>프로젝트</A>
        <A href={`/project/${params.projectId}/issue`} activeClass="active">
          이슈
        </A>
        <A href={`/project/${params.projectId}/wiki`} activeClass="active">
          위키
        </A>
        <A href={`/project/${params.projectId}/chat`} activeClass="active">
          Chat
        </A>
      </nav>

      {/* LNB + Main Content */}
      <div class="project-content-wrapper">
        {/* LNB */}
        <Show when={isIssuePage() || isWikiPage() || isChatPage()}>
          <aside class="project-lnb">
            <Show when={isIssuePage()}>
              <IssueLNB projectId={params.projectId} />
            </Show>
            <Show when={isWikiPage()}>
              <WikiLNB projectId={params.projectId} />
            </Show>
            <Show when={isChatPage()}>
              <ChatLNB projectId={params.projectId} />
            </Show>
          </aside>
        </Show>

        {/* Main Content */}
        <main class="project-main">{props.children}</main>
      </div>
    </div>
  );
}

export default ProjectLayout;
