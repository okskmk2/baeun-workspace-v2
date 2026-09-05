import express from "express";
import pool from "../db.mjs";
import { normalizeThemeJson } from "../utils/parsers.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/public/workspaces:
 *   get:
 *     summary: List public workspaces
 *     description: List workspaces marked as public, no authentication required
 *     tags:
 *       - Public
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Public workspaces retrieved
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get(
  "/workspaces",
  withPagination({ defaultPageSize: 12, maxPageSize: 50 }),
  async (req, res) => {
    const { page, pageSize } = req.pagination;

    try {
      const countRes = await pool.query(
        "SELECT COUNT(*)::int AS total FROM workspace WHERE is_public = true"
      );
      const total = Number(countRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const workspacesRes = await pool.query(
        `SELECT w.id, w.name, w.summary, w.img_url, w.theme_json, w.created_at,
                COUNT(DISTINCT wm.member_id)::int AS member_count,
                COUNT(DISTINCT p.id)::int AS project_count
         FROM workspace w
         LEFT JOIN workspace_member wm ON wm.workspace_id = w.id
         LEFT JOIN project p ON p.workspace_id = w.id
         WHERE w.is_public = true
         GROUP BY w.id
         ORDER BY w.created_at DESC
         LIMIT $1
         OFFSET $2`,
        [pageSize, offset]
      );

      const items = workspacesRes.rows.map((workspace) => ({
        ...workspace,
        theme_json: normalizeThemeJson(workspace.theme_json),
      }));

      res.json({
        items,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/public/projects:
 *   get:
 *     summary: List public projects
 *     description: List projects marked as public, no authentication required
 *     tags:
 *       - Public
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Public projects retrieved
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get(
  "/projects",
  withPagination({ defaultPageSize: 12, maxPageSize: 50 }),
  async (req, res) => {
    const { page, pageSize } = req.pagination;

    try {
      const countRes = await pool.query(
        "SELECT COUNT(*)::int AS total FROM project WHERE is_public = true"
      );
      const total = Number(countRes.rows?.[0]?.total || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const normalizedPage = Math.min(Math.max(page, 1), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      const projectsRes = await pool.query(
        `SELECT p.id, p.name, p.summary, p.img_url, p.theme_json, p.created_at,
                w.id AS workspace_id, w.name AS workspace_name,
                COUNT(DISTINCT pm.member_id)::int AS member_count
         FROM project p
         JOIN workspace w ON w.id = p.workspace_id
         LEFT JOIN project_member pm ON pm.project_id = p.id
         WHERE p.is_public = true
         GROUP BY p.id, w.id
         ORDER BY p.created_at DESC
         LIMIT $1
         OFFSET $2`,
        [pageSize, offset]
      );

      const items = projectsRes.rows.map((project) => ({
        ...project,
        theme_json: normalizeThemeJson(project.theme_json),
      }));

      res.json({
        items,
        pagination: {
          page: normalizedPage,
          pageSize,
          total,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

export default router;
