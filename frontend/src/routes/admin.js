import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminDashboardPage from "../views/admin/AdminDashboardPage.vue";
import AdminMemberApprovalPage from "../views/admin/AdminMemberApprovalPage.vue";
import AdminUserListPage from "../views/admin/AdminUserListPage.vue";
import AdminUserDetailPage from "../views/admin/AdminUserDetailPage.vue";
import AdminWorkspaceListPage from "../views/admin/AdminWorkspaceListPage.vue";
import AdminWorkspaceDetailPage from "../views/admin/AdminWorkspaceDetailPage.vue";
import AdminProjectListPage from "../views/admin/AdminProjectListPage.vue";
import AdminProjectDetailPage from "../views/admin/AdminProjectDetailPage.vue";
import AdminPublicCatalogPage from "../views/admin/AdminPublicCatalogPage.vue";
import AdminUserWorkspacePage from "../views/admin/AdminUserWorkspacePage.vue";
import AdminBillingPage from "../views/admin/AdminBillingPage.vue";
import AdminNotificationPage from "../views/admin/AdminNotificationPage.vue";
import AdminLicenseCatalogPage from "../views/admin/AdminLicenseCatalogPage.vue";
import AdminLicenseWorkspaceUsagePage from "../views/admin/AdminLicenseWorkspaceUsagePage.vue";
import AdminLicenseProjectUsagePage from "../views/admin/AdminLicenseProjectUsagePage.vue";
import AdminLicenseWorkspaceMemberUsagePage from "../views/admin/AdminLicenseWorkspaceMemberUsagePage.vue";

const keepQuery = (name) => (to) => ({ name, query: to.query });

export const adminRoutes = [
  {
    path: "/admin",
    name: "AdminRoot",
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    redirect: { name: "AdminDashboard" },
    children: [
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: AdminDashboardPage,
      },
      {
        path: "people",
        redirect: { name: "AdminApprovals" },
      },
      {
        path: "people/approvals",
        name: "AdminApprovals",
        component: AdminMemberApprovalPage,
      },
      {
        path: "people/users",
        name: "AdminUsers",
        component: AdminUserListPage,
      },
      {
        path: "people/users/:memberId",
        name: "AdminUserDetail",
        component: AdminUserDetailPage,
      },
      {
        path: "tenants",
        redirect: { name: "AdminWorkspaces" },
      },
      {
        path: "tenants/workspaces",
        name: "AdminWorkspaces",
        component: AdminWorkspaceListPage,
      },
      {
        path: "tenants/workspaces/:workspaceId",
        name: "AdminWorkspaceDetail",
        component: AdminWorkspaceDetailPage,
      },
      {
        path: "tenants/projects",
        name: "AdminProjects",
        component: AdminProjectListPage,
      },
      {
        path: "tenants/projects/:projectId",
        name: "AdminProjectDetail",
        component: AdminProjectDetailPage,
      },
      {
        path: "tenants/public-catalog",
        name: "AdminPublicCatalog",
        component: AdminPublicCatalogPage,
      },
      {
        path: "commerce",
        redirect: { name: "AdminLicenses" },
      },
      {
        path: "commerce/licenses",
        name: "AdminLicenses",
        component: AdminLicenseCatalogPage,
      },
      {
        path: "commerce/licenses/workspace",
        name: "AdminLicenseWorkspaceUsage",
        component: AdminLicenseWorkspaceUsagePage,
      },
      {
        path: "commerce/licenses/project",
        name: "AdminLicenseProjectUsage",
        component: AdminLicenseProjectUsagePage,
      },
      {
        path: "commerce/licenses/workspace-member",
        name: "AdminLicenseWorkspaceMemberUsage",
        component: AdminLicenseWorkspaceMemberUsagePage,
      },
      {
        path: "commerce/assignments",
        name: "AdminAssignments",
        component: AdminUserWorkspacePage,
      },
      {
        path: "commerce/payments",
        name: "AdminPayments",
        component: AdminBillingPage,
      },
      {
        path: "communications",
        redirect: { name: "AdminBroadcasts" },
      },
      {
        path: "communications/broadcasts",
        name: "AdminBroadcasts",
        component: AdminNotificationPage,
      },
      { path: "members", redirect: { name: "AdminApprovals" } },
      { path: "users", redirect: { name: "AdminAssignments" } },
      { path: "billing", redirect: { name: "AdminPayments" } },
      { path: "notifications", redirect: { name: "AdminBroadcasts" } },
      { path: "licenses", redirect: { name: "AdminLicenses" } },
      { path: "licenses/workspace", redirect: keepQuery("AdminLicenseWorkspaceUsage") },
      { path: "licenses/project", redirect: keepQuery("AdminLicenseProjectUsage") },
      { path: "licenses/workspace-member", redirect: keepQuery("AdminLicenseWorkspaceMemberUsage") },
    ],
  },
];
