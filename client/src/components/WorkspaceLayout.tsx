import { useParams } from "@solidjs/router";
import WorkspaceGNB from "./WorkspaceGNB";

function WorkspaceLayout(props) {
  const params = useParams();

  return (
    <div class="workspace-layout">
      <WorkspaceGNB workspaceId={params.workspaceId} />
      <main class="workspace-main">{props.children}</main>
    </div>
  );
}

export default WorkspaceLayout;
