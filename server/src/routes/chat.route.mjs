import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * GET /api/chatroom/recent
 * Get recent messages in project chatrooms (last 24 hours)
 */
router.get("/recent", isAuth, async (req, res) => {
  const projectId = req.query.project_id;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ success: false, message: "project_id is required" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const recentRes = await pool.query(
      `SELECT 
        c.id as message_id,
        c.content,
        c.created_at,
        c.created_by,
        m.name as creator_name,
        cr.id as chatroom_id,
        cr.name as chatroom_name
      FROM chat c
      JOIN chatroom cr ON c.chatroom_id = cr.id
      LEFT JOIN member m ON c.created_by = m.id
      WHERE cr.project_id = $1
        AND c.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY c.created_at DESC`,
      [projectId]
    );

    res.json({ success: true, data: recentRes.rows });
  } catch (error) {
    console.error("recent chat messages error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/chatroom
 * Create a new chatroom and add the creator as OWNER in chatroom_member
 */
router.post("/", isAuth, async (req, res) => {
  const { name, project_id, type } = req.body;
  const userId = req.session.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertChatroom = `
      INSERT INTO chatroom (name, project_id, type)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const chatRes = await client.query(insertChatroom, [
      name || null,
      project_id || null,
      type || null,
    ]);
    const newRoom = chatRes.rows[0];

    const insertMember = `
      INSERT INTO chatroom_member (chatroom_id, member_id, role_name)
      VALUES ($1, $2, 'OWNER')
      RETURNING *;
    `;
    await client.query(insertMember, [newRoom.id, userId]);

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: newRoom });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("chatroom create error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/chatroom/:chatroomId
 * Get chatroom details
 */
router.get("/:chatroomId", isAuth, async (req, res) => {
  const { chatroomId } = req.params;
  const userId = req.session.userId;

  // 추가 보안: chatroomId가 숫자인지 확인 (필요한 경우)
  if (isNaN(parseInt(chatroomId))) {
    return res.status(400).json({ success: false, message: "유효하지 않은 대화방 ID입니다." });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT * FROM chatroom_member WHERE chatroom_id = $1 AND member_id = $2",
      [chatroomId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const chatRes = await pool.query("SELECT * FROM chatroom WHERE id = $1", [chatroomId]);

    if (chatRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "대화방을 찾을 수 없습니다." });
    }

    res.json({ success: true, data: chatRes.rows[0] });
  } catch (error) {
    console.error("chatroom detail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/chatroom/:chatroomId/messages
 * Get all messages in a chatroom
 */
router.get("/:chatroomId/messages", isAuth, async (req, res) => {
  const { chatroomId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT * FROM chatroom_member WHERE chatroom_id = $1 AND member_id = $2",
      [chatroomId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const msgsRes = await pool.query(
      `SELECT 
        c.id, c.content, c.created_at, c.created_by,
        m.name as creator_name, m.img_url as creator_img
      FROM chat c
      LEFT JOIN member m ON c.created_by = m.id
      WHERE c.chatroom_id = $1
      ORDER BY c.created_at ASC`,
      [chatroomId]
    );

    res.json({ success: true, data: msgsRes.rows });
  } catch (error) {
    console.error("chatroom messages error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/chatroom/:chatroomId/invite
 * Invite a project member to a chatroom
 */
router.post("/:chatroomId/invite", isAuth, async (req, res) => {
  const { chatroomId } = req.params;
  const { member_id } = req.body;
  const userId = req.session.userId;

  if (!member_id) {
    return res.status(400).json({ success: false, message: "member_id is required" });
  }

  try {
    const chatRes = await pool.query(
      "SELECT id, project_id FROM chatroom WHERE id = $1",
      [chatroomId]
    );
    if (chatRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "대화방을 찾을 수 없습니다." });
    }

    const projectId = chatRes.rows[0].project_id;

    const memberCheck = await pool.query(
      "SELECT id FROM chatroom_member WHERE chatroom_id = $1 AND member_id = $2",
      [chatroomId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const projectMemberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, member_id]
    );
    if (projectMemberCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: "프로젝트 멤버가 아닙니다." });
    }

    await pool.query(
      "INSERT INTO chatroom_member (chatroom_id, member_id, role_name) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING",
      [chatroomId, member_id]
    );

    res.status(201).json({ success: true, message: "초대되었습니다." });
  } catch (error) {
    console.error("chatroom invite error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", isAuth, async (req, res) => {
  const projectId = req.query.project_id;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ success: false, message: "project_id is required" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const roomsRes = await pool.query(
      "SELECT * FROM chatroom WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [projectId]
    );

    res.json({ success: true, data: roomsRes.rows });
  } catch (error) {
    console.error("chatroom list error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
