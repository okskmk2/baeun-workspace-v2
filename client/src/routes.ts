import { lazy } from "solid-js";
import ProjectLayout from "./components/ProjectLayout";

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/Home")),
  },
  {
    path: "/signup",
    component: lazy(() => import("./pages/Signup")),
  },
  {
    path: "/login",
    component: lazy(() => import("./pages/Login")),
  },
  {
    path: "/profile",
    component: lazy(() => import("./pages/Profile")),
  },
  {
    path: "/workspace/create",
    component: lazy(() => import("./pages/WorkspaceCreate")),
  },
  {
    path: "/workspace/:workspaceId",
    component: lazy(() => import("./pages/WorkspaceDashboard")),
  },
  {
    path: "/workspace/:workspaceId/project/new",
    component: lazy(() => import("./pages/ProjectCreate")),
  },
  {
    path: "/project/:projectId",
    component: ProjectLayout,
    children: [
      {
        path: "/",
        component: lazy(() => import("./pages/ProjectDetail")),
      },
      {
        path: "/board/new",
        component: lazy(() => import("./pages/BoardCreate")),
      },
      {
        path: "/wiki/new",
        component: lazy(() => import("./pages/PageCreate")),
      },
      {
        path: "/wiki/:pageId",
        component: lazy(() => import("./pages/PageDetail")),
      },
      {
        path: "/board/:boardId",
        component: lazy(() => import("./pages/BoardDetail")),
      },
      {
        path: "/issue/:issueId",
        component: lazy(() => import("./pages/IssueDetail")),
      },
      {
        path: "/issue",
        component: lazy(() => import("./pages/ProjectDetail")),
      },
      {
        path: "/wiki",
        component: lazy(() => import("./pages/ProjectDetail")),
      },
      {
        path: "/chat",
        component: lazy(() => import("./pages/ChatDashboard")),
      },
      {
        path: "/chat/:chatroomId",
        component: lazy(() => import("./pages/ChatRoomDetail")),
      },
    ],
  },
  {
    path: "*",
    component: lazy(() => import("./pages/NotFound")),
  },
];
