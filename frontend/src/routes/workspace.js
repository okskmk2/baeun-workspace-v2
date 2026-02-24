import WorkspaceLayout from "../views/workspace/WorkspaceLayout.vue";
import WorkspaceProjectsPage from "../views/workspace/WorkspaceProjectsPage.vue";
import WorkspaceSettingsPage from "../views/workspace/WorkspaceSettingsPage.vue";
import WorkspaceBoardPage from "../views/workspace/WorkspaceBoardPage.vue";
import WorkspaceRankPage from "../views/workspace/WorkspaceRankPage.vue";

export const workspaceRoutes = [
  {
    path: "/workspace/:workspaceId",
    name: "workspace-root",
    meta: { requiresAuth: true },
    component: WorkspaceLayout,
    children: [
      {
        path: "",
        redirect: (to) => `/workspace/${to.params.workspaceId}/projects`,
      },
      {
        path: "projects",
        name: "workspace-projects",
        component: WorkspaceProjectsPage,
      },
      {
        path: "board",
        name: "workspace-board",
        component: WorkspaceBoardPage,
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
