import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/boards:
 *   get:
 *     summary: 프로젝트 보드 목록
 *     description: 쿼리스트링 projectId로 특정 프로젝트 내의 활성 보드 목록 조회
 *     tags:
 *       - Board
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 보드 목록 조회 성공
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
 *                     $ref: "#/components/schemas/Board"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/", isAuth, async (req, res) => {
  const { projectId } = req.query;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ success: false, message: "projectId가 필요합니다." });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const boards = await pool.query(
      `SELECT
          b.*,
          COALESCE(
              json_build_object(
                  'BACKLOG', COUNT(CASE WHEN i.status = 'BACKLOG' THEN 1 ELSE NULL END),
                  'PENDING', COUNT(CASE WHEN i.status = 'PENDING' THEN 1 ELSE NULL END),
                  'IN_PROGRESS', COUNT(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE NULL END),
                  'IN_REVIEW', COUNT(CASE WHEN i.status = 'IN_REVIEW' THEN 1 ELSE NULL END),
                  'DONE', COUNT(CASE WHEN i.status = 'DONE' THEN 1 ELSE NULL END)
              ),
              json_build_object(
                  'BACKLOG', 0,
                  'PENDING', 0,
                  'IN_PROGRESS', 0,
                  'IN_REVIEW', 0,
                  'DONE', 0
              )
          ) AS issue_counts
      FROM
          board b
      LEFT JOIN
          issue i ON b.id = i.board_id
      WHERE
          b.project_id = $1 AND b.is_active = 1
      GROUP BY
          b.id
      ORDER BY
          b.sort_order ASC, b.created_at DESC;`,
      [projectId]
    );

    res.json({ success: true, data: boards.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/boards:
 *   post:
 *     summary: 보드 생성
 *     description: 새 보드를 생성하고 생성자를 OWNER로 등록
 *     tags:
 *       - Board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
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
 *         description: 보드 생성 성공
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
  const { name, project_id, type = "KANBAN" } = req.body;
  const userId = req.session.userId;

  if (!name || !project_id) {
    return res
      .status(400)
      .json({ success: false, message: "보드 이름과 프로젝트 ID는 필수입니다." });
  }

  const client = await pool.connect();

  try {
    // 1. 권한 확인: 사용자가 해당 프로젝트의 멤버인지 확인
    const authCheck = await client.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [project_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "프로젝트 멤버가 아닙니다." });
    }

    await client.query("BEGIN");

    // 2. 보드 생성
    const boardQuery = `
        INSERT INTO board (name, project_id, type)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const boardRes = await client.query(boardQuery, [name, project_id, type]);
    const newBoard = boardRes.rows[0];

    // 3. 보드 멤버 등록 (생성자를 OWNER로 등록)
    const memberQuery = `
        INSERT INTO board_member (board_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newBoard.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({ success: true, data: { id: newBoard.id } });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Board create error", {
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
 * /api/boards/{boardId}:
 *   get:
 *     summary: 보드 상세 조회
 *     description: 보드의 상세 정보 조회
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 보드 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Board"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:boardId", isAuth, async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query("SELECT * FROM board WHERE id = $1", [boardId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "보드를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/boards/{boardId}:
 *   patch:
 *     summary: 보드 수정
 *     description: 보드 이름 변경 (OWNER 전용)
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: boardId
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
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: 보드 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Board"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:boardId", isAuth, async (req, res) => {
  const { boardId } = req.params;
  const { name } = req.body;
  const userId = req.session.userId;

  if (!name) {
    return res.status(400).json({ success: false, message: "보드 이름은 필수입니다." });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM board_member WHERE board_id = $1 AND member_id = $2",
      [boardId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "보드 수정 권한이 없습니다." });
    }

    const updateRes = await pool.query(
      "UPDATE board SET name = $1 WHERE id = $2 RETURNING *",
      [name, boardId]
    );

    res.json({ success: true, data: updateRes.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/boards/{boardId}:
 *   delete:
 *     summary: 보드 삭제
 *     description: 보드 삭제 (OWNER 전용)
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: boardId
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
router.delete("/:boardId", isAuth, async (req, res) => {
  const { boardId } = req.params;
  const userId = req.session.userId;

  try {
    // 권한 확인: 보드의 OWNER인지 확인
    const authCheck = await pool.query(
      "SELECT role_name FROM board_member WHERE board_id = $1 AND member_id = $2",
      [boardId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "보드 삭제 권한이 없습니다." });
    }

    // 추가: 보드가 기본 백로그 보드인지 확인 (type으로 구분)
    const boardCheck = await pool.query(
      "SELECT type FROM board WHERE id = $1",
      [boardId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: "보드를 찾을 수 없습니다." });
    }

    if (boardCheck.rows[0].type === 'BACKLOG') {
      return res.status(403).json({ success: false, message: "백로그 보드는 삭제할 수 없습니다." });
    }

    // ON DELETE CASCADE에 의해 관련 issue, board_member 자동 삭제됨
    await pool.query("DELETE FROM board WHERE id = $1", [boardId]);

    res.json({ success: true, message: "보드가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/boards/{boardId}/issues:
 *   get:
 *     summary: 보드 이슈 목록
 *     description: 특정 보드의 모든 이슈 조회
 *     tags:
 *       - Board
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 이슈 목록 조회 성공
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
 *                     $ref: "#/components/schemas/IssueWithAssignees"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:boardId/issues", isAuth, async (req, res) => {
  const { boardId } = req.params;
  try {
    const query = `
      SELECT i.*, 
             COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', m.id,
                  'name', m.name,
                  'role_name', im.role_name
                )
              )
              FROM issue_member im 
              JOIN member m ON im.member_id = m.id 
              WHERE im.issue_id = i.id
             ), '[]'::json) as assignee_members
      FROM issue i
      WHERE i.board_id = $1
      ORDER BY i.updated_at ASC;
    `;
    const result = await pool.query(query, [boardId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
