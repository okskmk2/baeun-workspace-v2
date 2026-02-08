import { createWebHistory, createRouter } from "vue-router";
import DefaultLayout from "./views/DefaultLayout.vue";
import HomePage from "./views/HomePage.vue";
import StorePage from "./views/StorePage.vue";
import LoginPage from "./views/LoginPage.vue";
import SigupPage from "./views/SigupPage.vue";
import AccountLayout from "./views/AccountLayout.vue";
import ProfilePage from "./views/ProfilePage.vue";
import SecurityPage from "./views/SecurityPage.vue";
import PlanLicensePage from "./views/PlanLicensePage.vue";
import BillingPage from "./views/BillingPage.vue";
import WorkspaceListPage from "./views/WorkspaceListPage.vue";
import WorkspaceLayout from "./views/WorkspaceLayout.vue";
import WorkspaceHomePage from "./views/WorkspaceHomePage.vue";
import IssueDetailPage from "./views/IssueDetailPage.vue";
import BoardHomePage from "./views/BoardHomePage.vue";
import BoardLayout from "./views/BoardLayout.vue";
import WikiLayout from "./views/WikiLayout.vue";
import MessengerLayout from "./views/MessengerLayout.vue";
import ProjectLayout from "./views/ProjectLayout.vue";
import BoardPage from "./views/BoardPage.vue";
import WikiHomePage from "./views/WikiHomePage.vue";
import WikiPage from "./views/WikiPage.vue";
import MessengerHomePage from "./views/MessengerHomePage.vue";
import MessengerRoomPage from "./views/MessengerRoomPage.vue";
import SettingsLayout from "./views/SettingsLayout.vue";
import SettingsHomePage from "./views/SettingsHomePage.vue";
import SettingsMemberPage from "./views/SettingsMemberPage.vue";
import BlankPage from "./views/BlankPage.vue";
import api from "./lib/axios";

let authChecked = false;
let isAuthenticated = false;

const routes = [
  {
    path: "/",
    component: DefaultLayout,
    children: [
      {
        path: "",
        component: HomePage,
      },
      {
        path: "store",
        component: StorePage,
      },
      {
        path: "login",
        component: LoginPage,
      },
      {
        path: "signup",
        component: SigupPage,
      },
      {
        path: "account",
        meta: { requiresAuth: true },
        component: AccountLayout,
        children: [
          { path: "", redirect: "/account/profile" },
          { path: "profile", component: ProfilePage },
          { path: "security", component: SecurityPage },
          { path: "plan", component: PlanLicensePage }, // 구독+라이선스 통합
          { path: "billing", component: BillingPage },
          { path: "workspaces", component: WorkspaceListPage },
        ],
      },
    ],
  },
  {
    path: "/workspace/:workspaceId",
    meta: { requiresAuth: true },
    component: WorkspaceLayout,
    children: [
      {
        path: "",
        component: WorkspaceHomePage,
      },
      {
        path: "project/:projectId",
        component: ProjectLayout,
        children: [
          {
            path: "",
            beforeEnter: async (to, from) => {
              const { workspaceId, projectId } = to.params;
              return `/workspace/${workspaceId}/project/${projectId}/board`;
            },
            component: BlankPage,
          },
          {
            path: "board",
            component: BoardLayout,
            children: [
              {
                path: "",
                component: BoardHomePage,
              },
              {
                path: ":boardId",
                component: BoardPage,
              },
              {
                path: ":boardId/issue/:issueId",
                component: IssueDetailPage,
              },
            ],
          },
          {
            path: "wiki",
            component: WikiLayout,
            children: [
              {
                path: "",
                component: WikiHomePage,
              },
              {
                path: ":pageId",
                component: WikiPage,
              },
            ],
          },
          {
            path: "messenger",
            component: MessengerLayout,
            children: [
              {
                path: "",
                component: MessengerHomePage,
              },
              {
                path: ":roomId",
                component: MessengerRoomPage,
              },
            ],
          },
          {
            path: "settings",
            component: SettingsLayout,
            children: [
              {
                path: "",
                component: SettingsHomePage,
              },
              {
                path: "member",
                component: SettingsMemberPage,
              },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createRouter({
  routes,
  history: createWebHistory(),
});

router.beforeEach(async (to, from, next) => {
  if (!to.matched.some((record) => record.meta?.requiresAuth)) {
    return next();
  }

  if (authChecked && isAuthenticated) {
    return next();
  }

  try {
    await api.get("/member/me");
    authChecked = true;
    isAuthenticated = true;
    return next();
  } catch (error) {
    authChecked = true;
    isAuthenticated = false;
    return next({ path: "/login", query: { redirect: to.fullPath } });
  }
});
