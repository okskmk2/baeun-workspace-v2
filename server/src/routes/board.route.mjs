import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/board:
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
 *       400:
 *         description: 필수 항목 누락
 *       403:
 *         description: 프로젝트 멤버가 아님
 *       500:
 *         description: 서버 오류
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

    res.status(201).json({ success: true, data: newBoard });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Board 생성 오류:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/board/{boardId}:
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
 *       404:
 *         description: 보드를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get("/:boardId", isAuth, async (req, res) => {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM board WHERE id = $1",
      [boardId]
    );

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
 * /api/board/{boardId}:
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
 *         description: 보드 삭제 성공
 *       403:
 *         description: 삭제 권한이 없음
 *       500:
 *         description: 서버 오류
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

    // ON DELETE CASCADE에 의해 관련 issue, board_member 자동 삭제됨
    await pool.query("DELETE FROM board WHERE id = $1", [boardId]);

    res.json({ success: true, message: "보드가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/board/:boardId/issue
 * @desc    특정 보드의 모든 이슈 조회
 */
router.get("/:boardId/issue", isAuth, async (req, res) => {
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
