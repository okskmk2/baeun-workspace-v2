import PublicLayout from "../views/public/PublicLayout.vue";
import HomePage from "../views/public/HomePage.vue";
import StorePage from "../views/public/StorePage.vue";
import NotFoundPage from "../views/public/NotFoundPage.vue";
import LoginPage from "../views/public/LoginPage.vue";
import SigupPage from "../views/public/SigupPage.vue";
import SettingsLayout from "../views/public/SettingsLayout.vue";
import ProfilePage from "../views/public/ProfilePage.vue";
import SecurityPage from "../views/public/SecurityPage.vue";
import PlanLicensePage from "../views/public/PlanLicensePage.vue";
import BillingPage from "../views/public/BillingPage.vue";
import WorkspaceListPage from "../views/public/WorkspaceListPage.vue";
import WorkspaceDetailPage from "../views/public/WorkspaceDetailPage.vue";

export const publicRoutes = [
  {
    path: "/",
    component: PublicLayout,
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
        path: "not-found",
        component: NotFoundPage,
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
        path: "settings",
        meta: { requiresAuth: true },
        component: SettingsLayout,
        children: [
          { path: "", redirect: "/settings/profile" },
          { path: "profile", component: ProfilePage },
          { path: "security", component: SecurityPage },
          { path: "plan", component: PlanLicensePage },
          { path: "billing", component: BillingPage },
          { path: "workspaces", component: WorkspaceListPage },
          { path: "workspaces/:workspaceId", component: WorkspaceDetailPage },
        ],
      },
    ],
  },
];
