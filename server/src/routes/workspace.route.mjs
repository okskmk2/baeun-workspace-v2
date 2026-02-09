import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create workspace
 *     description: Create a workspace and add the creator as OWNER
 *     tags:
 *       - Workspace
 *     requestBody:
 *       required: true
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
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Workspace created
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
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/", isAuth, async (req, res) => {
  const { name, img_url, theme_json } = req.body;
  const userId = req.session.userId; // Validated session user ID.

  // DB transaction for workspace + member creation.
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Create workspace.
    const workspaceQuery = `
            INSERT INTO workspace (name, member_id, img_url, theme_json)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const workspaceRes = await client.query(workspaceQuery, [name, userId, img_url, theme_json]);
    const newWorkspace = workspaceRes.rows[0];

    // 2. Add workspace member as OWNER.
    const memberQuery = `
            INSERT INTO workspace_member (workspace_id, member_id, role_name)
            VALUES ($1, $2, 'OWNER');
        `;
    await client.query(memberQuery, [newWorkspace.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Workspace created.",
      data: { id: newWorkspace.id },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Workspace creation error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: "Server error. Workspace create failed." });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/workspaces/my:
 *   get:
 *     summary: My workspaces
 *     description: List workspaces the user participates in
 *     tags:
 *       - Workspace
 *     responses:
 *       200:
 *         description: Workspaces retrieved
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
 *                       img_url:
 *                         type: string
 *                         nullable: true
 *                       is_default:
 *                         type: boolean
 *                       role_name:
 *                         type: string
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/my", isAuth, async (req, res) => {
  try {
    const query = `
            SELECT w.*, wm.role_name 
            FROM workspace w
            JOIN workspace_member wm ON w.id = wm.workspace_id
            WHERE wm.member_id = $1
            ORDER BY w.sort_order ASC, w.id DESC;
        `;
    const result = await pool.query(query, [req.session.userId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   get:
 *     summary: Get workspace detail
 *     description: Get workspace detail
 *     tags:
 *       - Workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workspace detail retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     img_url:
 *                       type: string
 *                       nullable: true
 *                     is_default:
 *                       type: boolean
 *                     role_name:
 *                       type: string
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:workspaceId", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const workspaceRes = await pool.query(
      `SELECT w.*, wm.role_name
       FROM workspace w
       JOIN workspace_member wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND wm.member_id = $2`,
      [workspaceId, userId]
    );

    const workspace = workspaceRes.rows[0];
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found." });
    }

    res.json({ success: true, data: workspace });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/members
 * @desc    Invite a workspace member by email
 */
/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   post:
 *     summary: Invite workspace member
 *     description: Invite a user by email to the workspace
 *     tags:
 *       - Workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
 *               email:
 *                 type: string
 *                 format: email
 *               role_name:
 *                 type: string
 *                 enum: [OWNER, ADMIN, MEMBER]
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Invite success
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
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/:workspaceId/members", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role_name = "MEMBER" } = req.body;
  const inviterId = req.session.userId;

  try {
    // 1. Check invite permission (OWNER or ADMIN).
    const adminCheck = await pool.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, inviterId]
    );

    if (!adminCheck.rows[0] || !["OWNER", "ADMIN"].includes(adminCheck.rows[0].role_name)) {
      return res.status(403).json({ success: false, message: "No permission to invite members." });
    }

    // 2. Check user exists by email.
    const userRes = await pool.query("SELECT id FROM member WHERE email = $1", [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No user with that email.",
      });
    }
    const targetUserId = userRes.rows[0].id;

    // 3. Check duplicate member.
    const duplicateCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, targetUserId]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User is already a workspace member.",
      });
    }

    // 4. Add member.
    const insertRes = await pool.query(
      "INSERT INTO workspace_member (workspace_id, member_id, role_name) VALUES ($1, $2, $3) RETURNING id",
      [workspaceId, targetUserId, role_name]
    );

    res.json({
      success: true,
      message: "Member added.",
      data: { id: insertRes.rows[0].id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/members
 * @desc    List workspace members
 */
/**
 * @swagger
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     summary: Workspace members
 *     description: List workspace members
 *     tags:
 *       - Workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
 *                         format: email
 *                       role_name:
 *                         type: string
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:workspaceId/members", isAuth, async (req, res) => {
  try {
    const query = `
            SELECT m.id, m.name, m.email, wm.role_name 
            FROM workspace_member wm
            JOIN member m ON wm.member_id = m.id
            WHERE wm.workspace_id = $1
            ORDER BY m.name ASC;
        `;
    const result = await pool.query(query, [req.params.workspaceId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId
 * @desc    Delete workspace (OWNER only)
 */
/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   delete:
 *     summary: Delete workspace
 *     description: Delete workspace (OWNER only, default workspace cannot be deleted)
 *     tags:
 *       - Workspace
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
router.delete("/:workspaceId", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.session.userId;

  try {
    // 1. Check workspace info and permissions.
    // role_name is used to verify OWNER, is_default blocks deletion.
    const workspaceCheck = await pool.query(
      `SELECT wm.role_name, w.is_default 
       FROM workspace w
       JOIN workspace_member wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND wm.member_id = $2`,
      [workspaceId, userId]
    );

    const target = workspaceCheck.rows[0];

    // Not a member or no matching workspace.
    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found or access denied.",
      });
    }

    // Permission check: OWNER only.
    if (target.role_name !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "No permission to delete workspace. (Owner only.)",
      });
    }

    // Policy check: default (personal) workspace cannot be deleted.
    if (target.is_default) {
      return res.status(403).json({
        success: false,
        message: "Default personal workspace cannot be deleted.",
      });
    }

    // 2. Delete workspace.
    // ON DELETE CASCADE removes related projects, members, and boards.
    await pool.query("DELETE FROM workspace WHERE id = $1", [workspaceId]);

    res.json({
      success: true,
      message: "Workspace and related data deleted.",
    });
  } catch (error) {
    logger.error("Workspace delete error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: "Server error. Delete failed." });
  }
});

export default router;
