import pool from "../db.mjs";
import { REMEMBER_SESSION_TTL_MS } from "../config/session.mjs";

const MAX_CONCURRENT_SESSIONS = 4;

export const normalizeRememberValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "on";
  }
  return false;
};

export const getMemberApprovalStatusMessage = (approvalStatus) => {
  const normalized = String(approvalStatus || "").toUpperCase();
  if (normalized === "PENDING") return "Signup request is pending approval.";
  if (normalized === "REJECTED") return "Signup request was rejected.";
  return "Signup approval is required.";
};

export const assertMemberLoginAllowed = (user) => {
  const approvalStatus = String(user?.approval_status || "").toUpperCase();
  if (approvalStatus !== "APPROVED") {
    return {
      ok: false,
      status: 403,
      body: {
        name: "Forbidden",
        message: getMemberApprovalStatusMessage(approvalStatus),
      },
    };
  }

  const accountStatus = String(user?.account_status || "ACTIVE").toUpperCase();
  if (accountStatus === "SUSPENDED") {
    return {
      ok: false,
      status: 403,
      body: {
        name: "Forbidden",
        message: "Account is suspended.",
      },
    };
  }

  return { ok: true, approvalStatus, accountStatus };
};

const enforceSessionLimit = async (userId, currentSid) => {
  const sessionsResult = await pool.query(
    `SELECT sid
     FROM session
     WHERE sess ->> 'userId' = $1
     ORDER BY created_at ASC, sid ASC`,
    [String(userId)]
  );

  const overflowCount = sessionsResult.rows.length - MAX_CONCURRENT_SESSIONS;
  if (overflowCount <= 0) return;

  const deleteSids = [];
  for (const row of sessionsResult.rows) {
    if (row.sid === currentSid) continue;
    deleteSids.push(row.sid);
    if (deleteSids.length === overflowCount) break;
  }

  if (deleteSids.length === 0) return;

  await pool.query("DELETE FROM session WHERE sid = ANY($1::varchar[])", [deleteSids]);
};

export const establishMemberSession = async (req, user, { remember } = {}) => {
  req.session.userId = user.id;
  req.session.userName = user.name;
  req.session.userRole = user.role_name;
  if (normalizeRememberValue(remember)) {
    req.session.cookie.maxAge = REMEMBER_SESSION_TTL_MS;
  } else {
    req.session.cookie.expires = false;
  }
  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
  await enforceSessionLimit(user.id, req.sessionID);
};

export const toPublicMember = (user, approvalStatus, accountStatus) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role_name: user.role_name,
  approval_status: approvalStatus || String(user.approval_status || "").toUpperCase(),
  account_status: accountStatus || String(user.account_status || "ACTIVE").toUpperCase(),
});
