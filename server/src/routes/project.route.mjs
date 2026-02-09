import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

const normalizeThemeJsonInput = (themeJson) => {
  if (!themeJson || typeof themeJson !== "object") return themeJson;
  const gnb = themeJson.gnb || {};
  const themeId = gnb.themeId;
  if (!themeId) return themeJson;
  return {
    ...themeJson,
    gnb: {
      ...gnb,
      themeId,
    },
  };
};

const normalizeThemeJsonOutput = (themeJson) => {
  if (!themeJson || typeof themeJson !== "object") return themeJson;
  const gnb = themeJson.gnb || {};
  const themeId = gnb.themeId;
  if (!themeId) return themeJson;
  return {
    ...themeJson,
    gnb: {
      ...gnb,
      themeId,
    },
  };
};

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
router.get("/", isAuth, async (req, res) => {
  const { workspaceId } = req.query;
  const userId = req.session.userId;

  if (!workspaceId) {
    return res.status(400).json({ success: false, message: "workspaceId is required." });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const projectsRes = await pool.query(
      "SELECT * FROM project WHERE workspace_id = $1 ORDER BY sort_order ASC, id DESC",
      [workspaceId]
    );

    const data = projectsRes.rows.map((project) => ({
      ...project,
      theme_json: normalizeThemeJsonOutput(project.theme_json),
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  const { name, workspace_id } = req.body;
  const userId = req.session.userId;

  const client = await pool.connect();

  try {
    const authCheck = await client.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspace_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Not a workspace member." });
    }

    await client.query("BEGIN");

    const projectQuery = `
        INSERT INTO project (name, workspace_id)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const projectResult = await client.query(projectQuery, [name, workspace_id]);
    const newProject = projectResult.rows[0];

    const memberQuery = `
        INSERT INTO project_member (project_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newProject.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: { id: newProject.id },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Project creation error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
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
  const userId = req.session.userId;

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "No permission to remove member." });
    }

    await pool.query("DELETE FROM project_member WHERE project_id = $1 AND member_id = $2", [
      projectId,
      memberId,
    ]);

    res.json({ success: true, message: "Member removed." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  try {
    const result = await pool.query("SELECT * FROM project WHERE id = $1", [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const project = result.rows[0];
    res.json({
      success: true,
      data: {
        ...project,
        theme_json: normalizeThemeJsonOutput(project.theme_json),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  const { name, img_url, theme_json } = req.body;
  const normalizedThemeJson = normalizeThemeJsonInput(theme_json);
  const userId = req.session.userId;

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "No permission to update project." });
    }

    const result = await pool.query(
      `UPDATE project 
       SET name = COALESCE($1, name), img_url = COALESCE($2, img_url), theme_json = COALESCE($3, theme_json)
       WHERE id = $4 RETURNING *`,
      [name, img_url, normalizedThemeJson, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const project = result.rows[0];
    res.json({
      success: true,
      data: {
        ...project,
        theme_json: normalizeThemeJsonOutput(project.theme_json),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        success: false,
        message: "Project not found or access denied.",
      });
    }

    if (target.role_name !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "No permission to delete project. (Owner only.)",
      });
    }

    if (target.is_default) {
      return res.status(403).json({
        success: false,
        message: "Default project cannot be deleted.",
      });
    }

    await pool.query("DELETE FROM project WHERE id = $1", [projectId]);

    res.json({
      success: true,
      message: "Project deleted.",
    });
  } catch (error) {
    logger.error("Project delete error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: "Server error. Delete failed." });
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
  try {
    const query = `
      SELECT m.id, m.name, m.email, pm.role_name
      FROM project_member pm
      JOIN member m ON pm.member_id = m.id
      WHERE pm.project_id = $1
      ORDER BY m.name ASC
    `;
    const result = await pool.query(query, [projectId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "No permission to add member." });
    }

    const duplicateCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, member_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Already a project member.",
      });
    }

    const insertRes = await pool.query(
      "INSERT INTO project_member (project_id, member_id, role_name) VALUES ($1, $2, $3) RETURNING id",
      [projectId, member_id, role_name]
    );

    res.status(201).json({
      success: true,
      message: "Member added.",
      data: { id: insertRes.rows[0].id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
