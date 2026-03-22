import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminDashboardPage from "../views/admin/AdminDashboardPage.vue";
import AdminUserWorkspacePage from "../views/admin/AdminUserWorkspacePage.vue";
import AdminBillingPage from "../views/admin/AdminBillingPage.vue";
import AdminNotificationPage from "../views/admin/AdminNotificationPage.vue";
import AdminLicenseCatalogPage from "../views/admin/AdminLicenseCatalogPage.vue";
import AdminLicenseWorkspaceUsagePage from "../views/admin/AdminLicenseWorkspaceUsagePage.vue";
import AdminLicenseProjectUsagePage from "../views/admin/AdminLicenseProjectUsagePage.vue";
import AdminLicenseWorkspaceMemberUsagePage from "../views/admin/AdminLicenseWorkspaceMemberUsagePage.vue";

export const adminRoutes = [
  {
    path: "/admin",
    name: "AdminRoot",
    component: AdminLayout,
    meta: { requiresAuth: true },
    redirect: { name: "AdminDashboard" },
    children: [
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: AdminDashboardPage,
      },
      {
        path: "users",
        name: "AdminUserWorkspaceManager",
        component: AdminUserWorkspacePage,
      },
      {
        path: "billing",
        name: "AdminBillingManager",
        component: AdminBillingPage,
      },
      {
        path: "notifications",
        name: "AdminNotificationManager",
        component: AdminNotificationPage,
      },
      {
        path: "licenses",
        name: "AdminLicenseManager",
        component: AdminLicenseCatalogPage,
      },
      {
        path: "licenses/workspace",
        name: "AdminLicenseWorkspaceUsage",
        component: AdminLicenseWorkspaceUsagePage,
      },
      {
        path: "licenses/project",
        name: "AdminLicenseProjectUsage",
        component: AdminLicenseProjectUsagePage,
      },
      {
        path: "licenses/workspace-member",
        name: "AdminLicenseWorkspaceMemberUsage",
        component: AdminLicenseWorkspaceMemberUsagePage,
      },
    ],
  },
];
