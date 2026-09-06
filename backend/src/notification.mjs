import pool from "./db.mjs";
import { broadcastToUsers } from "./ws.mjs";

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED_TO_ME: "task.assigned_to_me",
  CHANNEL_INVITED_ME: "channel.invited_me",
  TASK_WATCHING_STATUS_CHANGED: "task.watching_status_changed",
  TASK_WATCHING_CONTENT_CHANGED: "task.watching_content_changed",
  TASK_ASSIGNEE_REVIEW_TO_DONE: "task.assignee_review_to_done",
  CHANNEL_NOTICE_PROJECT_NEW_MESSAGE: "channel.notice_project_new_message",
  CHANNEL_NOTICE_WORKSPACE_NEW_MESSAGE: "channel.notice_workspace_new_message",
  PAGE_PERMISSION_REQUESTED: "page_permission_request",
  PAGE_PERMISSION_RESOLVED: "page_permission_resolved",
  SYSTEM_BROADCAST: "system.broadcast",
};

const toUniqueRecipientIds = (recipientIds, actorId) => {
  const actorKey = actorId == null ? null : String(actorId);
  return [...new Set((recipientIds || []).map((id) => String(id)).filter(Boolean))]
    .filter((id) => id !== actorKey)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

export const createNotifications = async (
  {
    recipientIds,
    actorId = null,
    type,
    resourceType = null,
    resourceId = null,
    projectId = null,
    workspaceId = null,
    title,
    body = "",
    payload = {},
  },
  options = {}
) => {
  const db = options.client || pool;
  const recipients = toUniqueRecipientIds(recipientIds, actorId);
  if (!recipients.length) return 0;
  if (!type || !title) return 0;

  const result = await db.query(
    `INSERT INTO notification (
      recipient_id,
      actor_id,
      type,
      resource_type,
      resource_id,
      project_id,
      workspace_id,
      title,
      body,
      payload
    )
    SELECT
      recipient_id,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10::jsonb
    FROM unnest($1::int[]) AS recipient_id`,
    [
      recipients,
      actorId,
      type,
      resourceType,
      resourceId,
      projectId,
      workspaceId,
      title,
      body,
      JSON.stringify(payload || {}),
    ]
  );

  if ((result.rowCount || 0) > 0) {
    broadcastToUsers(recipients, {
      type: "notification",
      data: {
        notification_type: type,
        resource_type: resourceType,
        resource_id: resourceId,
        project_id: projectId,
        workspace_id: workspaceId,
      },
    });
  }

  return result.rowCount || 0;
};
