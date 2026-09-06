export const writeAdminAudit = async (
  db,
  { actorId, action, targetType, targetId = null, beforeData = null, afterData = null }
) => {
  await db.query(
    `INSERT INTO admin_audit_log (
      actor_id,
      action,
      target_type,
      target_id,
      before_data,
      after_data
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      actorId,
      action,
      targetType,
      targetId,
      beforeData == null ? null : JSON.stringify(beforeData),
      afterData == null ? null : JSON.stringify(afterData),
    ]
  );
};

export const revokeMemberSessions = async (db, memberId, { exceptSid } = {}) => {
  if (exceptSid) {
    await db.query(`DELETE FROM session WHERE sess ->> 'userId' = $1 AND sid <> $2`, [
      String(memberId),
      exceptSid,
    ]);
    return;
  }

  await db.query(`DELETE FROM session WHERE sess ->> 'userId' = $1`, [String(memberId)]);
};
