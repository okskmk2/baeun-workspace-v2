import PublicLayout from "../views/public/PublicLayout.vue";
import HomeView from "../views/HomeView.vue";
import PricingView from "../views/public/PricingView.vue";
import CartPage from "../views/public/CartPage.vue";
import NotFoundPage from "../views/public/NotFoundPage.vue";
import LoginPage from "../views/public/LoginPage.vue";
import SigupPage from "../views/public/SigupPage.vue";
import SignupCompletePage from "../views/public/SignupCompletePage.vue";
import SettingsLayout from "../views/public/SettingsLayout.vue";
import ProfilePage from "../views/public/ProfilePage.vue";
import SecurityPage from "../views/public/SecurityPage.vue";
import PlanLicensePage from "../views/public/PlanLicensePage.vue";
import BillingPage from "../views/public/BillingPage.vue";
import WorkspaceListPage from "../views/public/WorkspaceListPage.vue";
import WorkspaceDetailPage from "../views/public/WorkspaceDetailPage.vue";
import OpenProjectsPage from "../views/public/OpenProjectsPage.vue";

export const publicRoutes = [
  {
    path: "/",
    component: PublicLayout,
    children: [
      {
        path: "",
        component: HomeView,
      },
      {
        path: "pricing",
        component: PricingView,
      },
      {
        path: "store",
        redirect: "/pricing",
      },
      {
        path: "open-projects",
        component: OpenProjectsPage,
      },
      {
        path: "store/cart",
        component: CartPage,
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
        path: "signup/complete",
        component: SignupCompletePage,
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
