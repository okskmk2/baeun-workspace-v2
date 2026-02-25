import WorkspaceLayout from "../views/workspace/WorkspaceLayout.vue";
import WorkspaceProjectsPage from "../views/workspace/WorkspaceProjectsPage.vue";
import WorkspaceSettingsPage from "../views/workspace/WorkspaceSettingsPage.vue";
import WorkspaceRankPage from "../views/workspace/WorkspaceRankPage.vue";

export const workspaceRoutes = [
  {
    path: "/workspace/:workspaceId",
    meta: { requiresAuth: true },
    component: WorkspaceLayout,
    children: [
      {
        path: "",
        name: "workspace-root",
        redirect: (to) => `/workspace/${to.params.workspaceId}/projects`,
      },
      {
        path: "projects",
        name: "workspace-projects",
        component: WorkspaceProjectsPage,
      },
      {
        path: "rank",
        name: "workspace-rank",
        component: WorkspaceRankPage,
      },
      {
        path: "settings",
        name: "workspace-settings",
        component: WorkspaceSettingsPage,
      },
    ],
  },
];
