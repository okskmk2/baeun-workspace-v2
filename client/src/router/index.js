import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import ProjectLayout from "../views/ProjectLayout.vue";
import ProjectDetailPage from "../views/ProjectDetailPage.vue";
import ChatDashboardPage from "../views/ChatDashboardPage.vue";
// lazy-loaded page/detail views for boards and pages
// (kept as lazy imports so bundles stay small)

const routes = [
  { path: "/", name: "Home", component: HomePage },
  { path: "/login", name: "Login", component: () => import("../views/LoginPage.vue") },
  { path: "/signup", name: "Signup", component: () => import("../views/SignupPage.vue") },
  { path: "/profile", name: "Profile", component: () => import("../views/ProfilePage.vue") },
  {
    path: "/workspace",
    name: "WorkspaceList",
    component: () => import("../views/WorkspaceListPage.vue"),
  },
  {
    path: "/workspace/create",
    name: "WorkspaceCreate",
    component: () => import("../views/WorkspaceCreatePage.vue"),
  },
  {
    path: "/workspace/:workspaceId",
    name: "WorkspaceDetail",
    component: () => import("../views/WorkspaceDetailPage.vue"),
  },
  {
    path: "/project/:projectId",
    component: ProjectLayout,
    children: [
      { path: "", name: "ProjectDetail", component: ProjectDetailPage },
      {
        path: "issue",
        name: "ProjectIssues",
        component: () => import("../views/IssueDashboardPage.vue"),
      },
      {
        path: "wiki",
        name: "ProjectWiki",
        component: () => import("../views/WikiDashboardPage.vue"),
      },
      { path: "chat", name: "ChatDashboard", component: ChatDashboardPage },
      {
        path: "board/new",
        name: "BoardCreate",
        component: () => import("../views/BoardCreatePage.vue"),
      },
      {
        path: "board/:boardId",
        name: "BoardDetail",
        component: () => import("../views/BoardDetailPage.vue"),
      },
      {
        path: "wiki/new",
        name: "PageCreate",
        component: () => import("../views/PageCreatePage.vue"),
      },
      {
        path: "wiki/:pageId",
        name: "PageDetail",
        component: () => import("../views/PageDetailPage.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFoundPage.vue"),
  },
];

export default createRouter({ history: createWebHistory(), routes });
