import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
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
 * /api/kanbans:
 *   get:
 *     summary: 프로젝트 칸반 목록
 *     description: 쿼리스트링 projectId로 특정 프로젝트 내의 활성 칸반 목록 조회
 *     tags:
 *       - Kanban
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 칸반 목록 조회 성공
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
 *                     $ref: "#/components/schemas/Kanban"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/", isAuth, async (req, res) => {
  const { projectId } = req.query;
  const isActiveParam = String(req.query.isActive || "").toLowerCase();
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "projectId가 필요합니다." });
  }

  try {
    const projectExists = await ensureProjectExists(projectId, res);
    if (!projectExists) return;

    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const activeFilter =
      isActiveParam === "true" || isActiveParam === "1"
        ? true
        : isActiveParam === "false" || isActiveParam === "0"
          ? false
          : true;

    const kanbans = await pool.query(
      `SELECT
          k.*,
          COALESCE(
              json_build_object(
                  'BACKLOG', COUNT(CASE WHEN t.status = 'BACKLOG' THEN 1 ELSE NULL END),
                  'PENDING', COUNT(CASE WHEN t.status = 'PENDING' THEN 1 ELSE NULL END),
                  'IN_PROGRESS', COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE NULL END),
                  'IN_REVIEW', COUNT(CASE WHEN t.status = 'IN_REVIEW' THEN 1 ELSE NULL END),
                  'DONE', COUNT(CASE WHEN t.status = 'DONE' THEN 1 ELSE NULL END)
              ),
              json_build_object(
                  'BACKLOG', 0,
                  'PENDING', 0,
                  'IN_PROGRESS', 0,
                  'IN_REVIEW', 0,
                  'DONE', 0
              )
          ) AS task_counts
      FROM
          kanban k
      LEFT JOIN
          task t ON k.id = t.kanban_id
      WHERE
          k.project_id = $1 AND k.is_active = $2
      GROUP BY
          k.id
      ORDER BY
          k.sort_order ASC, k.created_at DESC;`,
        [projectId, activeFilter]
    );

    res.json(kanbans.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/kanbans:
 *   post:
 *     summary: 칸반 생성
 *     description: 새 칸반을 생성하고 생성자를 OWNER로 등록
 *     tags:
 *       - Kanban
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               summary:
 *                 type: string
 *               project_id:
 *                 type: integer
 *               type:
 *                 type: string
 *                 default: KANBAN
 *             required:
 *               - name
 *               - project_id
 *     responses:
 *       201:
 *         description: 칸반 생성 성공
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
  const { name, summary, project_id, type = "KANBAN" } = req.body;
  const userId = req.session.userId;

  if (!name || !project_id) {
    return res
      .status(400)
      .json({ name: "BadRequest", message: "칸반 이름과 프로젝트 ID는 필수입니다." });
  }

  const client = await pool.connect();

  try {
    const projectExists = await ensureProjectExists(project_id, res);
    if (!projectExists) return;

    // 1. 권한 확인: 사용자가 해당 프로젝트의 멤버인지 확인
    const authCheck = await client.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [project_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "프로젝트 멤버가 아닙니다." });
    }

    await client.query("BEGIN");

    // 2. 칸반 생성
    const kanbanQuery = `
      INSERT INTO kanban (name, summary, project_id, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const kanbanRes = await client.query(kanbanQuery, [name, summary ?? null, project_id, type]);
    const newKanban = kanbanRes.rows[0];

    // 3. 칸반 멤버 등록 (생성자를 OWNER로 등록)
    const memberQuery = `
        INSERT INTO kanban_member (kanban_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newKanban.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({ id: newKanban.id });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Kanban create error", {
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
 * /api/kanbans/{kanbanId}:
 *   get:
 *     summary: 칸반 상세 조회
 *     description: 칸반의 상세 정보 조회
 *     tags:
 *       - Kanban
 *     parameters:
 *       - in: path
 *         name: kanbanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 칸반 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Kanban"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:kanbanId", isAuth, async (req, res) => {
  const { kanbanId } = req.params;
  try {
    const result = await pool.query("SELECT * FROM kanban WHERE id = $1", [kanbanId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "칸반을 찾을 수 없습니다." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/kanbans/{kanbanId}:
 *   patch:
 *     summary: 칸반 수정
 *     description: 칸반 이름 변경 (OWNER 전용)
 *     tags:
 *       - Kanban
 *     parameters:
 *       - in: path
 *         name: kanbanId
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
 *               name:
 *                 type: string
 *               summary:
 *                 type: string
 *     responses:
 *       200:
 *         description: 칸반 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Kanban"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:kanbanId", isAuth, async (req, res) => {
  const { kanbanId } = req.params;
  const { name, summary, is_active } = req.body;
  const userId = req.session.userId;

  if (name === undefined && summary === undefined && is_active === undefined) {
    return res.status(400).json({ name: "BadRequest", message: "수정할 항목이 필요합니다." });
  }

  if (name !== undefined && !name) {
    return res.status(400).json({ name: "BadRequest", message: "칸반 이름은 필수입니다." });
  }

  if (is_active !== undefined && typeof is_active !== "boolean") {
    return res
      .status(400)
      .json({ name: "BadRequest", message: "is_active는 boolean 이어야 합니다." });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM kanban_member WHERE kanban_id = $1 AND member_id = $2",
      [kanbanId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "칸반 수정 권한이 없습니다." });
    }

    if (is_active !== undefined) {
      const kanbanTypeRes = await pool.query("SELECT type FROM kanban WHERE id = $1", [kanbanId]);
      if (kanbanTypeRes.rows.length === 0) {
        return res.status(404).json({ name: "NotFound", message: "칸반을 찾을 수 없습니다." });
      }
      if (kanbanTypeRes.rows[0].type === "BACKLOG" && is_active === false) {
        return res
          .status(403)
          .json({ name: "Forbidden", message: "백로그 보드는 비활성화할 수 없습니다." });
      }
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex += 1;
    }

    if (summary !== undefined) {
      fields.push(`summary = $${paramIndex}`);
      values.push(summary);
      paramIndex += 1;
    }

    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex += 1;
    }

    values.push(kanbanId);
    const updateQuery = `UPDATE kanban SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    const updateRes = await pool.query(updateQuery, values);

    res.json(updateRes.rows[0]);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/kanbans/{kanbanId}:
 *   delete:
 *     summary: 칸반 삭제
 *     description: 칸반 삭제 (OWNER 전용)
 *     tags:
 *       - Kanban
 *     parameters:
 *       - in: path
 *         name: kanbanId
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
router.delete("/:kanbanId", isAuth, async (req, res) => {
  const { kanbanId } = req.params;
  const userId = req.session.userId;

  try {
    // 권한 확인: 칸반의 OWNER인지 확인
    const authCheck = await pool.query(
      "SELECT role_name FROM kanban_member WHERE kanban_id = $1 AND member_id = $2",
      [kanbanId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "칸반 삭제 권한이 없습니다." });
    }

    // 추가: 칸반이 기본 백로그 칸반인지 확인 (type으로 구분)
    const kanbanCheck = await pool.query(
      "SELECT type FROM kanban WHERE id = $1",
      [kanbanId]
    );

    if (kanbanCheck.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "칸반을 찾을 수 없습니다." });
    }

    if (kanbanCheck.rows[0].type === 'BACKLOG') {
      return res.status(403).json({ name: "Forbidden", message: "백로그 칸반은 삭제할 수 없습니다." });
    }

    // ON DELETE CASCADE에 의해 관련 task, kanban_member 자동 삭제됨
    await pool.query("DELETE FROM kanban WHERE id = $1", [kanbanId]);

    res.json({ message: "칸반이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/kanbans/{kanbanId}/tasks:
 *   get:
 *     summary: 칸반 작업 목록
 *     description: 특정 칸반의 모든 작업 조회
 *     tags:
 *       - Kanban
 *     parameters:
 *       - in: path
 *         name: kanbanId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 작업 목록 조회 성공
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
 *                     $ref: "#/components/schemas/TaskWithAssignees"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:kanbanId/tasks", isAuth, async (req, res) => {
  const { kanbanId } = req.params;
  try {
    const query = `
      SELECT t.*, 
             COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', m.id,
                  'name', m.name,
                  'role_name', tm.role_name
                )
              )
              FROM task_member tm 
              JOIN member m ON tm.member_id = m.id 
              WHERE tm.task_id = t.id
             ), '[]'::json) as assignee_members
      FROM task t
      WHERE t.kanban_id = $1
      ORDER BY t.updated_at ASC;
    `;
    const result = await pool.query(query, [kanbanId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
