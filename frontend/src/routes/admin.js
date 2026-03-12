import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminDashboardPage from "../views/admin/AdminDashboardPage.vue";
import AdminUserWorkspacePage from "../views/admin/AdminUserWorkspacePage.vue";
import AdminBillingPage from "../views/admin/AdminBillingPage.vue";
import AdminNotificationPage from "../views/admin/AdminNotificationPage.vue";
import AdminLicenseCatalogPage from "../views/admin/AdminLicenseCatalogPage.vue";
import AdminLicenseWorkspaceSlotDetailPage from "../views/admin/AdminLicenseWorkspaceSlotDetailPage.vue";
import AdminLicenseProjectSlotDetailPage from "../views/admin/AdminLicenseProjectSlotDetailPage.vue";
import AdminLicenseWorkspaceMemberSlotDetailPage from "../views/admin/AdminLicenseWorkspaceMemberSlotDetailPage.vue";

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
        path: "licenses/workspace-slot",
        name: "AdminLicenseWorkspaceSlotDetail",
        component: AdminLicenseWorkspaceSlotDetailPage,
      },
      {
        path: "licenses/project-slot",
        name: "AdminLicenseProjectSlotDetail",
        component: AdminLicenseProjectSlotDetailPage,
      },
      {
        path: "licenses/workspace-member-slot",
        name: "AdminLicenseWorkspaceMemberSlotDetail",
        component: AdminLicenseWorkspaceMemberSlotDetailPage,
      },
    ],
  },
];
