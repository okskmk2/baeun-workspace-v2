import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/issues:
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
 *                 default: BACKLOG
 *             required:
 *               - title
 *               - board_id
 *     responses:
 *       201:
 *         description: 이슈 생성 성공
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
  const { title, content, board_id, status = "BACKLOG" } = req.body;
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
    res.status(201).json({ success: true, data: { id: newIssue.id } });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/issues/{issueId}:
 *   get:
 *     summary: 이슈 상세 조회
 *     description: 이슈의 상세 정보 조회
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Issue"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:issueId", isAuth, async (req, res) => {
  const { issueId } = req.params;
  try {
    const issueRes = await pool.query(`SELECT * FROM issue WHERE id = $1`, [issueId]);
    if (issueRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "이슈를 찾을 수 없습니다." });
    }

    res.json({
      success: true,
      data: issueRes.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issues/{issueId}/members:
 *   get:
 *     summary: 이슈 관련자 목록 조회
 *     description: 이슈에 연결된 멤버 목록 조회
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
 *         description: 이슈 관련자 목록 조회 성공
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
 *                     $ref: "#/components/schemas/IssueMember"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:issueId/members", isAuth, async (req, res) => {
  const { issueId } = req.params;
  try {
    const membersRes = await pool.query(
      `SELECT im.id as issue_member_id, m.id as member_id, m.name, m.email, im.role_name
       FROM issue_member im
       JOIN member m ON im.member_id = m.id
       WHERE im.issue_id = $1`,
      [issueId]
    );

    res.json({
      success: true,
      data: membersRes.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issues/{issueId}:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Issue"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
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
 * @swagger
 * /api/issues/{issueId}/members:
 *   post:
 *     summary: 이슈 담당자 추가
 *     description: 이슈에 담당자를 추가
 *     tags:
 *       - Issue
 *     parameters:
 *       - in: path
 *         name: issueId
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
 *                 default: ASSIGNEE
 *             required:
 *               - member_id
 *     responses:
 *       200:
 *         description: 담당자 추가 성공
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
router.post("/:issueId/members", isAuth, async (req, res) => {
  const { issueId } = req.params;
  const { member_id, role_name = "ASSIGNEE" } = req.body;
  try {
    const insertRes = await pool.query(
      `INSERT INTO issue_member (issue_id, member_id, role_name) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [issueId, member_id, role_name]
    );

    let issueMemberId = insertRes.rows[0]?.id;
    if (!issueMemberId) {
      const existingRes = await pool.query(
        "SELECT id FROM issue_member WHERE issue_id = $1 AND member_id = $2",
        [issueId, member_id]
      );
      issueMemberId = existingRes.rows[0]?.id;
    }

    res.json({
      success: true,
      message: "담당자가 추가되었습니다.",
      data: { id: issueMemberId },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issues/members/{issueMemberId}:
 *   patch:
 *     summary: 이슈 담당자 역할 수정
 *     description: 이슈 담당자의 역할을 수정
 *     tags:
 *       - Issue
 *     parameters:
 *       - in: path
 *         name: issueMemberId
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
 *               role_name:
 *                 type: string
 *             required:
 *               - role_name
 *     responses:
 *       200:
 *         description: 역할 수정 성공
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
 *                     issue_id:
 *                       type: integer
 *                     member_id:
 *                       type: integer
 *                     role_name:
 *                       type: string
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/members/:issueMemberId", isAuth, async (req, res) => {
  const { issueMemberId } = req.params;
  const { role_name } = req.body;

  if (!role_name) {
    return res.status(400).json({ success: false, message: "역할이 필요합니다." });
  }

  try {
    const result = await pool.query(
      `UPDATE issue_member SET role_name = $1 WHERE id = $2 RETURNING *`,
      [role_name, issueMemberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "관련자를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issues/members/{issueMemberId}:
 *   delete:
 *     summary: 이슈 담당자 제거
 *     description: 이슈 담당자를 제거
 *     tags:
 *       - Issue
 *     parameters:
 *       - in: path
 *         name: issueMemberId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/members/:issueMemberId", isAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM issue_member WHERE id = $1`, [req.params.issueMemberId]);
    res.json({ success: true, message: "멤버가 제외되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/issues/{issueId}:
 *   delete:
 *     summary: 이슈 삭제
 *     description: 이슈 삭제
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
 *         $ref: "#/components/responses/Success200Message"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
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
