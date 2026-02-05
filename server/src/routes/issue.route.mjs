import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @route   POST /api/issue
 * @desc    새 이슈 생성
 */
router.post("/", isAuth, async (req, res) => {
  const { title, content, board_id, status = "백로그" } = req.body;
  const userId = req.session.userId;

  try {
    // 1. 권한 확인: 사용자가 해당 보드가 속한 프로젝트의 멤버인지 확인
    const authCheck = await pool.query(
      `SELECT pm.id FROM project_member pm
       JOIN board b ON b.project_id = pm.project_id
       WHERE b.id = $1 AND pm.member_id = $2`,
      [board_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "이슈를 생성할 권한이 없습니다." });
    }

    // 2. 이슈 삽입
    const query = `
      INSERT INTO issue (title, content, board_id, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [title, content, board_id, status]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/issue/:issueId
 * @desc    이슈 상태(Status) 또는 내용 수정
 */
router.patch("/:issueId", isAuth, async (req, res) => {
  const { issueId } = req.params;
  const { title, content, status } = req.body;

  try {
    const query = `
      UPDATE issue 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          status = COALESCE($3, status)
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(query, [title, content, status, issueId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "이슈를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/issue/:issueId/assign
 * @desc    이슈에 담당자 할당
 */
router.post("/:issueId/assign", isAuth, async (req, res) => {
  const { issueId } = req.params;
  const { member_id, role_name = "ASSIGNEE" } = req.body;

  try {
    const query = `
      INSERT INTO issue_member (issue_id, member_id, role_name)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;
    await pool.query(query, [issueId, member_id, role_name]);
    res.json({ success: true, message: "담당자가 할당되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/issue/:issueId
 * @desc    이슈 삭제
 */
router.delete("/:issueId", isAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM issue WHERE id = $1", [req.params.issueId]);
    res.json({ success: true, message: "이슈가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
