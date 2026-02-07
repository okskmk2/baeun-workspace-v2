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
import IssueLayout from "./views/IssueLayout.vue";
import BoardHomePage from "./views/BoardHomePage.vue";
import BoardLayout from "./views/BoardLayout.vue";
import WikiLayout from "./views/WikiLayout.vue";
import MessengerLayout from "./views/MessengerLayout.vue";
import ProjectLayout from "./views/ProjectLayout.vue";
import ProjectHomePage from "./views/ProjectHomePage.vue";
import BoardPage from "./views/BoardPage.vue";

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
            component: ProjectHomePage,
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
            ],
          },
          {
            path: "wiki",
            component: WikiLayout,
            children: [
              {
                path: "",
                component: BoardHomePage,
              },
            ],
          },
          {
            path: "messenger",
            component: MessengerLayout,
            children: [
              {
                path: "",
                component: BoardHomePage,
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
