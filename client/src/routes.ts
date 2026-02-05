import { lazy } from "solid-js";

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
    path: "*",
    component: lazy(() => import("./pages/NotFound")),
  },
];
