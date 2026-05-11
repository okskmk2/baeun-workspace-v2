export const resolveNotificationPath = (notification, fallbackProjectId) => {
  const projectId = notification.project_id || fallbackProjectId;
  const payload = notification.payload || {};
  const type = String(notification.type || "");

  // 페이지 편집 권한 신청 — 관리자를 권한 신청 관리 탭으로
  if (type === "page_permission_request" && projectId) {
    return `/project/${projectId}/settings/permissions`;
  }

  // 페이지 편집 권한 처리 결과 — 신청자를 해당 위키 페이지로
  if (type === "page_permission_resolved") {
    const pageId = payload.page_id || notification.resource_id;
    if (projectId && pageId) {
      return `/project/${projectId}/wiki/${pageId}`;
    }
    if (projectId) {
      return `/project/${projectId}/wiki`;
    }
  }

  const channelId = payload.channel_id || notification.resource_id;
  const taskId = payload.task_id || payload.issue_id || notification.resource_id;
  const kanbanId = payload.kanban_id || payload.board_id;

  if (type === "issue.assigned_to_me" && projectId && kanbanId && taskId) {
    return `/project/${projectId}/kanban/${kanbanId}/task/${taskId}`;
  }

  if (notification.resource_type === "channel" && projectId && channelId) {
    return `/project/${projectId}/channel/${channelId}`;
  }

  if (notification.resource_type === "issue" && projectId) {
    return `/project/${projectId}/kanban`;
  }

  if (projectId) {
    return `/project/${projectId}/kanban`;
  }

  return "";
};

export const getNotificationIcon = (notification) => {
  const type = String(notification?.type || "");
  if (type === "page_permission_request") return "lock_open";
  if (type === "page_permission_resolved") return "lock";
  if (type.includes("assigned")) return "assignment_ind";
  if (type.includes("status")) return "task_alt";
  if (type.includes("content")) return "edit_note";
  if (type.includes("invited")) return "group_add";
  if (type.includes("notice")) return "campaign";
  return "notifications";
};
