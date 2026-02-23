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
  issue_member: {
    ASSIGNEE: "roles.issue_member.assignee",
    REPORTER: "roles.issue_member.reporter",
    REVIEWER: "roles.issue_member.reviewer",
    WATCHER: "roles.issue_member.watcher",
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

export const useRoleLabels = () => {
  const { t } = useI18n();

  const getRoleLabel = (scope, role) => {
    if (!role) return "";
    const key = ROLE_KEYS[scope]?.[normalizeRole(role)];
    return key ? t(key) : role;
  };

  return { getRoleLabel };
};
