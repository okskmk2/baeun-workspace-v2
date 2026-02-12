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
import WorkspaceDetailPage from "./views/WorkspaceDetailPage.vue";
import WorkspaceLayout from "./views/WorkspaceLayout.vue";
import WorkspaceHomePage from "./views/WorkspaceHomePage.vue";
import IssueDetailPage from "./views/IssueDetailPage.vue";
import BoardHomePage from "./views/BoardHomePage.vue";
import BoardLayout from "./views/BoardLayout.vue";
import WikiLayout from "./views/WikiLayout.vue";
import MessengerLayout from "./views/MessengerLayout.vue";
import ProjectLayout from "./views/ProjectLayout.vue";
import BoardPage from "./views/BoardPage.vue";
import BoardSettingsPage from "./views/BoardSettingsPage.vue";
import WikiHomePage from "./views/WikiHomePage.vue";
import WikiPage from "./views/WikiPage.vue";
import MessengerHomePage from "./views/MessengerHomePage.vue";
import MessengerRoomPage from "./views/MessengerRoomPage.vue";
import MessengerSettingsPage from "./views/MessengerSettingsPage.vue";
import SettingsLayout from "./views/SettingsLayout.vue";
import SettingsHomePage from "./views/SettingsHomePage.vue";
import SettingsMemberPage from "./views/SettingsMemberPage.vue";
import BlankPage from "./views/BlankPage.vue";
import BacklogPage from "./views/BacklogPage.vue";
import { useAppStore } from "./stores/appStore";
import { useProjectMemberStore } from "./stores/projectMemberStore";

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
          { path: "plan", component: PlanLicensePage }, // 구독+?�이?�스 ?�합
          { path: "billing", component: BillingPage },
          { path: "workspaces", component: WorkspaceListPage },
          { path: "workspaces/:workspaceId", component: WorkspaceDetailPage },
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
    ],
  },
  {
    path: "/project/:projectId",
    component: ProjectLayout,
    children: [
      {
        path: "",
        beforeEnter: async (to, from) => {
          const { projectId } = to.params;
          return `/project/${projectId}/board`;
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
            path: ":boardId/settings",
            component: BoardSettingsPage,
          },
          {
            path: ":boardId/issue/:issueId",
            component: IssueDetailPage,
          },
          {
            path: "backlog",
            component: BacklogPage,
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
            path: ":roomId/settings",
            component: MessengerSettingsPage,
          },
          {
            path: ":roomId",
            component: MessengerRoomPage,
          },
        ],
      },
      {
        path: "settings",
        meta: { requiresProjectAdmin: true },
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
];

export const router = createRouter({
  routes,
  history: createWebHistory(),
});

router.beforeEach(async (to, from, next) => {
  const appStore = useAppStore();
  const projectMemberStore = useProjectMemberStore();

  if (typeof window !== "undefined" && window.sessionStorage.getItem("auth:force-logout") === "1") {
    appStore.setCurrentUser(null);
    window.sessionStorage.removeItem("auth:force-logout");
  }

  isAuthenticated = Boolean(appStore.currentUser);
  const requiresProjectAdmin = to.matched.some((record) => record.meta?.requiresProjectAdmin);
  if (requiresProjectAdmin && isAuthenticated) {
    const { projectId } = to.params;
    if (!projectId) {
      return next({ path: "/account" });
    }

    try {
      const members = await projectMemberStore.fetchProjectMembers(projectId);
      const currentUserId = appStore.currentUser?.id;
      const currentMember = members.find((member) => String(member.id) === String(currentUserId));
      const role = String(currentMember?.role_name || "").toUpperCase();

      if (!["OWNER", "ADMIN"].includes(role)) {
        return next({ path: `/project/${projectId}/board` });
      }
    } catch (error) {
      return next({ path: `/project/${projectId}/board` });
    }
  }

  return next();
});
