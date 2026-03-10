import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminDashboardPage from "../views/admin/AdminDashboardPage.vue";
import AdminUserWorkspacePage from "../views/admin/AdminUserWorkspacePage.vue";
import AdminBillingPage from "../views/admin/AdminBillingPage.vue";
import AdminNotificationPage from "../views/admin/AdminNotificationPage.vue";

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
    ],
  },
];
