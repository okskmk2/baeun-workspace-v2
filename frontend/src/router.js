import { createWebHistory, createRouter } from "vue-router";
import { routes } from "./routes";
import { useAppStore } from "./stores/appStore";
import { useProjectMemberStore } from "./stores/projectMemberStore";

let isAuthenticated = false;

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
      return next({ path: "/settings" });
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
