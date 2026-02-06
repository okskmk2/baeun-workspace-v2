import { lazy } from "solid-js";
import ProjectLayout from "./components/ProjectLayout";

export const routes = [
  {
    path: "/",
    component: lazy(() => import("./pages/HomePage")),
  },
  {
    path: "/signup",
    component: lazy(() => import("./pages/SignupPage")),
  },
  {
    path: "/login",
    component: lazy(() => import("./pages/LoginPage")),
  },
  {
    path: "/profile",
    component: lazy(() => import("./pages/ProfilePage")),
  },
  {
    path: "/workspace/create",
    component: lazy(() => import("./pages/WorkspaceCreatePage")),
  },
  {
    path: "/workspace/:workspaceId",
    component: lazy(() => import("./pages/WorkspaceDashboardPage")),
  },
  {
    path: "/workspace/:workspaceId/project/new",
    component: lazy(() => import("./pages/ProjectCreatePage")),
  },
  {
    path: "/project/:projectId",
    component: ProjectLayout,
    children: [
      {
        path: "/",
        component: lazy(() => import("./pages/ProjectDetailPage")),
      },
      {
        path: "/board/new",
        component: lazy(() => import("./pages/BoardCreatePage")),
      },
      {
        path: "/wiki/new",
        component: lazy(() => import("./pages/PageCreatePage")),
      },
      {
        path: "/wiki/:pageId",
        component: lazy(() => import("./pages/PageDetailPage")),
      },
      {
        path: "/board/:boardId",
        component: lazy(() => import("./pages/BoardDetailPage")),
      },
      {
        path: "/issue/:issueId",
        component: lazy(() => import("./pages/IssueDetailPage")),
      },
      {
        path: "/issue",
        component: lazy(() => import("./pages/ProjectDetailPage")),
      },
      {
        path: "/wiki",
        component: lazy(() => import("./pages/ProjectDetailPage")),
      },
      {
        path: "/chat",
        component: lazy(() => import("./pages/ChatDashboardPage")),
      },
      {
        path: "/chat/:chatroomId",
        component: lazy(() => import("./pages/ChatRoomDetailPage")),
      },
    ],
  },
  {
    path: "*",
    component: lazy(() => import("./pages/NotFoundPage")),
  },
];
