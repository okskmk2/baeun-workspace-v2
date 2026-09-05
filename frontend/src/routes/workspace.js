import WorkspaceLayout from "../views/workspace/WorkspaceLayout.vue";
import WorkspaceProjectsPage from "../views/workspace/WorkspaceProjectsPage.vue";
import WorkspaceSettingsPage from "../views/workspace/WorkspaceSettingsPage.vue";
import WorkspaceSettingsLayout from "../views/workspace/WorkspaceSettingsLayout.vue";
import WorkspaceSettingsMembersPage from "../views/workspace/WorkspaceSettingsMembersPage.vue";
import WorkspaceSettingsProjectsPage from "../views/workspace/WorkspaceSettingsProjectsPage.vue";
import WorkspaceSettingsLicensePage from "../views/workspace/WorkspaceSettingsLicensePage.vue";
import WorkspaceSettingsBillingPage from "../views/workspace/WorkspaceSettingsBillingPage.vue";
import WorkspaceRankPage from "../views/workspace/WorkspaceRankPage.vue";
import WorkspaceBoardLayout from "../views/workspace/WorkspaceBoardLayout.vue";
import WorkspaceBoardHomePage from "../views/workspace/WorkspaceBoardHomePage.vue";
import WorkspaceBoardNoticePage from "../views/workspace/WorkspaceBoardNoticePage.vue";
import WorkspaceBoardCelebrationPage from "../views/workspace/WorkspaceBoardCelebrationPage.vue";
import WorkspaceBoardMarketPage from "../views/workspace/WorkspaceBoardMarketPage.vue";
import WorkspaceBoardQnaPage from "../views/workspace/WorkspaceBoardQnaPage.vue";

export const workspaceRoutes = [
  {
    path: "/workspace/:workspaceId",
    meta: { requiresWorkspaceView: true },
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
        path: "board",
        name: "workspace-board",
        component: WorkspaceBoardLayout,
        children: [
          {
            path: "",
            name: "workspace-board-root",
            redirect: (to) => `/workspace/${to.params.workspaceId}/board/home`,
          },
          {
            path: "home",
            name: "workspace-board-home",
            component: WorkspaceBoardHomePage,
          },
          {
            path: "notice",
            name: "workspace-board-notice",
            component: WorkspaceBoardNoticePage,
          },
          {
            path: "events",
            name: "workspace-board-events",
            component: WorkspaceBoardCelebrationPage,
          },
          {
            path: "market",
            name: "workspace-board-market",
            component: WorkspaceBoardMarketPage,
          },
          {
            path: "qna",
            name: "workspace-board-qna",
            component: WorkspaceBoardQnaPage,
          },
        ],
      },
      {
        path: "rank",
        name: "workspace-rank",
        component: WorkspaceRankPage,
      },
      {
        path: "settings",
        meta: { requiresAuth: true },
        component: WorkspaceSettingsLayout,
        children: [
          {
            path: "",
            name: "workspace-settings",
            alias: ["general"],
            component: WorkspaceSettingsPage,
          },
          {
            path: "members",
            name: "workspace-settings-members",
            component: WorkspaceSettingsMembersPage,
          },
          {
            path: "projects",
            name: "workspace-settings-projects",
            component: WorkspaceSettingsProjectsPage,
          },
          {
            path: "license",
            name: "workspace-settings-license",
            component: WorkspaceSettingsLicensePage,
          },
          {
            path: "billing",
            name: "workspace-settings-billing",
            component: WorkspaceSettingsBillingPage,
          },
        ],
      },
    ],
  },
];
