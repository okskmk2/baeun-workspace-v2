import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @route   POST /api/workspace
 * @desc    새 워크스페이스 생성 및 생성자를 OWNER로 등록
 */
router.post("/", isAuth, async (req, res) => {
  const { name, img_url, theme_json } = req.body;
  const userId = req.session.userId; // 인증 미들웨어에서 검증된 세션 ID

  // DB 트랜잭션 시작 (워크스페이스 생성과 멤버 등록은 하나로 묶여야 함)
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. 워크스페이스 생성
    const workspaceQuery = `
            INSERT INTO workspace (name, member_id, img_url, theme_json)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const workspaceRes = await client.query(workspaceQuery, [
      name,
      userId,
      img_url,
      theme_json,
    ]);
    const newWorkspace = workspaceRes.rows[0];

    // 2. 워크스페이스 멤버 테이블에 생성자를 'OWNER'로 등록
    const memberQuery = `
            INSERT INTO workspace_member (workspace_id, member_id, role_name)
            VALUES ($1, $2, 'OWNER');
        `;
    await client.query(memberQuery, [newWorkspace.id, userId]);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "워크스페이스가 생성되었습니다.",
      data: newWorkspace,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Workspace 생성 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 오류로 생성에 실패했습니다." });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/workspace/my
 * @desc    내가 참여 중인 워크스페이스 목록 조회
 */
router.get("/my", isAuth, async (req, res) => {
  try {
    const query = `
            SELECT w.*, wm.role_name 
            FROM workspace w
            JOIN workspace_member wm ON w.id = wm.workspace_id
            WHERE wm.member_id = $1
            ORDER BY w.sort_order ASC, w.id DESC;
        `;
    const result = await pool.query(query, [req.session.userId]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/project/workspace/:workspaceId
 * @desc    특정 워크스페이스 내 프로젝트 목록 조회
 */
router.get("/workspace/:workspaceId", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const userId = req.session.userId;

  try {
    // 💡 보안: 현재 사용자가 해당 워크스페이스의 멤버인지 먼저 확인
    const memberCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ success: false, message: "접근 권한이 없습니다." });
    }

    const projects = await pool.query(
      "SELECT * FROM project WHERE workspace_id = $1 ORDER BY sort_order ASC",
      [workspaceId],
    );

    res.json({ success: true, data: projects.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/workspace/:workspaceId/member
 * @desc    이메일로 워크스페이스 멤버 초대
 */
router.post("/:workspaceId/member", isAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role_name = "MEMBER" } = req.body;
  const inviterId = req.session.userId;

  try {
    // 1. 초대 권한 확인 (초대자가 해당 워크스페이스의 OWNER나 ADMIN인지)
    const adminCheck = await pool.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, inviterId],
    );

    if (
      !adminCheck.rows[0] ||
      !["OWNER", "ADMIN"].includes(adminCheck.rows[0].role_name)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "멤버 초대 권한이 없습니다." });
    }

    // 2. 초대할 사용자가 존재하는지 확인
    const userRes = await pool.query("SELECT id FROM member WHERE email = $1", [
      email,
    ]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "해당 이메일을 가진 사용자가 없습니다.",
      });
    }
    const targetUserId = userRes.rows[0].id;

    // 3. 이미 멤버인지 확인
    const duplicateCheck = await pool.query(
      "SELECT id FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspaceId, targetUserId],
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "이미 워크스페이스에 참여 중인 멤버입니다.",
      });
    }

    // 4. 멤버 추가
    await pool.query(
      "INSERT INTO workspace_member (workspace_id, member_id, role_name) VALUES ($1, $2, $3)",
      [workspaceId, targetUserId, role_name],
    );

    res.json({ success: true, message: "멤버가 성공적으로 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/workspace/:workspaceId/members
 * @desc    워크스페이스 소속 멤버 목록 조회
 */
router.get("/:workspaceId/members", isAuth, async (req, res) => {
  try {
    const query = `
            SELECT m.id, m.name, m.email, wm.role_name 
            FROM workspace_member wm
            JOIN member m ON wm.member_id = m.id
            WHERE wm.workspace_id = $1
            ORDER BY m.name ASC;
        `;
    const result = await pool.query(query, [req.params.workspaceId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
