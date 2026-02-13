import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

const getProjectId = (req, res) => {
  const projectId = req.query.project_id;
  if (!projectId) {
    res.status(400).json({ name: "BadRequest", message: "project_id is required" });
    return null;
  }
  return projectId;
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
router.get("/", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

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
router.get("/recent", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

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
router.get("/:pageId", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const { pageId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const pageRes = await pool.query("SELECT * FROM page WHERE id = $1 AND project_id = $2", [
      pageId,
      projectId,
    ]);

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
router.patch("/:pageId", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const { pageId } = req.params;
  const userId = req.session.userId;
  const { title, content } = req.body;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const updateRes = await pool.query(
      `UPDATE page
       SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND project_id = $4
       RETURNING *`,
      [title, content, pageId, projectId]
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
router.delete("/:pageId", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const { pageId } = req.params;
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
router.get("/:pageId/members", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const { pageId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

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
router.post("/:pageId/members", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const { pageId } = req.params;
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
router.delete("/:pageId/members/:memberId", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;

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
router.post("/", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const userId = req.session.userId;
  const { title, content, parent_id } = req.body;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

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
router.post("/reorder", isAuth, async (req, res) => {
  const projectId = getProjectId(req, res);
  if (!projectId) return;
  const userId = req.session.userId;
  const { parent_id = null, ordered_ids } = req.body;

  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return res.status(400).json({ name: "BadRequest", message: "ordered_ids is required" });
  }

  const ids = ordered_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (ids.length !== ordered_ids.length) {
    return res.status(400).json({ name: "BadRequest", message: "ordered_ids must be numbers" });
  }

  const client = await pool.connect();
  try {
    const memberCheck = await client.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

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

export default router;
