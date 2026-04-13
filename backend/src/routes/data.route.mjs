import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

const ROLE_PRIORITY = ["OWNER", "ADMIN", "MEMBER"];
const COLUMN_TYPES = new Set(["TEXT", "NUMBER", "DATE", "SELECT"]);

const normalizeRole = (value) => String(value || "").toUpperCase();

const toSafeArray = (value, fallback = []) => {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => normalizeRole(item)).filter(Boolean);
};

const normalizePermissions = (raw, fallbackWriteRoles = ["OWNER", "ADMIN"]) => {
  const readRoles = toSafeArray(raw?.readRoles, ["OWNER", "ADMIN", "MEMBER"]);
  const writeRoles = toSafeArray(raw?.writeRoles, fallbackWriteRoles);
  return { readRoles, writeRoles };
};

const canRoleReadColumn = (column, roleName) => {
  const permissions = normalizePermissions(column.permissions);
  const role = normalizeRole(roleName);
  return Boolean(column.is_visible) && permissions.readRoles.includes(role);
};

const canRoleWriteColumn = (column, roleName) => {
  const permissions = normalizePermissions(column.permissions);
  const role = normalizeRole(roleName);
  return permissions.writeRoles.includes(role);
};

const getProjectContext = async (projectId, memberId) => {
  const result = await pool.query(
    `SELECT p.id, p.workspace_id,
            pm.role_name AS project_role,
            wm.role_name AS workspace_role
       FROM project p
       LEFT JOIN project_member pm ON pm.project_id = p.id AND pm.member_id = $2
       LEFT JOIN workspace_member wm ON wm.workspace_id = p.workspace_id AND wm.member_id = $2
      WHERE p.id = $1`,
    [projectId, memberId]
  );

  const row = result.rows[0] || null;
  if (!row) return null;
  if (!row.project_role) return { ...row, forbidden: true };
  return row;
};

const getWorkspaceRole = async (workspaceId, memberId) => {
  const result = await pool.query(
    "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
    [workspaceId, memberId]
  );
  return result.rows[0]?.role_name || null;
};

const getColumnsByTableId = async (tableId) => {
  const result = await pool.query(
    "SELECT * FROM data_column WHERE table_id = $1 ORDER BY sort_order ASC, id ASC",
    [tableId]
  );
  return result.rows;
};

const getTableInProjectContext = async (projectId, tableId, memberId) => {
  const project = await getProjectContext(projectId, memberId);
  if (!project) {
    return { status: 404, error: { name: "NotFound", message: "프로젝트를 찾을 수 없습니다." } };
  }
  if (project.forbidden) {
    return { status: 403, error: { name: "Forbidden", message: "프로젝트 접근 권한이 없습니다." } };
  }

  const tableRes = await pool.query(
    `SELECT *
       FROM data_table
      WHERE id = $1
        AND workspace_id = $2
        AND status = 'ACTIVE'
        AND (is_asset = true OR project_id = $3)`,
    [tableId, project.workspace_id, projectId]
  );

  const table = tableRes.rows[0] || null;
  if (!table) {
    return { status: 404, error: { name: "NotFound", message: "데이터 테이블을 찾을 수 없습니다." } };
  }

  const roleName = table.is_asset ? project.workspace_role : project.project_role;
  if (!roleName) {
    return { status: 403, error: { name: "Forbidden", message: "테이블 접근 권한이 없습니다." } };
  }

  return { table, project, roleName };
};

const insertAuditLog = async ({
  db = pool,
  tableId,
  rowId = null,
  action,
  beforeData = null,
  afterData = null,
  changedBy,
}) => {
  await db.query(
    `INSERT INTO data_audit_log (table_id, row_id, action, before_data, after_data, changed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tableId, rowId, action, beforeData, afterData, changedBy]
  );
};

router.get("/projects/:projectId/tables", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    const project = await getProjectContext(projectId, userId);
    if (!project) {
      return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
    }
    if (project.forbidden) {
      return res.status(403).json({ name: "Forbidden", message: "프로젝트 접근 권한이 없습니다." });
    }

    const tableRes = await pool.query(
      `SELECT dt.*,
              (SELECT COUNT(*)::int FROM data_column dc WHERE dc.table_id = dt.id) AS column_count
         FROM data_table dt
        WHERE dt.workspace_id = $1
          AND dt.status = 'ACTIVE'
          AND (dt.is_asset = true OR dt.project_id = $2)
        ORDER BY dt.is_asset DESC, dt.updated_at DESC, dt.id DESC`,
      [project.workspace_id, projectId]
    );

    const rows = tableRes.rows || [];
    const assets = rows.filter((row) => row.is_asset);
    const locals = rows.filter((row) => !row.is_asset);

    res.json({
      project: {
        id: Number(project.id),
        workspace_id: Number(project.workspace_id),
        project_role: project.project_role,
        workspace_role: project.workspace_role,
      },
      assets,
      locals,
    });
  } catch (error) {
    logger.error("data table list error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/projects/:projectId/tables", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;
  const { name, description = null, columns = [] } = req.body || {};

  const tableName = String(name || "").trim();
  if (!tableName) {
    return res.status(400).json({ name: "BadRequest", message: "테이블 이름이 필요합니다." });
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    return res.status(400).json({ name: "BadRequest", message: "컬럼 정의가 필요합니다." });
  }

  try {
    const project = await getProjectContext(projectId, userId);
    if (!project) {
      return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
    }
    const role = normalizeRole(project.project_role);
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.status(403).json({ name: "Forbidden", message: "임시 테이블 생성 권한이 없습니다." });
    }

    const normalizedColumns = columns.map((column, index) => {
      const columnName = String(column?.name || "").trim();
      const type = normalizeRole(column?.type || "TEXT");
      if (!columnName) {
        throw new Error("컬럼 이름은 비어 있을 수 없습니다.");
      }
      if (!COLUMN_TYPES.has(type)) {
        throw new Error(`지원하지 않는 컬럼 타입입니다: ${type}`);
      }

      return {
        name: columnName,
        type,
        is_visible: column?.is_visible !== false,
        is_required: column?.is_required === true,
        options_json: Array.isArray(column?.options) ? column.options : null,
        sort_order: Number.isFinite(Number(column?.sort_order)) ? Number(column.sort_order) : index,
        permissions: normalizePermissions(column?.permissions, ["OWNER", "ADMIN", "MEMBER"]),
      };
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const tableResult = await client.query(
        `INSERT INTO data_table (workspace_id, project_id, name, description, is_asset, created_by)
         VALUES ($1, $2, $3, $4, false, $5)
         RETURNING *`,
        [project.workspace_id, projectId, tableName, description, userId]
      );
      const table = tableResult.rows[0];

      for (let i = 0; i < normalizedColumns.length; i += 1) {
        const column = normalizedColumns[i];
        await client.query(
          `INSERT INTO data_column
             (table_id, name, type, options_json, is_visible, is_required, sort_order, permissions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            table.id,
            column.name,
            column.type,
            column.options_json === null ? null : JSON.stringify(column.options_json),
            column.is_visible,
            column.is_required,
            column.sort_order,
            JSON.stringify(column.permissions),
          ]
        );
      }

      await client.query(
        `INSERT INTO data_audit_log (table_id, action, after_data, changed_by)
         VALUES ($1, 'INSERT', $2, $3)`,
        [table.id, JSON.stringify({ table: tableName, columns: normalizedColumns }), userId]
      );

      await client.query("COMMIT");
      res.status(201).json(table);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("create project data table error", { err: error?.message, stack: error?.stack });
    res.status(400).json({ name: "BadRequest", message: error.message });
  }
});

router.get("/projects/:projectId/tables/:tableId", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    const { table, roleName } = context;
    const columns = await getColumnsByTableId(table.id);
    const visibleColumns = columns
      .filter((column) => canRoleReadColumn(column, roleName))
      .map((column) => ({
        ...column,
        can_edit: canRoleWriteColumn(column, roleName),
      }));

    res.json({
      table,
      role_name: roleName,
      columns: visibleColumns,
      capabilities: {
        can_create_row: visibleColumns.some((column) => column.can_edit),
        can_update_row: visibleColumns.some((column) => column.can_edit),
        can_delete_row: ["OWNER", "ADMIN"].includes(normalizeRole(roleName)),
        can_request_promotion:
          !table.is_asset && ["OWNER", "ADMIN"].includes(normalizeRole(context.project.project_role)),
      },
    });
  } catch (error) {
    logger.error("get data table detail error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/projects/:projectId/tables/:tableId/rows", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    const { table, roleName } = context;
    const columns = await getColumnsByTableId(table.id);
    const visibleColumns = columns.filter((column) => canRoleReadColumn(column, roleName));
    const visibleKeys = new Set(visibleColumns.map((column) => column.name));

    const rowsRes = await pool.query(
      "SELECT id, table_id, json_data, created_by, updated_by, created_at, updated_at FROM data_row WHERE table_id = $1 ORDER BY id DESC",
      [table.id]
    );

    const rows = rowsRes.rows.map((row) => {
      const source = row.json_data || {};
      const filtered = {};
      Object.keys(source).forEach((key) => {
        if (visibleKeys.has(key)) filtered[key] = source[key];
      });
      return {
        ...row,
        json_data: filtered,
      };
    });

    res.json({ rows, columns: visibleColumns });
  } catch (error) {
    logger.error("get data table rows error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/projects/:projectId/tables/:tableId/rows", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;
  const payload = req.body?.json_data;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ name: "BadRequest", message: "json_data 형식이 올바르지 않습니다." });
  }

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    const { table, roleName } = context;
    const columns = await getColumnsByTableId(table.id);
    const writableColumns = columns.filter((column) => canRoleWriteColumn(column, roleName));

    if (writableColumns.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "행 생성 권한이 없습니다." });
    }

    const writableKeySet = new Set(writableColumns.map((column) => column.name));
    const safePayload = {};
    Object.keys(payload).forEach((key) => {
      if (writableKeySet.has(key)) safePayload[key] = payload[key];
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const insertRes = await client.query(
        `INSERT INTO data_row (table_id, json_data, created_by, updated_by)
         VALUES ($1, $2, $3, $3)
         RETURNING *`,
        [table.id, safePayload, userId]
      );

      const row = insertRes.rows[0];
      await insertAuditLog({
        db: client,
        tableId: table.id,
        rowId: row.id,
        action: "INSERT",
        beforeData: null,
        afterData: row.json_data,
        changedBy: userId,
      });

      await client.query("COMMIT");
      res.status(201).json(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("create data row error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/projects/:projectId/tables/:tableId/rows/:rowId", isAuth, async (req, res) => {
  const { projectId, tableId, rowId } = req.params;
  const userId = req.session.userId;
  const patchData = req.body?.json_data;

  if (!patchData || typeof patchData !== "object" || Array.isArray(patchData)) {
    return res.status(400).json({ name: "BadRequest", message: "json_data 형식이 올바르지 않습니다." });
  }

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    const { table, roleName } = context;
    const columns = await getColumnsByTableId(table.id);
    const writableColumns = columns.filter((column) => canRoleWriteColumn(column, roleName));
    const writableKeySet = new Set(writableColumns.map((column) => column.name));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const rowRes = await client.query(
        "SELECT * FROM data_row WHERE id = $1 AND table_id = $2 FOR UPDATE",
        [rowId, table.id]
      );
      const row = rowRes.rows[0] || null;
      if (!row) {
        await client.query("ROLLBACK");
        return res.status(404).json({ name: "NotFound", message: "데이터 행을 찾을 수 없습니다." });
      }

      const before = row.json_data || {};
      const merged = { ...before };
      let hasChanges = false;

      Object.keys(patchData).forEach((key) => {
        if (!writableKeySet.has(key)) return;
        merged[key] = patchData[key];
        hasChanges = true;
      });

      if (!hasChanges) {
        await client.query("ROLLBACK");
        return res.status(403).json({ name: "Forbidden", message: "수정 가능한 필드가 없습니다." });
      }

      const updatedRes = await client.query(
        `UPDATE data_row
            SET json_data = $1,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        RETURNING *`,
        [merged, userId, rowId]
      );

      const updated = updatedRes.rows[0];
      await insertAuditLog({
        db: client,
        tableId: table.id,
        rowId: updated.id,
        action: "UPDATE",
        beforeData: before,
        afterData: updated.json_data,
        changedBy: userId,
      });

      await client.query("COMMIT");
      res.json(updated);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("update data row error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.delete("/projects/:projectId/tables/:tableId/rows/:rowId", isAuth, async (req, res) => {
  const { projectId, tableId, rowId } = req.params;
  const userId = req.session.userId;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    if (!["OWNER", "ADMIN"].includes(normalizeRole(context.roleName))) {
      return res.status(403).json({ name: "Forbidden", message: "행 삭제 권한이 없습니다." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const rowRes = await client.query(
        "SELECT * FROM data_row WHERE id = $1 AND table_id = $2 FOR UPDATE",
        [rowId, tableId]
      );
      const row = rowRes.rows[0] || null;
      if (!row) {
        await client.query("ROLLBACK");
        return res.status(404).json({ name: "NotFound", message: "데이터 행을 찾을 수 없습니다." });
      }

      await insertAuditLog({
        db: client,
        tableId: Number(tableId),
        rowId: Number(rowId),
        action: "DELETE",
        beforeData: row.json_data,
        afterData: null,
        changedBy: userId,
      });
      await client.query("DELETE FROM data_row WHERE id = $1", [rowId]);

      await client.query("COMMIT");
      res.json({ message: "삭제되었습니다." });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("delete data row error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/projects/:projectId/tables/:tableId/promotion-requests", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);
    const { table, project } = context;

    if (table.is_asset) {
      return res.status(400).json({ name: "BadRequest", message: "이미 워크스페이스 자산입니다." });
    }

    if (!["OWNER", "ADMIN"].includes(normalizeRole(project.project_role))) {
      return res.status(403).json({ name: "Forbidden", message: "승격 신청 권한이 없습니다." });
    }

    const columns = await getColumnsByTableId(table.id);
    const schema = {
      table: {
        id: table.id,
        name: table.name,
        description: table.description,
        version: table.version,
      },
      columns,
    };

    const pendingCheck = await pool.query(
      "SELECT id FROM data_promotion_request WHERE table_id = $1 AND status = 'PENDING' LIMIT 1",
      [table.id]
    );
    if (pendingCheck.rows.length > 0) {
      return res.status(409).json({ name: "Conflict", message: "이미 승인 대기 중인 요청이 있습니다." });
    }

    const result = await pool.query(
      `INSERT INTO data_promotion_request (table_id, requester_id, status, schema_json)
       VALUES ($1, $2, 'PENDING', $3)
       RETURNING *`,
      [table.id, userId, JSON.stringify(schema)]
    );

    await insertAuditLog({
      tableId: table.id,
      action: "PROMOTION_REQUEST",
      beforeData: null,
      afterData: { request_id: result.rows[0].id, status: "PENDING" },
      changedBy: userId,
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error("create promotion request error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/workspaces/:workspaceId/promotion-requests", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.session.userId;

  try {
    const role = await getWorkspaceRole(workspaceId, userId);
    if (!["OWNER", "ADMIN"].includes(normalizeRole(role))) {
      return res.status(403).json({ name: "Forbidden", message: "승인 목록 접근 권한이 없습니다." });
    }

    const result = await pool.query(
      `SELECT pr.*, dt.name AS table_name, p.name AS project_name, m.name AS requester_name
         FROM data_promotion_request pr
         JOIN data_table dt ON dt.id = pr.table_id
         LEFT JOIN project p ON p.id = dt.project_id
         LEFT JOIN member m ON m.id = pr.requester_id
        WHERE dt.workspace_id = $1
        ORDER BY pr.created_at DESC`,
      [workspaceId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error("list promotion requests error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/promotion-requests/:requestId/review", isAuth, async (req, res) => {
  const { requestId } = req.params;
  const userId = req.session.userId;
  const { status, reviewer_comment = null } = req.body || {};
  const nextStatus = normalizeRole(status);

  if (!["APPROVED", "REJECTED"].includes(nextStatus)) {
    return res.status(400).json({ name: "BadRequest", message: "status는 APPROVED 또는 REJECTED 여야 합니다." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestRes = await client.query(
      `SELECT pr.*, dt.workspace_id, dt.name AS table_name, dt.id AS table_id
         FROM data_promotion_request pr
         JOIN data_table dt ON dt.id = pr.table_id
        WHERE pr.id = $1
        FOR UPDATE`,
      [requestId]
    );

    const request = requestRes.rows[0] || null;
    if (!request) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "요청을 찾을 수 없습니다." });
    }
    if (request.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(409).json({ name: "Conflict", message: "이미 처리된 요청입니다." });
    }

    const reviewerRole = await getWorkspaceRole(request.workspace_id, userId);
    if (!["OWNER", "ADMIN"].includes(normalizeRole(reviewerRole))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ name: "Forbidden", message: "요청 승인 권한이 없습니다." });
    }

    const updateRequest = await client.query(
      `UPDATE data_promotion_request
          SET status = $1,
              reviewer_id = $2,
              reviewer_comment = $3,
              reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $4
      RETURNING *`,
      [nextStatus, userId, reviewer_comment, requestId]
    );

    if (nextStatus === "APPROVED") {
      await client.query(
        `UPDATE data_table
            SET is_asset = true,
                project_id = null,
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [request.table_id]
      );
    }

    await client.query(
      `INSERT INTO data_audit_log (table_id, action, after_data, changed_by)
       VALUES ($1, 'PROMOTION_REQUEST', $2, $3)`,
      [request.table_id, JSON.stringify({ request_id: requestId, status: nextStatus }), userId]
    );

    await client.query("COMMIT");
    res.json(updateRequest.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("review promotion request error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.post("/projects/:projectId/tables/:tableId/snapshots", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;
  const snapshotLabel = String(req.body?.label || "").trim() || null;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);
    if (!["OWNER", "ADMIN"].includes(normalizeRole(context.roleName))) {
      return res.status(403).json({ name: "Forbidden", message: "스냅샷 생성 권한이 없습니다." });
    }

    const columns = await getColumnsByTableId(context.table.id);
    const rowsRes = await pool.query("SELECT id, json_data, created_at, updated_at FROM data_row WHERE table_id = $1", [
      context.table.id,
    ]);

    const snapshotRes = await pool.query(
      `INSERT INTO data_snapshot (table_id, version, snapshot_label, rows_json, schema_json, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        context.table.id,
        context.table.version,
        snapshotLabel,
        JSON.stringify(rowsRes.rows || []),
        JSON.stringify(columns || []),
        userId,
      ]
    );

    await insertAuditLog({
      tableId: context.table.id,
      action: "SNAPSHOT",
      beforeData: null,
      afterData: { snapshot_id: snapshotRes.rows[0].id, version: context.table.version },
      changedBy: userId,
    });

    res.status(201).json(snapshotRes.rows[0]);
  } catch (error) {
    logger.error("create snapshot error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/projects/:projectId/tables/:tableId/audit-logs", isAuth, async (req, res) => {
  const { projectId, tableId } = req.params;
  const userId = req.session.userId;

  try {
    const context = await getTableInProjectContext(projectId, tableId, userId);
    if (context.error) return res.status(context.status).json(context.error);

    const result = await pool.query(
      `SELECT al.*, m.name AS changed_by_name
         FROM data_audit_log al
         LEFT JOIN member m ON m.id = al.changed_by
        WHERE al.table_id = $1
        ORDER BY al.changed_at DESC
        LIMIT 100`,
      [tableId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error("list audit logs error", { err: error?.message, stack: error?.stack });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
