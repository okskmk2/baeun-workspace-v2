import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { broadcastToRoom } from "../ws.mjs";
import logger from "../logger.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/channels/recent:
 *   get:
 *     summary: 최근 메시지 조회
 *     description: 프로젝트 내 최근 24시간 메시지 목록 조회
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 최근 메시지 조회 성공
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
 *                     $ref: "#/components/schemas/ChatRecentMessage"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
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
        cr.id as channel_id,
        cr.name as channel_name
      FROM message c
      JOIN channel cr ON c.channel_id = cr.id
      LEFT JOIN member m ON c.created_by = m.id
      WHERE cr.project_id = $1
        AND c.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY c.created_at DESC`,
      [projectId]
    );

    res.json({ success: true, data: recentRes.rows });
  } catch (error) {
    logger.error("recent chat messages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels:
 *   post:
 *     summary: 채널 생성
 *     description: 새 채널을 생성하고 생성자를 OWNER로 등록
 *     tags:
 *       - Channel
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
 *     responses:
 *       201:
 *         description: 채널 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/CreatedId"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/", isAuth, async (req, res) => {
  const { name, project_id, type } = req.body;
  const userId = req.session.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertChannel = `
      INSERT INTO channel (name, project_id, type)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const chatRes = await client.query(insertChannel, [
      name || null,
      project_id || null,
      type || null,
    ]);
    const newRoom = chatRes.rows[0];

    const insertMember = `
      INSERT INTO channel_member (channel_id, member_id, role_name)
      VALUES ($1, $2, 'OWNER')
      RETURNING *;
    `;
    await client.query(insertMember, [newRoom.id, userId]);

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: { id: newRoom.id } });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("channel create error", {
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
 * /api/channels/{channelId}:
 *   get:
 *     summary: 채널 상세 조회
 *     description: 채널 상세 정보 조회
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 채널 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Channel"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:channelId", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.session.userId;

  // 추가 보안: channelId가 숫자인지 확인 (필요한 경우)
  if (isNaN(parseInt(channelId))) {
    return res.status(400).json({ success: false, message: "유효하지 않은 채널 ID입니다." });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT * FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const chatRes = await pool.query("SELECT * FROM channel WHERE id = $1", [channelId]);

    if (chatRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "채널을 찾을 수 없습니다." });
    }

    res.json({ success: true, data: chatRes.rows[0] });
  } catch (error) {
    logger.error("channel detail error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/messages:
 *   get:
 *     summary: 채팅 메시지 목록
 *     description: 채널 메시지 전체 조회
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 메시지 조회 성공
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
 *                     $ref: "#/components/schemas/ChatMessage"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:channelId/messages", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT * FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const msgsRes = await pool.query(
      `SELECT 
        c.id, c.content, c.created_at, c.created_by,
        m.name as creator_name, m.img_url as creator_img,
        CASE
          WHEN c.content LIKE '%님이 %님을 초대했습니다.%' THEN 'SYSTEM'
          ELSE NULL
        END as message_type
      FROM message c
      LEFT JOIN member m ON c.created_by = m.id
      WHERE c.channel_id = $1
      ORDER BY c.created_at ASC`,
      [channelId]
    );

    res.json({ success: true, data: msgsRes.rows });
  } catch (error) {
    logger.error("channel messages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/members:
 *   get:
 *     summary: 채널 멤버 목록
 *     description: 채널 참여자 목록 조회
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 멤버 목록 조회 성공
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
 *                     $ref: "#/components/schemas/ChannelMember"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:channelId/members", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const membersRes = await pool.query(
      `SELECT
        m.id,
        m.name,
        m.email,
        m.img_url,
        cm.role_name
      FROM channel_member cm
      JOIN member m ON cm.member_id = m.id
      WHERE cm.channel_id = $1
      ORDER BY cm.role_name DESC, m.name ASC`,
      [channelId]
    );

    res.json({ success: true, data: membersRes.rows });
  } catch (error) {
    logger.error("channel members error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/invite:
 *   post:
 *     summary: 채널 초대
 *     description: 프로젝트 멤버를 채널에 초대
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
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
 *             required:
 *               - member_id
 *     responses:
 *       201:
 *         description: 초대 성공
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
 *                   $ref: "#/components/schemas/ChatInviteCreatedIds"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/:channelId/invite", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const { member_id } = req.body;
  const userId = req.session.userId;

  if (!member_id) {
    return res.status(400).json({ success: false, message: "member_id is required" });
  }

  try {
    const chatRes = await pool.query(
      "SELECT id, project_id FROM channel WHERE id = $1",
      [channelId]
    );
    if (chatRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "채널을 찾을 수 없습니다." });
    }

    const projectId = chatRes.rows[0].project_id;

    const memberCheck = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
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

    const alreadyMember = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, member_id]
    );
    if (alreadyMember.rows.length > 0) {
      return res.status(200).json({ success: true, message: "이미 참여 중입니다." });
    }

    const memberInsertRes = await pool.query(
      "INSERT INTO channel_member (channel_id, member_id, role_name) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING RETURNING id",
      [channelId, member_id]
    );
    const channelMemberId = memberInsertRes.rows[0]?.id;

    const inviterRes = await pool.query("SELECT name FROM member WHERE id = $1", [userId]);
    const inviteeRes = await pool.query("SELECT name FROM member WHERE id = $1", [member_id]);
    const inviterName = inviterRes.rows[0]?.name || "알수없음";
    const inviteeName = inviteeRes.rows[0]?.name || "알수없음";
    const systemContent = `${inviterName}님이 ${inviteeName}님을 초대했습니다.`;

    const chatInsertRes = await pool.query(
      "INSERT INTO message (channel_id, content, created_by) VALUES ($1, $2, $3) RETURNING id, content, created_at, created_by",
      [channelId, systemContent, userId]
    );
    const newMessage = chatInsertRes.rows[0];

    const broadcastPayload = {
      type: "message",
      data: {
        id: newMessage.id,
        content: newMessage.content,
        created_at: newMessage.created_at,
        created_by: newMessage.created_by,
        creator_name: inviterName,
        channel_id: channelId,
        message_type: "SYSTEM",
      },
    };
    broadcastToRoom(channelId, broadcastPayload);

    res.status(201).json({
      success: true,
      message: "초대되었습니다.",
      data: {
        channel_member_id: channelMemberId,
        message_id: newMessage.id,
      },
    });
  } catch (error) {
    logger.error("channel invite error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: 채널 목록
 *     description: 프로젝트 내 채널 목록 조회
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 채널 목록 조회 성공
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
 *                     $ref: "#/components/schemas/Channel"
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
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
      "SELECT * FROM channel WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [projectId]
    );

    res.json({ success: true, data: roomsRes.rows });
  } catch (error) {
    logger.error("channel list error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}:
 *   delete:
 *     summary: 채널 삭제
 *     description: OWNER 권한으로 채널 삭제
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
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
router.delete("/:channelId", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.session.userId;

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "채널 삭제 권한이 없습니다." });
    }

    await pool.query("DELETE FROM channel WHERE id = $1", [channelId]);

    res.json({ success: true, message: "채널이 삭제되었습니다." });
  } catch (error) {
    logger.error("channel delete error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
