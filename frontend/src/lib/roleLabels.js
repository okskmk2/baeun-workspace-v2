import { useI18n } from "vue-i18n";

const ROLE_KEYS = {
  workspace_member: {
    OWNER: "roles.workspace_member.owner",
    ADMIN: "roles.workspace_member.admin",
    MEMBER: "roles.workspace_member.member",
    GUEST: "roles.workspace_member.guest",
  },
  project_member: {
    OWNER: "roles.project_member.owner",
    ADMIN: "roles.project_member.admin",
    MEMBER: "roles.project_member.member",
    GUEST: "roles.project_member.guest",
  },
  task_member: {
    ASSIGNEE: "roles.task_member.assignee",
    REPORTER: "roles.task_member.reporter",
    REVIEWER: "roles.task_member.reviewer",
    WATCHER: "roles.task_member.watcher",
  },
  page_member: {
    OWNER: "roles.page_member.owner",
    EDITOR: "roles.page_member.editor",
    VIEWER: "roles.page_member.viewer",
  },
  channel_member: {
    OWNER: "roles.channel_member.owner",
    ADMIN: "roles.channel_member.admin",
    MEMBER: "roles.channel_member.member",
    GUEST: "roles.channel_member.guest",
  },
};

const normalizeRole = (role) => String(role || "").toUpperCase();

const TASK_ROLE_ICON_NAMES = {
  ASSIGNEE: "build",
  REPORTER: "brand_awareness",
  WATCHER: "visibility",
  REVIEWER: "fact_check",
};

const TASK_ROLE_VARIANTS = {
  ASSIGNEE: "success",
  REPORTER: "info",
  REVIEWER: "warning",
  WATCHER: "default",
};

export const getTaskRoleIconName = (role) => TASK_ROLE_ICON_NAMES[normalizeRole(role)] || "person";
export const getTaskRoleVariant = (role) => TASK_ROLE_VARIANTS[normalizeRole(role)] || "default";

export const useRoleLabels = () => {
  const { t } = useI18n();

  const getRoleLabel = (scope, role) => {
    if (!role) return "";
    const key = ROLE_KEYS[scope]?.[normalizeRole(role)];
    return key ? t(key) : role;
  };

  return { getRoleLabel };
};
