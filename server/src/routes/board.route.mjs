import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @route   POST /api/board
 * @desc    새 보드 생성 및 생성자를 OWNER로 등록
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

    // 2. 보드 테이블에 삽입
    const boardQuery = `
        INSERT INTO board (name, project_id, type)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const boardRes = await client.query(boardQuery, [name, project_id, type]);
    const newBoard = boardRes.rows[0];

    // 3. 보드 멤버 테이블에 생성자를 'OWNER'로 등록
    const memberQuery = `
        INSERT INTO board_member (board_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newBoard.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "보드가 생성되었습니다.",
      data: newBoard,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Board 생성 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류로 보드 생성에 실패했습니다." });
  } finally {
    client.release();
  }
});

export default router;
