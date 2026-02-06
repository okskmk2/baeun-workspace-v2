import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

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
    const chatRes = await client.query(insertChatroom, [name || null, project_id || null, type || null]);
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

  try {
    // Verify user is a member of the chatroom
    const memberCheck = await pool.query(
      "SELECT * FROM chatroom_member WHERE chatroom_id = $1 AND member_id = $2",
      [chatroomId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const chatRes = await pool.query(
      "SELECT * FROM chatroom WHERE id = $1",
      [chatroomId]
    );

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
    // Verify user is a member of the chatroom
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

export default router;
router.get("/", isAuth, async (req, res) => {
  const projectId = req.query.project_id;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ success: false, message: "project_id is required" });
  }

  try {
    // verify project membership
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
