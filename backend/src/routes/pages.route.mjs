import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import {
  requireProjectMember,
  requireProjectMemberOrPublic,
  resolveProjectIdFromOrderedPages,
  resolveProjectIdFromPageId,
  resolveProjectIdFromRequest,
} from "../middlewares/projectMember.middleware.mjs";
import { createNotifications, NOTIFICATION_TYPES } from "../notification.mjs";
import logger from "../logger.mjs";

const router = express.Router();

const ensureProjectExists = async (projectId, res) => {
  const projectRes = await pool.query("SELECT id FROM project WHERE id = $1", [projectId]);
  if (projectRes.rows.length === 0) {
    res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
    return false;
  }
  return true;
};

/**
 * @swagger
 * /api/pages:
 *   get:
 *     summary: 프로젝트 페이지 트리 조회
 *     description: 쿼리스트링 project_id로 특정 프로젝트의 페이지 트리 조회
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 페이지 트리 조회 성공
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
 *                     $ref: "#/components/schemas/Page"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/", resolveProjectIdFromRequest, requireProjectMemberOrPublic, async (req, res) => {
  const projectId = req.projectId;

  try {
    const projectExists = await ensureProjectExists(projectId, res);
    if (!projectExists) return;

    const pagesRes = await pool.query(
      "SELECT * FROM page WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [projectId]
    );

    const rows = pagesRes.rows;
    const map = {};
    rows.forEach((r) => (map[r.id] = { ...r, children: [] }));
    const roots = [];
    rows.forEach((r) => {
      if (r.parent_id) {
        if (map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
      } else {
        roots.push(map[r.id]);
      }
    });

    res.json(roots);
  } catch (error) {
    logger.error("pages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/recent:
 *   get:
 *     summary: 최근 페이지 활동 조회
 *     description: 최근 24시간 페이지 활동 목록 조회
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 최근 페이지 활동 조회 성공
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           project_id:
 *                             type: integer
 *                           parent_id:
 *                             type: integer
 *                             nullable: true
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           event_type:
 *                             type: string
 *                             enum: [CREATED, UPDATED]
 *                           occurred_at:
 *                             type: string
 *                             format: date-time
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get(
  "/recent",
  resolveProjectIdFromRequest,
  requireProjectMemberOrPublic,
  async (req, res) => {
  const projectId = req.projectId;

  try {
    const projectExists = await ensureProjectExists(projectId, res);
    if (!projectExists) return;

    const recentRes = await pool.query(
      `SELECT
        id,
        title,
        project_id,
        parent_id,
        created_at,
        updated_at,
        'CREATED' as event_type,
        created_at as occurred_at
       FROM page
       WHERE project_id = $1
         AND created_at >= NOW() - INTERVAL '24 hours'
       UNION ALL
       SELECT
        id,
        title,
        project_id,
        parent_id,
        created_at,
        updated_at,
        'UPDATED' as event_type,
        updated_at as occurred_at
       FROM page
       WHERE project_id = $1
         AND updated_at >= NOW() - INTERVAL '24 hours'
         AND updated_at > created_at
       ORDER BY occurred_at DESC`,
      [projectId]
    );

    res.json(recentRes.rows);
  } catch (error) {
    logger.error("recent pages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}:
 *   get:
 *     summary: 페이지 상세 조회
 *     description: 쿼리스트링 project_id로 특정 페이지 상세 조회
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 페이지 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Page"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:pageId", resolveProjectIdFromPageId, requireProjectMemberOrPublic, async (req, res) => {
  const { pageId } = req.params;

  try {
    const pageRes = await pool.query("SELECT * FROM page WHERE id = $1", [pageId]);

    if (pageRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "페이지를 찾을 수 없습니다." });
    }

    const page = pageRes.rows[0];
    const childrenRes = await pool.query(
      "SELECT * FROM page WHERE parent_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [page.id]
    );

    page.children = childrenRes.rows;

    res.json(page);
  } catch (error) {
    logger.error("page detail error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}:
 *   patch:
 *     summary: 페이지 수정
 *     description: 쿼리스트링 project_id로 특정 페이지 수정
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: 페이지 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Page"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:pageId", isAuth, resolveProjectIdFromPageId, requireProjectMember, async (req, res) => {
  const { pageId } = req.params;
  const { title, content } = req.body;
  const hasParentUpdate = Object.prototype.hasOwnProperty.call(req.body, "parent_id");
  const rawParentId = req.body.parent_id;
  const projectId = req.projectId;

  try {
    let nextParentId = null;
    if (hasParentUpdate) {
      if (rawParentId === null || rawParentId === "" || rawParentId === undefined) {
        nextParentId = null;
      } else {
        const parsedParentId = Number(rawParentId);
        if (!Number.isInteger(parsedParentId) || parsedParentId <= 0) {
          return res
            .status(400)
            .json({ name: "BadRequest", message: "parent_id must be a positive number or null" });
        }
        nextParentId = parsedParentId;
      }

      if (nextParentId !== null && String(nextParentId) === String(pageId)) {
        return res
          .status(400)
          .json({ name: "BadRequest", message: "페이지를 자기 자신 아래로 이동할 수 없습니다." });
      }

      if (nextParentId !== null) {
        const parentRes = await pool.query(
          "SELECT id, project_id, parent_id FROM page WHERE id = $1",
          [nextParentId]
        );

        if (parentRes.rows.length === 0) {
          return res
            .status(404)
            .json({ name: "NotFound", message: "상위 페이지를 찾을 수 없습니다." });
        }

        if (String(parentRes.rows[0].project_id) !== String(projectId)) {
          return res
            .status(400)
            .json({ name: "BadRequest", message: "같은 프로젝트 내에서만 이동할 수 있습니다." });
        }

        let cursor = parentRes.rows[0];
        while (cursor?.parent_id) {
          if (String(cursor.parent_id) === String(pageId)) {
            return res
              .status(400)
              .json({ name: "BadRequest", message: "하위 페이지 아래로 이동할 수 없습니다." });
          }

          const nextRes = await pool.query(
            "SELECT id, parent_id FROM page WHERE id = $1 AND project_id = $2",
            [cursor.parent_id, projectId]
          );
          cursor = nextRes.rows[0] || null;
        }
      }
    }

    const updateRes = await pool.query(
      `UPDATE page
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           parent_id = CASE WHEN $4 THEN $3 ELSE parent_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, content, nextParentId, hasParentUpdate, pageId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "페이지를 찾을 수 없습니다." });
    }

    res.json(updateRes.rows[0]);
  } catch (error) {
    logger.error("update page error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}:
 *   delete:
 *     summary: 페이지 삭제
 *     description: 쿼리스트링 project_id로 특정 페이지 삭제 (페이지 OWNER 전용)
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/:pageId", isAuth, resolveProjectIdFromPageId, requireProjectMember, async (req, res) => {
  const { pageId } = req.params;
  const projectId = req.projectId;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, userId]
    );

    if (!memberCheck.rows[0] || memberCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "페이지 삭제 권한이 없습니다." });
    }

    await pool.query("DELETE FROM page WHERE id = $1 AND project_id = $2", [pageId, projectId]);

    res.json({ message: "페이지가 삭제되었습니다." });
  } catch (error) {
    logger.error("delete page error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}/members:
 *   get:
 *     summary: 페이지 권한 목록
 *     description: 쿼리스트링 project_id로 페이지 권한 목록 조회
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 페이지 권한 목록 조회 성공
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
 *                     $ref: "#/components/schemas/PageMember"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get(
  "/:pageId/members",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
  const { pageId } = req.params;

  try {
    const result = await pool.query(
      `SELECT pm.id, m.id as member_id, m.name, m.email, pm.role_name
       FROM page_member pm
       JOIN member m ON pm.member_id = m.id
       WHERE pm.page_id = $1
       ORDER BY m.name ASC`,
      [pageId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error("page members error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}/members:
 *   post:
 *     summary: 페이지 권한 부여
 *     description: 쿼리스트링 project_id로 페이지 권한 부여 (OWNER 전용)
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
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
 *             required:
 *               - member_id
 *               - role_name
 *     responses:
 *       201:
 *         description: 권한 부여 성공
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
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post(
  "/:pageId/members",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
  const { pageId } = req.params;
  const projectId = req.projectId;
  const { member_id, role_name } = req.body;
  const userId = req.session.userId;

  if (!member_id || !role_name) {
    return res.status(400).json({ name: "BadRequest", message: "member_id and role_name required" });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "권한이 없습니다." });
    }

    await pool.query("DELETE FROM page_member WHERE page_id = $1 AND member_id = $2", [
      pageId,
      member_id,
    ]);

    const insertRes = await pool.query(
      "INSERT INTO page_member (page_id, member_id, role_name) VALUES ($1, $2, $3) RETURNING id",
      [pageId, member_id, role_name]
    );

    res.status(201).json({
      message: "권한이 저장되었습니다.",
      id: insertRes.rows[0].id,
    });
  } catch (error) {
    logger.error("page member add error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/{pageId}/members/{memberId}:
 *   delete:
 *     summary: 페이지 권한 제거
 *     description: 쿼리스트링 project_id로 페이지 멤버 권한 제거 (페이지 OWNER 전용)
 *     tags:
 *       - Page
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 권한 제거 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete(
  "/:pageId/members/:memberId",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
  const { pageId, memberId } = req.params;
  const userId = req.session.userId;
  const targetMemberId = Number(memberId);

  if (!Number.isInteger(targetMemberId) || targetMemberId <= 0) {
    return res.status(400).json({ name: "BadRequest", message: "memberId must be a positive number" });
  }

  try {
    const ownerCheck = await pool.query(
      "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, userId]
    );

    if (!ownerCheck.rows[0] || ownerCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "권한이 없습니다." });
    }

    const targetCheck = await pool.query(
      "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, targetMemberId]
    );

    if (targetCheck.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "페이지 권한 멤버를 찾을 수 없습니다." });
    }

    const targetRole = targetCheck.rows[0].role_name;
    if (targetRole === "OWNER") {
      const ownerCountRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM page_member WHERE page_id = $1 AND role_name = 'OWNER'",
        [pageId]
      );

      if ((ownerCountRes.rows[0]?.count || 0) <= 1) {
        return res.status(403).json({ name: "Forbidden", message: "마지막 OWNER는 제거할 수 없습니다." });
      }
    }

    await pool.query(
      "DELETE FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, targetMemberId]
    );

    res.json({ message: "권한이 제거되었습니다." });
  } catch (error) {
    logger.error("page member remove error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages:
 *   post:
 *     summary: 페이지 생성
 *     description: 쿼리스트링 project_id로 특정 프로젝트에 페이지 생성
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: project_id
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *             required:
 *               - title
 *     responses:
 *       201:
 *         description: 페이지 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/CreatedId"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/", isAuth, resolveProjectIdFromRequest, requireProjectMember, async (req, res) => {
  const projectId = req.projectId;
  const userId = req.session.userId;
  const { title, content, parent_id } = req.body;

  try {
    const insertRes = await pool.query(
      "INSERT INTO page (title, content, project_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, content || null, projectId, parent_id || null]
    );

    await pool.query(
      "INSERT INTO page_member (page_id, member_id, role_name) VALUES ($1, $2, 'OWNER')",
      [insertRes.rows[0].id, userId]
    );

    res.status(201).json({ id: insertRes.rows[0].id });
  } catch (error) {
    logger.error("create page error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/pages/reorder:
 *   post:
 *     summary: 페이지 정렬 변경
 *     description: 쿼리스트링 project_id로 페이지 정렬 순서 변경 (동일 부모 내)
 *     tags:
 *       - Page
 *     parameters:
 *       - in: query
 *         name: project_id
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
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *               ordered_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - ordered_ids
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post(
  "/reorder",
  isAuth,
  resolveProjectIdFromOrderedPages,
  requireProjectMember,
  async (req, res) => {
  const projectId = req.projectId;
  const parent_id = req.parentId;
  const ids = req.orderedPageIds;

  const client = await pool.connect();
  try {
    const parentFilter = parent_id ? "parent_id = $2" : "parent_id IS NULL";
    const params = parent_id ? [projectId, parent_id, ids] : [projectId, ids];

    const checkRes = await client.query(
      `SELECT id FROM page WHERE project_id = $1 AND ${parentFilter} AND id = ANY($${parent_id ? 3 : 2})`,
      params
    );

    if (checkRes.rows.length !== ids.length) {
      return res.status(400).json({ name: "BadRequest", message: "정렬 대상이 올바르지 않습니다." });
    }

    await client.query("BEGIN");
    for (let index = 0; index < ids.length; index += 1) {
      await client.query("UPDATE page SET sort_order = $1 WHERE id = $2 AND project_id = $3", [
        index,
        ids[index],
        projectId,
      ]);
    }
    await client.query("COMMIT");

    res.json({});
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("page reorder error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

// ─── Page Permission Requests ────────────────────────────────────────────────

/** POST /pages/:pageId/permission-requests — 편집 권한 신청 */
router.post(
  "/:pageId/permission-requests",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
    const { pageId } = req.params;
    const userId = req.session.userId;
    const { reason } = req.body;

    try {
      // 이미 OWNER/EDITOR이면 신청 불필요
      const roleRes = await pool.query(
        "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
        [pageId, userId]
      );
      const currentRole = (roleRes.rows[0]?.role_name || "").toUpperCase();
      if (["OWNER", "EDITOR"].includes(currentRole)) {
        return res.status(400).json({ name: "BadRequest", message: "이미 편집 권한이 있습니다." });
      }

      // 기존 PENDING 신청 확인
      const existingRes = await pool.query(
        "SELECT id, status FROM page_permission_request WHERE page_id = $1 AND requester_id = $2",
        [pageId, userId]
      );
      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (existing.status === "PENDING") {
          return res.status(400).json({ name: "BadRequest", message: "이미 신청 중입니다." });
        }
        // 거절된 경우 재신청 허용: 기존 레코드 업데이트
        await pool.query(
          "UPDATE page_permission_request SET reason = $1, status = 'PENDING', created_at = current_timestamp WHERE id = $2",
          [reason || null, existing.id]
        );
      } else {
        await pool.query(
          "INSERT INTO page_permission_request (page_id, requester_id, reason) VALUES ($1, $2, $3)",
          [pageId, userId, reason || null]
        );
      }

      // 페이지 정보 + 신청자 이름 조회
      const pageRes = await pool.query("SELECT title FROM page WHERE id = $1", [pageId]);
      const requesterRes = await pool.query("SELECT name FROM member WHERE id = $1", [userId]);
      const pageTitle = pageRes.rows[0]?.title || "";
      const requesterName = requesterRes.rows[0]?.name || "";

      // 페이지 OWNER들에게 알림 발송 + WebSocket push
      const ownersRes = await pool.query(
        "SELECT member_id FROM page_member WHERE page_id = $1 AND role_name = 'OWNER'",
        [pageId]
      );
      const projectId = req.projectId;

      if (ownersRes.rows.length > 0) {
        const ownerIds = ownersRes.rows.map((row) => row.member_id);
        await createNotifications({
          recipientIds: ownerIds,
          actorId: userId,
          type: NOTIFICATION_TYPES.PAGE_PERMISSION_REQUESTED,
          resourceType: "page",
          resourceId: Number(pageId),
          projectId: Number(projectId),
          title: `${requesterName}님이 "${pageTitle}" 페이지 편집 권한을 신청했습니다.`,
          payload: { page_id: Number(pageId), page_title: pageTitle, project_id: Number(projectId) },
        });
      }

      res.status(201).json({ message: "편집 권한 신청이 완료되었습니다." });
    } catch (error) {
      logger.error("page permission request error", { err: error?.message, stack: error?.stack });
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

/** GET /pages/:pageId/permission-requests — 신청 목록 조회 (페이지 OWNER) */
router.get(
  "/:pageId/permission-requests",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
    const { pageId } = req.params;
    const userId = req.session.userId;

    try {
      const ownerCheck = await pool.query(
        "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
        [pageId, userId]
      );
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].role_name !== "OWNER") {
        return res.status(403).json({ name: "Forbidden", message: "권한이 없습니다." });
      }

      const result = await pool.query(
        `SELECT r.id, r.status, r.reason, r.created_at,
                m.id AS requester_id, m.name AS requester_name, m.email AS requester_email
         FROM page_permission_request r
         JOIN member m ON m.id = r.requester_id
         WHERE r.page_id = $1 AND r.status = 'PENDING'
         ORDER BY r.created_at DESC`,
        [pageId]
      );

      res.json(result.rows);
    } catch (error) {
      logger.error("page permission request list error", { err: error?.message, stack: error?.stack });
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

/** PATCH /pages/:pageId/permission-requests/:requestId — 승인/거절 (페이지 OWNER) */
router.patch(
  "/:pageId/permission-requests/:requestId",
  isAuth,
  resolveProjectIdFromPageId,
  requireProjectMember,
  async (req, res) => {
    const { pageId, requestId } = req.params;
    const userId = req.session.userId;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(String(status || "").toUpperCase())) {
      return res.status(400).json({ name: "BadRequest", message: "status must be APPROVED or REJECTED" });
    }

    try {
      const ownerCheck = await pool.query(
        "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
        [pageId, userId]
      );
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].role_name !== "OWNER") {
        return res.status(403).json({ name: "Forbidden", message: "권한이 없습니다." });
      }

      const requestRes = await pool.query(
        "SELECT * FROM page_permission_request WHERE id = $1 AND page_id = $2",
        [requestId, pageId]
      );
      if (requestRes.rows.length === 0) {
        return res.status(404).json({ name: "NotFound", message: "신청을 찾을 수 없습니다." });
      }

      const request = requestRes.rows[0];
      if (request.status !== "PENDING") {
        return res.status(400).json({ name: "BadRequest", message: "이미 처리된 신청입니다." });
      }

      const normalizedStatus = status.toUpperCase();

      await pool.query(
        "UPDATE page_permission_request SET status = $1 WHERE id = $2",
        [normalizedStatus, requestId]
      );

      if (normalizedStatus === "APPROVED") {
        // EDITOR 권한 부여 (이미 있으면 업데이트)
        await pool.query(
          `INSERT INTO page_member (page_id, member_id, role_name)
           VALUES ($1, $2, 'EDITOR')
           ON CONFLICT (page_id, member_id) DO UPDATE SET role_name = 'EDITOR'`,
          [pageId, request.requester_id]
        );
      }

      // 신청자에게 결과 알림 + WebSocket push
      const pageRes = await pool.query("SELECT title FROM page WHERE id = $1", [pageId]);
      const pageTitle = pageRes.rows[0]?.title || "";
      const projectId = req.projectId;

      await createNotifications({
        recipientIds: [request.requester_id],
        actorId: userId,
        type: NOTIFICATION_TYPES.PAGE_PERMISSION_RESOLVED,
        resourceType: "page",
        resourceId: Number(pageId),
        projectId: Number(projectId),
        title:
          normalizedStatus === "APPROVED"
            ? `"${pageTitle}" 페이지 편집 권한이 승인되었습니다.`
            : `"${pageTitle}" 페이지 편집 권한 신청이 거절되었습니다.`,
        payload: {
          page_id: Number(pageId),
          page_title: pageTitle,
          project_id: Number(projectId),
          resolved_status: normalizedStatus,
        },
      });

      res.json({ message: normalizedStatus === "APPROVED" ? "승인되었습니다." : "거절되었습니다." });
    } catch (error) {
      logger.error("page permission request review error", { err: error?.message, stack: error?.stack });
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

export default router;
