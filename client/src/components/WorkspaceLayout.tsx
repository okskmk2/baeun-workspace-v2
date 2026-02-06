import { useParams } from "@solidjs/router";
import { createEffect } from "solid-js";
import WorkspaceGNB from "./WorkspaceGNB";
import { setCurrentWorkspaceId } from "../store/appStore";

function WorkspaceLayout(props) {
  const params = useParams();
  createEffect(() => {
    setCurrentWorkspaceId(params.workspaceId);
  });

  return (
    <div class="workspace-layout">
      <WorkspaceGNB />
      <main class="workspace-main">{props.children}</main>
    </div>
  );
}

export default WorkspaceLayout;
