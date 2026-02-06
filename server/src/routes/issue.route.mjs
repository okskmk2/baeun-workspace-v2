import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/issue:
 *   post:
 *     summary: 이슈 생성
 *     description: 새 이슈를 생성하고 작성자를 REPORTER로 등록
 *     tags:
 *       - Issue
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
 *               board_id:
 *                 type: integer
 *               status:
 *                 type: string
 *                 default: 백로그
 *             required:
 *               - title
 *               - board_id
 *     responses:
 *       201:
 *         description: 이슈 생성 성공
 *       403:
 *         description: 이슈 생성 권한이 없음
 *       500:
 *         description: 서버 오류
 */
router.post("/", isAuth, async (req, res) => {
  const { title, content, board_id, status = "백로그" } = req.body;
  const userId = req.session.userId;

  const client = await pool.connect();
  try {
    // 권한 확인: 프로젝트 멤버인지 체크
    const authCheck = await client.query(
      `SELECT pm.id FROM project_member pm
       JOIN board b ON b.project_id = pm.project_id
       WHERE b.id = $1 AND pm.member_id = $2`,
      [board_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "이슈 생성 권한이 없습니다." });
    }

    await client.query("BEGIN");

    // 이슈 삽입
    const issueRes = await client.query(
      `INSERT INTO issue (title, content, board_id, status) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, board_id, status]
    );
    const newIssue = issueRes.rows[0];

    // 작성자를 REPORTER로 등록
    await client.query(
      `INSERT INTO issue_member (issue_id, member_id, role_name) VALUES ($1, $2, 'REPORTER')`,
      [newIssue.id, userId]
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: newIssue });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/issue/{issueId}:
 *   get:
 *     summary: 이슈 상세 조회
 *     description: 이슈의 상세 정보와 멤버 목록 조회
 *     tags:
 *       - Issue
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 이슈 상세 조회 성공
 *       404:
 *         description: 이슈를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get("/:issueId", isAuth, async (req, res) => {
  const { issueId } = req.params;
  try {
    const issueRes = await pool.query(`SELECT * FROM issue WHERE id = $1`, [issueId]);
    if (issueRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "이슈를 찾을 수 없습니다." });
    }

    const membersRes = await pool.query(
      `SELECT im.id as issue_member_id, m.id as member_id, m.name, m.email, im.role_name 
       FROM issue_member im
       JOIN member m ON im.member_id = m.id
       WHERE im.issue_id = $1`,
      [issueId]
    );

    res.json({
      success: true,
      data: { ...issueRes.rows[0], members: membersRes.rows },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issue/{issueId}:
 *   patch:
 *     summary: 이슈 수정
 *     description: 이슈의 정보와 상태 수정
 *     tags:
 *       - Issue
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: 이슈 수정 성공
 *       404:
 *         description: 이슈를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.patch("/:issueId", isAuth, async (req, res) => {
  const { issueId } = req.params;
  const { title, content, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE issue 
       SET title = COALESCE($1, title), content = COALESCE($2, content), status = COALESCE($3, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title, content, status, issueId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "이슈 없음" });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 4. 이슈 담당자 추가 (ASSIGNEE 등)
 */
router.post("/:issueId/member", isAuth, async (req, res) => {
  const { issueId } = req.params;
  const { member_id, role_name = "ASSIGNEE" } = req.body;
  try {
    await pool.query(
      `INSERT INTO issue_member (issue_id, member_id, role_name) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [issueId, member_id, role_name]
    );
    res.json({ success: true, message: "담당자가 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 5. 이슈 담당자 제거
 */
router.delete("/member/:issueMemberId", isAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM issue_member WHERE id = $1`, [req.params.issueMemberId]);
    res.json({ success: true, message: "멤버가 제외되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 6. 이슈 삭제
 */
router.delete("/:issueId", isAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM issue WHERE id = $1`, [req.params.issueId]);
    res.json({ success: true, message: "이슈가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
