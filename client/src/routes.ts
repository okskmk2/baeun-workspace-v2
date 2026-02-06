import { lazy } from "solid-js";

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
    component: lazy(() => import("./pages/ProjectDetailPage")),
  },
  {
    path: "/project/:projectId/board/new",
    component: lazy(() => import("./pages/BoardCreatePage")),
  },
  {
    path: "/project/:projectId/wiki/new",
    component: lazy(() => import("./pages/PageCreatePage")),
  },
  {
    path: "/project/:projectId/wiki/:pageId",
    component: lazy(() => import("./pages/PageDetailPage")),
  },
  {
    path: "/project/:projectId/board/:boardId",
    component: lazy(() => import("./pages/BoardDetailPage")),
  },
  {
    path: "/project/:projectId/issue/:issueId",
    component: lazy(() => import("./pages/IssueDetailPage")),
  },
  {
    path: "/project/:projectId/issue",
    component: lazy(() => import("./pages/ProjectDetailPage")),
  },
  {
    path: "/project/:projectId/wiki",
    component: lazy(() => import("./pages/ProjectDetailPage")),
  },
  {
    path: "/project/:projectId/chat",
    component: lazy(() => import("./pages/ChatDashboardPage")),
  },
  {
    path: "/project/:projectId/chat/:chatroomId",
    component: lazy(() => import("./pages/ChatRoomDetailPage")),
  },
  {
    path: "*",
    component: lazy(() => import("./pages/NotFoundPage")),
  },
];
