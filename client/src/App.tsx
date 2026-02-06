import { useLocation } from "@solidjs/router";
import Layout from "./components/Layout";
import WorkspaceLayout from "./components/WorkspaceLayout";
import ProjectLayout from "./components/ProjectLayout";

export default function App(props) {
  const location = useLocation();
  
  const isProjectPage = () => location.pathname.startsWith("/project");
  const isWorkspacePage = () => location.pathname.startsWith("/workspace");

  return (
    <>
      {isProjectPage() && <ProjectLayout>{props.children}</ProjectLayout>}
      {isWorkspacePage() && <WorkspaceLayout>{props.children}</WorkspaceLayout>}
      {!isProjectPage() && !isWorkspacePage() && <Layout>{props.children}</Layout>}
    </>
  );
}
