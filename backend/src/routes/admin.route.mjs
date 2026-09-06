import express from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import pool from "../db.mjs";
import { isAuth, isSystemAdmin } from "../middlewares/auth.middleware.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import { createNotifications, NOTIFICATION_TYPES } from "../notification.mjs";
import { writeAdminAudit, revokeMemberSessions } from "../utils/adminAudit.mjs";
import { normalizeUpper, parseBooleanQuery, parsePositiveInt } from "../utils/parsers.mjs";
import { getActiveSocketCount } from "../ws.mjs";

const router = express.Router();

router.use(isAuth, isSystemAdmin);

const APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);
const MEMBER_ROLES = new Set(["MEMBER", "SYSTEM_ADMIN"]);
const ACCOUNT_STATUSES = new Set(["ACTIVE", "SUSPENDED"]);
const PAYMENT_STATUSES = new Set(["PENDING", "SUCCESS", "FAILED", "CANCELED", "REFUNDED"]);
const BROADCAST_TARGETS = new Set(["ALL", "WORKSPACE", "MEMBERS"]);
const PASSWORD_SALT_ROUNDS = 10;

const isSelf = (req, memberId) => Number(req.systemAdmin?.id) === Number(memberId);

const buildPagination = (page, pageSize, total) => {
  const safeTotal = Number(total || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize) || 1);
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);
  return {
    page: normalizedPage,
    pageSize,
    total: safeTotal,
    totalPages,
    offset: (normalizedPage - 1) * pageSize,
  };
};

const whereFromConditions = (conditions) => (conditions.length ? `WHERE ${conditions.join(" AND ")}` : "");

router.get("/dashboard", async (_req, res) => {
  try {
    const [
      memberRes,
      pendingRes,
      todayRes,
      workspaceRes,
      publicWorkspaceRes,
      projectRes,
      publicProjectRes,
      paymentAllRes,
      payment30dRes,
      expiringCountRes,
      pendingItemsRes,
      expiringItemsRes,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM member"),
      pool.query("SELECT COUNT(*)::int AS total FROM member WHERE approval_status = 'PENDING'"),
      pool.query(
        "SELECT COUNT(*)::int AS total FROM member WHERE created_at >= date_trunc('day', CURRENT_TIMESTAMP)"
      ),
      pool.query("SELECT COUNT(*)::int AS total FROM workspace"),
      pool.query("SELECT COUNT(*)::int AS total FROM workspace WHERE is_public = true"),
      pool.query("SELECT COUNT(*)::int AS total FROM project"),
      pool.query("SELECT COUNT(*)::int AS total FROM project WHERE is_public = true"),
      pool.query(
        "SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM payment WHERE status = 'SUCCESS'"
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0)::numeric AS total
         FROM payment
         WHERE status = 'SUCCESS'
           AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM purchased_license
         WHERE status = 'ACTIVE'
           AND end_date IS NOT NULL
           AND end_date >= CURRENT_TIMESTAMP
           AND end_date < CURRENT_TIMESTAMP + INTERVAL '14 days'`
      ),
      pool.query(
        `SELECT id, name, email, created_at
         FROM member
         WHERE approval_status = 'PENDING'
         ORDER BY created_at DESC, id DESC
         LIMIT 8`
      ),
      pool.query(
        `SELECT
          pl.id,
          pl.quantity,
          pl.end_date,
          l.name AS license_name,
          l.target_resource,
          COALESCE(m.name, w.name) AS target_name
         FROM purchased_license pl
         JOIN license l ON l.id = pl.license_id
         LEFT JOIN member m ON m.id = pl.owner_member_id
         LEFT JOIN workspace w ON w.id = pl.target_workspace_id
         WHERE pl.status = 'ACTIVE'
           AND pl.end_date IS NOT NULL
           AND pl.end_date >= CURRENT_TIMESTAMP
           AND pl.end_date < CURRENT_TIMESTAMP + INTERVAL '14 days'
         ORDER BY pl.end_date ASC
         LIMIT 8`
      ),
    ]);

    res.json({
      kpis: {
        members: memberRes.rows[0]?.total || 0,
        pendingApprovals: pendingRes.rows[0]?.total || 0,
        todaySignups: todayRes.rows[0]?.total || 0,
        workspaces: workspaceRes.rows[0]?.total || 0,
        publicWorkspaces: publicWorkspaceRes.rows[0]?.total || 0,
        projects: projectRes.rows[0]?.total || 0,
        publicProjects: publicProjectRes.rows[0]?.total || 0,
        paymentTotal: Number(paymentAllRes.rows[0]?.total || 0),
        paymentTotal30d: Number(payment30dRes.rows[0]?.total || 0),
        expiringLicenses: expiringCountRes.rows[0]?.total || 0,
        onlineSockets: getActiveSocketCount(),
      },
      pendingApprovals: pendingItemsRes.rows,
      expiringLicenses: expiringItemsRes.rows,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/users", withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;
  const keyword = String(req.query.q || "").trim();
  const approvalStatus = normalizeUpper(req.query.approvalStatus);
  const roleName = normalizeUpper(req.query.roleName);
  const accountStatus = normalizeUpper(req.query.accountStatus);

  const conditions = [];
  const values = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(`(m.name ILIKE $${values.length} OR m.email ILIKE $${values.length})`);
  }
  if (APPROVAL_STATUSES.has(approvalStatus)) {
    values.push(approvalStatus);
    conditions.push(`m.approval_status = $${values.length}`);
  }
  if (MEMBER_ROLES.has(roleName)) {
    values.push(roleName);
    conditions.push(`UPPER(m.role_name) = $${values.length}`);
  }
  if (ACCOUNT_STATUSES.has(accountStatus)) {
    values.push(accountStatus);
    conditions.push(`COALESCE(m.account_status, 'ACTIVE') = $${values.length}`);
  }

  const whereClause = whereFromConditions(conditions);

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM member m ${whereClause}`,
      values
    );
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);
    const listValues = [...values, pagination.pageSize, pagination.offset];

    const listRes = await pool.query(
      `SELECT
        m.id,
        m.name,
        m.email,
        m.role_name,
        m.approval_status,
        COALESCE(m.account_status, 'ACTIVE') AS account_status,
        m.locale,
        m.region,
        m.created_at,
        (SELECT COUNT(*)::int FROM workspace_member wm WHERE wm.member_id = m.id) AS workspace_count,
        (
          SELECT COALESCE(SUM(pl.quantity), 0)::int
          FROM purchased_license pl
          WHERE pl.owner_member_id = m.id AND pl.status = 'ACTIVE'
        ) AS active_license_quantity
       FROM member m
       ${whereClause}
       ORDER BY m.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/users/:memberId", async (req, res) => {
  const memberId = parsePositiveInt(req.params.memberId);
  if (!memberId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid memberId." });
  }

  try {
    const memberRes = await pool.query(
      `SELECT id, name, email, role_name, approval_status,
              COALESCE(account_status, 'ACTIVE') AS account_status,
              locale, region, img_url, created_at
       FROM member
       WHERE id = $1`,
      [memberId]
    );
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const [workspaceRes, projectRes, licenseRes, sessionRes] = await Promise.all([
      pool.query(
        `SELECT w.id, w.name, w.is_public, w.is_default, wm.role_name
         FROM workspace_member wm
         JOIN workspace w ON w.id = wm.workspace_id
         WHERE wm.member_id = $1
         ORDER BY w.id DESC`,
        [memberId]
      ),
      pool.query(
        `SELECT p.id, p.name, p.is_public, p.workspace_id, w.name AS workspace_name, pm.role_name
         FROM project_member pm
         JOIN project p ON p.id = pm.project_id
         JOIN workspace w ON w.id = p.workspace_id
         WHERE pm.member_id = $1
         ORDER BY p.id DESC`,
        [memberId]
      ),
      pool.query(
        `SELECT
          pl.id,
          pl.quantity,
          pl.status,
          pl.start_date,
          pl.end_date,
          pl.target_workspace_id,
          l.target_resource,
          l.billing_cycle,
          COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS license_name
         FROM purchased_license pl
         JOIN license l ON l.id = pl.license_id
         WHERE pl.owner_member_id = $1
         ORDER BY pl.created_at DESC`,
        [memberId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS session_count
         FROM session
         WHERE sess ->> 'userId' = $1`,
        [String(memberId)]
      ),
    ]);

    res.json({
      member: memberRes.rows[0],
      workspaces: workspaceRes.rows,
      projects: projectRes.rows,
      licenses: licenseRes.rows,
      session_count: sessionRes.rows[0]?.session_count || 0,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/workspaces", withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;
  const keyword = String(req.query.q || "").trim();
  const isPublic = parseBooleanQuery(req.query.isPublic);

  const conditions = [];
  const values = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(`(w.name ILIKE $${values.length} OR owner.name ILIKE $${values.length} OR owner.email ILIKE $${values.length})`);
  }
  if (isPublic !== null) {
    values.push(isPublic);
    conditions.push(`w.is_public = $${values.length}`);
  }

  const whereClause = whereFromConditions(conditions);

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM workspace w
       LEFT JOIN member owner ON owner.id = w.member_id
       ${whereClause}`,
      values
    );
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);
    const listValues = [...values, pagination.pageSize, pagination.offset];

    const listRes = await pool.query(
      `SELECT
        w.id,
        w.name,
        w.summary,
        w.is_public,
        w.is_default,
        w.created_at,
        w.member_id,
        owner.name AS owner_name,
        owner.email AS owner_email,
        (SELECT COUNT(DISTINCT wm.member_id)::int FROM workspace_member wm WHERE wm.workspace_id = w.id) AS member_count,
        (SELECT COUNT(*)::int FROM project p WHERE p.workspace_id = w.id) AS project_count,
        (
          SELECT COALESCE(SUM(pl.quantity), 0)::int
          FROM purchased_license pl
          WHERE pl.target_workspace_id = w.id AND pl.status = 'ACTIVE'
        ) AS active_license_quantity
       FROM workspace w
       LEFT JOIN member owner ON owner.id = w.member_id
       ${whereClause}
       ORDER BY w.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/workspaces/:workspaceId", async (req, res) => {
  const workspaceId = parsePositiveInt(req.params.workspaceId);
  if (!workspaceId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid workspaceId." });
  }

  try {
    const workspaceRes = await pool.query(
      `SELECT
        w.id,
        w.name,
        w.summary,
        w.is_public,
        w.is_default,
        w.created_at,
        w.member_id,
        owner.name AS owner_name,
        owner.email AS owner_email
       FROM workspace w
       LEFT JOIN member owner ON owner.id = w.member_id
       WHERE w.id = $1`,
      [workspaceId]
    );
    if (workspaceRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Workspace not found." });
    }

    const [memberRes, projectRes, licenseRes] = await Promise.all([
      pool.query(
        `SELECT m.id, m.name, m.email, wm.role_name, wm.created_at
         FROM workspace_member wm
         JOIN member m ON m.id = wm.member_id
         WHERE wm.workspace_id = $1
         ORDER BY
           CASE wm.role_name WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
           m.id`,
        [workspaceId]
      ),
      pool.query(
        `SELECT
          p.id,
          p.name,
          p.summary,
          p.is_public,
          p.is_default,
          p.created_at,
          COUNT(DISTINCT pm.member_id)::int AS member_count
         FROM project p
         LEFT JOIN project_member pm ON pm.project_id = p.id
         WHERE p.workspace_id = $1
         GROUP BY p.id
         ORDER BY p.id DESC`,
        [workspaceId]
      ),
      pool.query(
        `SELECT
          pl.id,
          pl.quantity,
          pl.status,
          pl.start_date,
          pl.end_date,
          l.target_resource,
          l.billing_cycle,
          COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS license_name
         FROM purchased_license pl
         JOIN license l ON l.id = pl.license_id
         WHERE pl.target_workspace_id = $1
         ORDER BY pl.created_at DESC`,
        [workspaceId]
      ),
    ]);

    res.json({
      workspace: workspaceRes.rows[0],
      members: memberRes.rows,
      projects: projectRes.rows,
      licenses: licenseRes.rows,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/workspaces/:workspaceId", async (req, res) => {
  const workspaceId = parsePositiveInt(req.params.workspaceId);
  if (!workspaceId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid workspaceId." });
  }
  if (req.body?.is_public !== false) {
    return res.status(400).json({
      name: "BadRequest",
      message: "Only force-unpublish (is_public=false) is allowed.",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updateRes = await client.query(
      `UPDATE workspace
       SET is_public = false
       WHERE id = $1
       RETURNING id, name, is_public`,
      [workspaceId]
    );
    if (updateRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "Workspace not found." });
    }

    const projectRes = await client.query(
      `UPDATE project
       SET is_public = false
       WHERE workspace_id = $1
       RETURNING id`,
      [workspaceId]
    );

    await writeAdminAudit(client, {
      actorId: req.systemAdmin.id,
      action: "workspace.unpublish",
      targetType: "workspace",
      targetId: workspaceId,
      beforeData: { is_public: true },
      afterData: {
        is_public: false,
        unpublished_project_count: projectRes.rows.length,
      },
    });

    await client.query("COMMIT");
    res.json({
      message: "Workspace unpublished.",
      workspace: updateRes.rows[0],
      unpublished_project_count: projectRes.rows.length,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.get("/projects", withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;
  const keyword = String(req.query.q || "").trim();
  const isPublic = parseBooleanQuery(req.query.isPublic);
  const workspaceId = parsePositiveInt(req.query.workspaceId);

  const conditions = [];
  const values = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(`(p.name ILIKE $${values.length} OR w.name ILIKE $${values.length})`);
  }
  if (isPublic !== null) {
    values.push(isPublic);
    conditions.push(`p.is_public = $${values.length}`);
  }
  if (workspaceId) {
    values.push(workspaceId);
    conditions.push(`p.workspace_id = $${values.length}`);
  }

  const whereClause = whereFromConditions(conditions);

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM project p
       JOIN workspace w ON w.id = p.workspace_id
       ${whereClause}`,
      values
    );
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);
    const listValues = [...values, pagination.pageSize, pagination.offset];

    const listRes = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.summary,
        p.is_public,
        p.is_default,
        p.created_at,
        p.workspace_id,
        w.name AS workspace_name,
        w.is_public AS workspace_is_public,
        COUNT(DISTINCT pm.member_id)::int AS member_count
       FROM project p
       JOIN workspace w ON w.id = p.workspace_id
       LEFT JOIN project_member pm ON pm.project_id = p.id
       ${whereClause}
       GROUP BY p.id, w.name, w.is_public
       ORDER BY p.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/projects/:projectId", async (req, res) => {
  const projectId = parsePositiveInt(req.params.projectId);
  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid projectId." });
  }

  try {
    const projectRes = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.summary,
        p.is_public,
        p.is_default,
        p.created_at,
        p.workspace_id,
        w.name AS workspace_name,
        w.is_public AS workspace_is_public
       FROM project p
       JOIN workspace w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Project not found." });
    }

    const [memberRes, countsRes] = await Promise.all([
      pool.query(
        `SELECT m.id, m.name, m.email, pm.role_name, pm.created_at
         FROM project_member pm
         JOIN member m ON m.id = pm.member_id
         WHERE pm.project_id = $1
         ORDER BY
           CASE pm.role_name WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END,
           m.id`,
        [projectId]
      ),
      pool.query(
        `SELECT
          (SELECT COUNT(*)::int FROM page WHERE project_id = $1) AS page_count,
          (SELECT COUNT(*)::int FROM kanban WHERE project_id = $1) AS kanban_count,
          (SELECT COUNT(*)::int FROM channel WHERE project_id = $1) AS channel_count,
          (SELECT COUNT(*)::int FROM data_table WHERE project_id = $1) AS data_table_count`,
        [projectId]
      ),
    ]);

    res.json({
      project: projectRes.rows[0],
      members: memberRes.rows,
      counts: countsRes.rows[0] || {
        page_count: 0,
        kanban_count: 0,
        channel_count: 0,
        data_table_count: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/projects/:projectId", async (req, res) => {
  const projectId = parsePositiveInt(req.params.projectId);
  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid projectId." });
  }
  if (req.body?.is_public !== false) {
    return res.status(400).json({
      name: "BadRequest",
      message: "Only force-unpublish (is_public=false) is allowed.",
    });
  }

  try {
    const updateRes = await pool.query(
      `UPDATE project
       SET is_public = false
       WHERE id = $1
       RETURNING id, name, is_public, workspace_id`,
      [projectId]
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Project not found." });
    }

    await writeAdminAudit(pool, {
      actorId: req.systemAdmin.id,
      action: "project.unpublish",
      targetType: "project",
      targetId: projectId,
      beforeData: { is_public: true },
      afterData: { is_public: false, workspace_id: updateRes.rows[0].workspace_id },
    });

    res.json({
      message: "Project unpublished.",
      project: updateRes.rows[0],
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/users/:memberId", async (req, res) => {
  const memberId = parsePositiveInt(req.params.memberId);
  if (!memberId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid memberId." });
  }
  if (isSelf(req, memberId)) {
    return res.status(400).json({ name: "BadRequest", message: "You cannot change your own account status or role." });
  }

  const nextAccountStatus = req.body?.account_status === undefined
    ? null
    : normalizeUpper(req.body.account_status);
  const nextRoleName = req.body?.role_name === undefined ? null : normalizeUpper(req.body.role_name);

  if (nextAccountStatus === null && nextRoleName === null) {
    return res.status(400).json({ name: "BadRequest", message: "account_status or role_name is required." });
  }
  if (nextAccountStatus !== null && !ACCOUNT_STATUSES.has(nextAccountStatus)) {
    return res.status(400).json({ name: "BadRequest", message: "account_status must be ACTIVE or SUSPENDED." });
  }
  if (nextRoleName !== null && !MEMBER_ROLES.has(nextRoleName)) {
    return res.status(400).json({ name: "BadRequest", message: "role_name must be MEMBER or SYSTEM_ADMIN." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const memberRes = await client.query(
      `SELECT id, name, email, role_name, approval_status, COALESCE(account_status, 'ACTIVE') AS account_status
       FROM member
       WHERE id = $1
       FOR UPDATE`,
      [memberId]
    );
    if (memberRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const current = memberRes.rows[0];
    if (nextRoleName === "MEMBER" && String(current.role_name || "").toUpperCase() === "SYSTEM_ADMIN") {
      const adminCountRes = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM member
         WHERE UPPER(role_name) = 'SYSTEM_ADMIN'`
      );
      if (Number(adminCountRes.rows[0]?.total || 0) <= 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          name: "BadRequest",
          message: "Cannot demote the last system admin.",
        });
      }
    }

    const updatedRes = await client.query(
      `UPDATE member
       SET account_status = COALESCE($1, account_status),
           role_name = COALESCE($2, role_name)
       WHERE id = $3
       RETURNING id, name, email, role_name, approval_status, COALESCE(account_status, 'ACTIVE') AS account_status`,
      [nextAccountStatus, nextRoleName, memberId]
    );

    if (nextAccountStatus === "SUSPENDED") {
      await revokeMemberSessions(client, memberId);
    }

    await writeAdminAudit(client, {
      actorId: req.systemAdmin.id,
      action: nextAccountStatus === "SUSPENDED"
        ? "member.suspend"
        : nextAccountStatus === "ACTIVE"
          ? "member.unsuspend"
          : "member.role_change",
      targetType: "member",
      targetId: memberId,
      beforeData: { role_name: current.role_name, account_status: current.account_status },
      afterData: {
        role_name: updatedRes.rows[0].role_name,
        account_status: updatedRes.rows[0].account_status,
      },
    });

    await client.query("COMMIT");
    res.json({
      message: "Member updated.",
      member: updatedRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.post("/users/:memberId/sessions/revoke", async (req, res) => {
  const memberId = parsePositiveInt(req.params.memberId);
  if (!memberId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid memberId." });
  }

  try {
    const memberRes = await pool.query("SELECT id FROM member WHERE id = $1", [memberId]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const exceptSid = isSelf(req, memberId) ? req.sessionID : undefined;
    await revokeMemberSessions(pool, memberId, { exceptSid });
    await writeAdminAudit(pool, {
      actorId: req.systemAdmin.id,
      action: "member.sessions_revoke",
      targetType: "member",
      targetId: memberId,
      afterData: { except_current: Boolean(exceptSid) },
    });

    res.json({ message: "Sessions revoked." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/users/:memberId/password-reset", async (req, res) => {
  const memberId = parsePositiveInt(req.params.memberId);
  if (!memberId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid memberId." });
  }
  if (isSelf(req, memberId)) {
    return res.status(400).json({ name: "BadRequest", message: "You cannot reset your own password here." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const memberRes = await client.query("SELECT id, email FROM member WHERE id = $1 FOR UPDATE", [memberId]);
    if (memberRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const temporaryPassword = `Tmp-${randomBytes(9).toString("base64url")}`;
    const hashed = await bcrypt.hash(temporaryPassword, PASSWORD_SALT_ROUNDS);
    await client.query("UPDATE member SET password = $1 WHERE id = $2", [hashed, memberId]);
    await revokeMemberSessions(client, memberId);
    await writeAdminAudit(client, {
      actorId: req.systemAdmin.id,
      action: "member.password_reset",
      targetType: "member",
      targetId: memberId,
      afterData: { email: memberRes.rows[0].email },
    });
    await client.query("COMMIT");

    res.json({
      message: "Temporary password issued. Communicate it out of band; it is shown once.",
      member_id: memberId,
      temporary_password: temporaryPassword,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.get("/payments", withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;
  const keyword = String(req.query.q || "").trim();
  const status = normalizeUpper(req.query.status);

  const conditions = [];
  const values = [];

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(
      `(m.name ILIKE $${values.length} OR m.email ILIKE $${values.length} OR p.pg_transaction_id ILIKE $${values.length})`
    );
  }
  if (PAYMENT_STATUSES.has(status)) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  }

  const whereClause = whereFromConditions(conditions);

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payment p
       LEFT JOIN member m ON m.id = p.member_id
       ${whereClause}`,
      values
    );
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);
    const listValues = [...values, pagination.pageSize, pagination.offset];

    const listRes = await pool.query(
      `SELECT
        p.id,
        p.member_id,
        p.total_amount,
        p.status,
        p.pg_transaction_id,
        p.created_at,
        p.updated_at,
        m.name AS member_name,
        m.email AS member_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pl.id,
              'license_id', pl.license_id,
              'quantity', pl.quantity,
              'status', pl.status,
              'target_resource', l.target_resource,
              'license_name', COALESCE(NULLIF(l.name, ''), l.name_i18n_key)
            )
          ) FILTER (WHERE pl.id IS NOT NULL),
          '[]'
        ) AS licenses
       FROM payment p
       LEFT JOIN member m ON m.id = p.member_id
       LEFT JOIN purchased_license pl ON pl.payment_id = p.id
       LEFT JOIN license l ON l.id = pl.license_id
       ${whereClause}
       GROUP BY p.id, m.name, m.email
       ORDER BY p.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/payments/:paymentId", async (req, res) => {
  const paymentId = parsePositiveInt(req.params.paymentId);
  if (!paymentId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid paymentId." });
  }

  try {
    const paymentRes = await pool.query(
      `SELECT
        p.id,
        p.member_id,
        p.total_amount,
        p.status,
        p.pg_transaction_id,
        p.created_at,
        p.updated_at,
        m.name AS member_name,
        m.email AS member_email
       FROM payment p
       LEFT JOIN member m ON m.id = p.member_id
       WHERE p.id = $1`,
      [paymentId]
    );
    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Payment not found." });
    }

    const licenseRes = await pool.query(
      `SELECT
        pl.id,
        pl.license_id,
        pl.quantity,
        pl.status,
        pl.start_date,
        pl.end_date,
        pl.owner_member_id,
        pl.target_workspace_id,
        l.target_resource,
        l.billing_cycle,
        COALESCE(NULLIF(l.name, ''), l.name_i18n_key) AS license_name
       FROM purchased_license pl
       JOIN license l ON l.id = pl.license_id
       WHERE pl.payment_id = $1
       ORDER BY pl.id`,
      [paymentId]
    );

    res.json({
      payment: paymentRes.rows[0],
      licenses: licenseRes.rows,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/payments/:paymentId/refund", async (req, res) => {
  const paymentId = parsePositiveInt(req.params.paymentId);
  if (!paymentId) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid paymentId." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const paymentRes = await client.query(
      `SELECT id, status, total_amount, member_id, pg_transaction_id
       FROM payment
       WHERE id = $1
       FOR UPDATE`,
      [paymentId]
    );
    if (paymentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "Payment not found." });
    }

    const payment = paymentRes.rows[0];
    if (String(payment.status).toUpperCase() !== "SUCCESS") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        name: "BadRequest",
        message: `Only SUCCESS payments can be refunded. Current status is ${payment.status}.`,
      });
    }

    const updatedPayment = await client.query(
      `UPDATE payment
       SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [paymentId]
    );
    const licenseRes = await client.query(
      `UPDATE purchased_license
       SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $1
       RETURNING id, license_id, quantity, status`,
      [paymentId]
    );

    await writeAdminAudit(client, {
      actorId: req.systemAdmin.id,
      action: "payment.refund",
      targetType: "payment",
      targetId: paymentId,
      beforeData: { status: payment.status, total_amount: payment.total_amount },
      afterData: {
        status: "REFUNDED",
        refunded_license_ids: licenseRes.rows.map((row) => row.id),
      },
    });

    await client.query("COMMIT");
    res.json({
      message: "Payment refunded.",
      payment: updatedPayment.rows[0],
      licenses: licenseRes.rows,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.get("/broadcasts", withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;

  try {
    const totalRes = await pool.query("SELECT COUNT(*)::int AS total FROM admin_broadcast");
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);

    const listRes = await pool.query(
      `SELECT
        b.id,
        b.actor_id,
        actor.name AS actor_name,
        b.title,
        b.body,
        b.target_type,
        b.workspace_id,
        w.name AS workspace_name,
        b.recipient_count,
        b.created_at
       FROM admin_broadcast b
       LEFT JOIN member actor ON actor.id = b.actor_id
       LEFT JOIN workspace w ON w.id = b.workspace_id
       ORDER BY b.id DESC
       LIMIT $1 OFFSET $2`,
      [pagination.pageSize, pagination.offset]
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/broadcasts", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();
  const targetType = normalizeUpper(req.body?.target_type);
  const workspaceId = parsePositiveInt(req.body?.workspace_id);
  const memberIds = Array.isArray(req.body?.member_ids)
    ? [...new Set(req.body.member_ids.map((id) => parsePositiveInt(id)).filter(Boolean))]
    : [];

  if (!title) {
    return res.status(400).json({ name: "BadRequest", message: "title is required." });
  }
  if (!BROADCAST_TARGETS.has(targetType)) {
    return res.status(400).json({ name: "BadRequest", message: "target_type must be ALL, WORKSPACE, or MEMBERS." });
  }
  if (targetType === "WORKSPACE" && !workspaceId) {
    return res.status(400).json({ name: "BadRequest", message: "workspace_id is required for WORKSPACE broadcasts." });
  }
  if (targetType === "MEMBERS" && memberIds.length === 0) {
    return res.status(400).json({ name: "BadRequest", message: "member_ids is required for MEMBERS broadcasts." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let recipientRes;
    if (targetType === "ALL") {
      recipientRes = await client.query(
        `SELECT id
         FROM member
         WHERE approval_status = 'APPROVED'
           AND COALESCE(account_status, 'ACTIVE') = 'ACTIVE'`
      );
    } else if (targetType === "WORKSPACE") {
      recipientRes = await client.query(
        `SELECT m.id
         FROM workspace_member wm
         JOIN member m ON m.id = wm.member_id
         WHERE wm.workspace_id = $1
           AND m.approval_status = 'APPROVED'
           AND COALESCE(m.account_status, 'ACTIVE') = 'ACTIVE'`,
        [workspaceId]
      );
    } else {
      recipientRes = await client.query(
        `SELECT id
         FROM member
         WHERE id = ANY($1::int[])
           AND approval_status = 'APPROVED'
           AND COALESCE(account_status, 'ACTIVE') = 'ACTIVE'`,
        [memberIds]
      );
    }

    const recipientIds = recipientRes.rows
      .map((row) => row.id)
      .filter((id) => Number(id) !== Number(req.systemAdmin.id));
    if (recipientIds.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ name: "BadRequest", message: "No eligible recipients." });
    }

    const broadcastRes = await client.query(
      `INSERT INTO admin_broadcast (
        actor_id, title, body, target_type, workspace_id, recipient_count
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [req.systemAdmin.id, title, body, targetType, targetType === "WORKSPACE" ? workspaceId : null, recipientIds.length]
    );

    await createNotifications(
      {
        recipientIds,
        actorId: req.systemAdmin.id,
        type: NOTIFICATION_TYPES.SYSTEM_BROADCAST,
        resourceType: "broadcast",
        resourceId: broadcastRes.rows[0].id,
        workspaceId: targetType === "WORKSPACE" ? workspaceId : null,
        title,
        body,
        payload: { target_type: targetType, broadcast_id: broadcastRes.rows[0].id },
      },
      { client }
    );

    await writeAdminAudit(client, {
      actorId: req.systemAdmin.id,
      action: "broadcast.send",
      targetType: "broadcast",
      targetId: broadcastRes.rows[0].id,
      afterData: { target_type: targetType, recipient_count: recipientIds.length, workspace_id: workspaceId || null },
    });

    await client.query("COMMIT");
    res.status(201).json({
      message: "Broadcast sent.",
      broadcast: broadcastRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.get("/audit", withPagination({ defaultPageSize: 20, maxPageSize: 100 }), async (req, res) => {
  const { page, pageSize } = req.pagination;
  const action = String(req.query.action || "").trim();
  const targetType = String(req.query.targetType || "").trim();
  const targetId = parsePositiveInt(req.query.targetId);

  const conditions = [];
  const values = [];

  if (action) {
    values.push(action);
    conditions.push(`a.action = $${values.length}`);
  }
  if (targetType) {
    values.push(targetType);
    conditions.push(`a.target_type = $${values.length}`);
  }
  if (targetId) {
    values.push(targetId);
    conditions.push(`a.target_id = $${values.length}`);
  }

  const whereClause = whereFromConditions(conditions);

  try {
    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM admin_audit_log a ${whereClause}`,
      values
    );
    const pagination = buildPagination(page, pageSize, totalRes.rows[0]?.total || 0);
    const listValues = [...values, pagination.pageSize, pagination.offset];

    const listRes = await pool.query(
      `SELECT
        a.id,
        a.actor_id,
        actor.name AS actor_name,
        a.action,
        a.target_type,
        a.target_id,
        a.before_data,
        a.after_data,
        a.created_at
       FROM admin_audit_log a
       LEFT JOIN member actor ON actor.id = a.actor_id
       ${whereClause}
       ORDER BY a.id DESC
       LIMIT $${listValues.length - 1}
       OFFSET $${listValues.length}`,
      listValues
    );

    res.json({
      items: listRes.rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
