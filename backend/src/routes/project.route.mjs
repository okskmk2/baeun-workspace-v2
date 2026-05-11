import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { normalizeThemeJson } from "../utils/parsers.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();


/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Workspace project list
 *     description: List projects for a workspace using the workspaceId query
 *     tags:
 *       - Project
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Projects retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Project"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/", isAuth, withPagination({ defaultPageSize: 10, maxPageSize: 100 }), async (req, res) => {
  const { workspaceId } = req.query;
  const userId = req.session.userId;
  const { hasPageQuery, page, pageSize } = req.pagination;

  if (!workspaceId) {
    return res.status(400).json({ name: "BadRequest", message: "workspaceId is required." });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "Access denied." });
    }

    if (hasPageQuery) {
      const countRes = await pool.query(
        "SELECT COUNT(*)::int AS total FROM project WHERE workspace_id = $1",
        [workspaceId]
      );

      const total = Number(countRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const projectsRes = await pool.query(
        `SELECT *
         FROM project
         WHERE workspace_id = $1
         ORDER BY sort_order ASC, id DESC
         LIMIT $2
         OFFSET $3`,
        [workspaceId, pageSize, offset]
      );

      const items = projectsRes.rows.map((project) => ({
        ...project,
        theme_json: normalizeThemeJson(project.theme_json),
      }));

      return res.json({
        items,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    }

    const projectsRes = await pool.query(
      "SELECT * FROM project WHERE workspace_id = $1 ORDER BY sort_order ASC, id DESC",
      [workspaceId]
    );

    const data = projectsRes.rows.map((project) => ({
      ...project,
      theme_json: normalizeThemeJson(project.theme_json),
    }));

    res.json(data);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create project
 *     description: Create a project and add the creator as OWNER
 *     tags:
 *       - Project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               workspace_id:
 *                 type: integer
 *             required:
 *               - name
 *               - workspace_id
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/CreatedId"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/", isAuth, async (req, res) => {
  const { name, workspace_id, summary } = req.body;
  const userId = req.session.userId;

  const client = await pool.connect();

  try {
    const authCheck = await client.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspace_id, userId]
    );

    if (!authCheck.rows[0] || !["OWNER", "ADMIN"].includes(authCheck.rows[0].role_name)) {
      return res.status(403).json({ name: "Forbidden", message: "No permission to create project." });
    }

    await client.query("BEGIN");

    const projectQuery = `
      INSERT INTO project (name, workspace_id, summary)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const projectResult = await client.query(projectQuery, [name, workspace_id, summary ?? null]);
    const newProject = projectResult.rows[0];

    const memberQuery = `
        INSERT INTO project_member (project_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newProject.id, userId]);

    const projectNoticeQuery = `
      INSERT INTO channel (name, project_id, type, scope, status)
      VALUES ($1, $2, 'NOTICE', 'PROJECT', 'ACTIVE');
    `;
    await client.query(projectNoticeQuery, ["프로젝트 공지채널", newProject.id]);

    // Create a default "Backlog" kanban for the new project
    const backlogKanbanQuery = `
      INSERT INTO kanban (name, project_id, type)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    await client.query(backlogKanbanQuery, ["Backlog", newProject.id, "BACKLOG"]);

    await client.query("COMMIT");

    res.status(201).json({
      id: newProject.id,
      summary: newProject.summary ?? null,
      description: newProject.summary ?? null,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Project creation error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/projects/{projectId}/members/{memberId}:
 *   delete:
 *     summary: Remove project member
 *     description: Remove a project member (OWNER only)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/:projectId/members/:memberId", isAuth, async (req, res) => {
  const { projectId, memberId } = req.params;
  const actorId = req.session.userId;
  const targetMemberId = Number(memberId);

  if (!Number.isInteger(targetMemberId) || targetMemberId <= 0) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid member id." });
  }

  try {
    const actorCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, actorId]
    );

    if (!actorCheck.rows[0] || actorCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "No permission to remove member." });
    }

    if (String(actorId) === String(targetMemberId)) {
      return res.status(400).json({ name: "BadRequest", message: "You cannot remove yourself." });
    }

    const targetCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, targetMemberId]
    );

    if (!targetCheck.rows[0]) {
      return res.status(404).json({ name: "NotFound", message: "Member not found in project." });
    }

    if (targetCheck.rows[0].role_name === "OWNER") {
      const ownerCountRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM project_member WHERE project_id = $1 AND role_name = 'OWNER'",
        [projectId]
      );
      if ((ownerCountRes.rows[0]?.count || 0) <= 1) {
        return res.status(403).json({ name: "Forbidden", message: "Cannot remove the last OWNER." });
      }
    }

    await pool.query("DELETE FROM project_member WHERE project_id = $1 AND member_id = $2", [
      projectId,
      targetMemberId,
    ]);

    res.json({ message: "Member removed." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   get:
 *     summary: Get project detail
 *     description: Get project detail
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project detail retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Project"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "Access denied." });
    }

    const result = await pool.query("SELECT * FROM project WHERE id = $1", [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Project not found." });
    }

    const project = result.rows[0];
    res.json({
      ...project,
      summary: project.summary ?? null,
      description: project.summary ?? null,
      theme_json: normalizeThemeJson(project.theme_json),
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   patch:
 *     summary: Update project
 *     description: Update project info (OWNER only)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               img_url:
 *                 type: string
 *               theme_json:
 *                 type: object
 *     responses:
 *       200:
 *         description: Project updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Project"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const { name, img_url, theme_json, summary } = req.body;
  const normalizedThemeJson = normalizeThemeJson(theme_json);
  const userId = req.session.userId;

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res
        .status(403)
        .json({ name: "Forbidden", message: "No permission to update project." });
    }

    const result = await pool.query(
      `UPDATE project 
       SET name = COALESCE($1, name), img_url = COALESCE($2, img_url), theme_json = COALESCE($3, theme_json), summary = COALESCE($4, summary)
       WHERE id = $5 RETURNING *`,
      [name, img_url, normalizedThemeJson, summary, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Project not found." });
    }

    const project = result.rows[0];
    res.json({
      ...project,
      summary: project.summary ?? null,
      description: project.summary ?? null,
      theme_json: normalizeThemeJson(project.theme_json),
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}:
 *   delete:
 *     summary: Delete project
 *     description: Delete project (OWNER only, default project cannot be deleted)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    const projectCheck = await pool.query(
      `SELECT pm.role_name, p.is_default 
       FROM project p
       JOIN project_member pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.member_id = $2`,
      [projectId, userId]
    );

    const target = projectCheck.rows[0];

    if (!target) {
      return res.status(404).json({
        name: "NotFound",
        message: "Project not found or access denied.",
      });
    }

    if (target.role_name !== "OWNER") {
      return res.status(403).json({
        name: "Forbidden",
        message: "No permission to delete project. (Owner only.)",
      });
    }

    if (target.is_default) {
      return res.status(403).json({
        name: "Forbidden",
        message: "Default project cannot be deleted.",
      });
    }

    await pool.query("DELETE FROM project WHERE id = $1", [projectId]);

    res.json({ message: "Project deleted." });
  } catch (error) {
    logger.error("Project delete error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: "Server error. Delete failed." });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}/members:
 *   get:
 *     summary: Project members
 *     description: List project members
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Members retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role_name:
 *                         type: string
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:projectId/members", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "Access denied." });
    }

    const query = `
      SELECT m.id, m.name, m.email, pm.role_name
      FROM project_member pm
      JOIN member m ON pm.member_id = m.id
      WHERE pm.project_id = $1
      ORDER BY m.name ASC
    `;
    const result = await pool.query(query, [projectId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/projects/{projectId}/members:
 *   post:
 *     summary: Add project member
 *     description: Add a workspace member to the project
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               role_name:
 *                 type: string
 *                 default: MEMBER
 *             required:
 *               - member_id
 *     responses:
 *       201:
 *         description: Member added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: "#/components/schemas/CreatedId"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/:projectId/members", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const { member_id, role_name = "MEMBER" } = req.body;
  const userId = req.session.userId;

  const ALLOWED_ROLES = ["OWNER", "ADMIN", "MEMBER"];
  if (!ALLOWED_ROLES.includes(String(role_name || "").toUpperCase())) {
    return res.status(400).json({ name: "BadRequest", message: "Invalid role_name." });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "No permission to add member." });
    }

    const duplicateCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, member_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        name: "BadRequest",
        message: "Already a project member.",
      });
    }

    const insertRes = await pool.query(
      "INSERT INTO project_member (project_id, member_id, role_name) VALUES ($1, $2, $3) RETURNING id",
      [projectId, member_id, role_name]
    );

    res.status(201).json({
      message: "Member added.",
      id: insertRes.rows[0].id,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/** GET /projects/:projectId/permission-requests — 프로젝트 전체 페이지 권한 신청 목록 (OWNER/ADMIN) */
router.get("/:projectId/permission-requests", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    const roleRes = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (!roleRes.rows[0] || !["OWNER", "ADMIN"].includes(roleRes.rows[0].role_name)) {
      return res.status(403).json({ name: "Forbidden", message: "권한이 없습니다." });
    }

    const result = await pool.query(
      `SELECT r.id, r.status, r.reason, r.created_at,
              p.id AS page_id, p.title AS page_title,
              m.id AS requester_id, m.name AS requester_name, m.email AS requester_email
       FROM page_permission_request r
       JOIN page p ON p.id = r.page_id
       JOIN member m ON m.id = r.requester_id
       WHERE p.project_id = $1 AND r.status = 'PENDING'
       ORDER BY r.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
