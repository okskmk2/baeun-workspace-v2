import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @route   POST /api/project
 * @desc    특정 워크스페이스 내에 새 프로젝트 생성
 */
router.post("/", isAuth, async (req, res) => {
  const { name, workspace_id, img_url, theme_json } = req.body;
  const userId = req.session.userId;

  try {
    // 1. 권한 확인: 사용자가 해당 워크스페이스의 멤버(ADMIN 이상 권한 권장)인지 확인
    const authCheck = await pool.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspace_id, userId],
    );

    if (authCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: "프로젝트 생성 권한이 없습니다." });
    }

    // 2. 프로젝트 삽입
    const query = `
        INSERT INTO project (name, workspace_id, img_url, theme_json)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const result = await pool.query(query, [
      name,
      workspace_id,
      img_url,
      theme_json,
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
