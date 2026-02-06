import { useParams, useLocation } from "@solidjs/router";
import { Show, createEffect } from "solid-js";
import IssueLNB from "./IssueLNB";
import WikiLNB from "./WikiLNB";
import ChatLNB from "./ChatLNB";
import ProjectGNB from "./ProjectGNB";
import { setCurrentProjectId } from "../store/appStore";

function ProjectLayout(props) {
  const params = useParams();
  const location = useLocation();
  createEffect(() => {
    setCurrentProjectId(params.projectId);
  });

  const isIssuePage = () => location.pathname.includes("/issue") || location.pathname.includes("/board");
  const isWikiPage = () => location.pathname.includes("/wiki");
  const isChatPage = () => location.pathname.includes("/chat");

  return (
    <div class="project-layout">
      <ProjectGNB />

      {/* LNB + Main Content */}
      <div class="project-content-wrapper">
        {/* LNB */}
        <Show when={isIssuePage() || isWikiPage() || isChatPage()}>
          <aside class="project-lnb">
            <Show when={isIssuePage()}>
              <IssueLNB />
            </Show>
            <Show when={isWikiPage()}>
              <WikiLNB />
            </Show>
            <Show when={isChatPage()}>
              <ChatLNB />
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
