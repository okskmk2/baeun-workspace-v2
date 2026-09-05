import { createWebHistory, createRouter } from "vue-router";
import { routes } from "./routes";
import { useAppStore } from "./stores/appStore";
import { useProjectMemberStore } from "./stores/projectMemberStore";
import api from "./lib/axios";
import { AUTH_SKIP_REDIRECT_PARAM, AUTH_SKIP_REDIRECT_VALUE } from "./lib/authFlags";

const skipAuthRedirectParams = { [AUTH_SKIP_REDIRECT_PARAM]: AUTH_SKIP_REDIRECT_VALUE };

const canViewPublicly = async (url) => {
  try {
    await api.get(url, { params: skipAuthRedirectParams });
    return true;
  } catch {
    return false;
  }
};

export const router = createRouter({
  routes,
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return {
        el: to.hash,
        top: 64,
        behavior: reduce ? "auto" : "smooth",
      };
    }
    if (to.path !== from.path) return { top: 0 };
    return undefined;
  },
});

router.beforeEach(async (to, from, next) => {
  const appStore = useAppStore();
  const projectMemberStore = useProjectMemberStore();

  if (typeof window !== "undefined" && window.sessionStorage.getItem("auth:force-logout") === "1") {
    appStore.setCurrentUser(null);
    window.sessionStorage.removeItem("auth:force-logout");
  }

  const isAuthenticated = Boolean(appStore.currentUser);
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta?.requiresAdmin);
  const requiresProjectMember = to.matched.some((record) => record.meta?.requiresProjectMember);
  const requiresProjectAdmin = to.matched.some((record) => record.meta?.requiresProjectAdmin);
  const requiresWorkspaceView = to.matched.some((record) => record.meta?.requiresWorkspaceView);
  const requiresProjectView = to.matched.some((record) => record.meta?.requiresProjectView);

  if ((requiresAuth || requiresAdmin || requiresProjectMember || requiresProjectAdmin) && !isAuthenticated) {
    return next({ path: "/login" });
  }

  if (requiresWorkspaceView && !isAuthenticated) {
    const { workspaceId } = to.params;
    const isPublic = await canViewPublicly(`/workspaces/${workspaceId}`);
    if (!isPublic) {
      return next({ path: "/login" });
    }
  }

  if (requiresAdmin) {
    const roleName = String(appStore.currentUser?.role_name || "").toUpperCase();
    if (roleName !== "SYSTEM_ADMIN") {
      return next({ path: "/" });
    }
  }

  if (requiresProjectView) {
    const { projectId } = to.params;
    if (!isAuthenticated) {
      const isPublic = await canViewPublicly(`/projects/${projectId}`);
      if (!isPublic) {
        return next({ path: "/login" });
      }
    } else {
      try {
        const members = await projectMemberStore.fetchProjectMembers(projectId);
        const currentUserId = appStore.currentUser?.id;
        const isMember = members.some((m) => String(m.id) === String(currentUserId));
        if (!isMember) {
          const isPublic = await canViewPublicly(`/projects/${projectId}`);
          if (!isPublic) {
            return next({ path: `/project/${projectId}/forbidden` });
          }
        }
      } catch {
        const isPublic = await canViewPublicly(`/projects/${projectId}`);
        if (!isPublic) {
          return next({ path: `/project/${projectId}/forbidden` });
        }
      }
    }
  }

  if (requiresProjectMember) {
    const { projectId } = to.params;
    try {
      const members = await projectMemberStore.fetchProjectMembers(projectId);
      const currentUserId = appStore.currentUser?.id;
      const isMember = members.some((m) => String(m.id) === String(currentUserId));
      if (!isMember) {
        return next({ path: `/project/${projectId}/forbidden` });
      }
    } catch {
      return next({ path: `/project/${projectId}/forbidden` });
    }
  }

  if (requiresProjectAdmin) {
    const { projectId } = to.params;
    if (!projectId) {
      return next({ path: "/settings" });
    }

    try {
      const members = await projectMemberStore.fetchProjectMembers(projectId);
      const currentUserId = appStore.currentUser?.id;
      const currentMember = members.find((member) => String(member.id) === String(currentUserId));
      const role = String(currentMember?.role_name || "").toUpperCase();

      if (!["OWNER", "ADMIN"].includes(role)) {
        return next({ path: `/project/${projectId}/kanban` });
      }
    } catch (error) {
      return next({ path: `/project/${projectId}/kanban` });
    }
  }

  return next();
});
