import { useLocation } from "@solidjs/router";
import Layout from "./components/Layout";
import WorkspaceLayout from "./components/WorkspaceLayout";
import ProjectLayout from "./components/ProjectLayout";

interface AppProps {
  children: any;
}

export default function App(props: AppProps) {
  const location = useLocation();

  const isProjectPage = (): boolean => location.pathname.startsWith("/project");
  const isWorkspacePage = (): boolean => location.pathname.startsWith("/workspace");

  return (
    <>
      {isProjectPage() && <ProjectLayout>{props.children}</ProjectLayout>}
      {isWorkspacePage() && <WorkspaceLayout>{props.children}</WorkspaceLayout>}
      {!isProjectPage() && !isWorkspacePage() && <Layout>{props.children}</Layout>}
    </>
  );
}
