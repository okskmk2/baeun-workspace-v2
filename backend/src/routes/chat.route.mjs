import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { broadcastToRoom } from "../ws.mjs";
import logger from "../logger.mjs";
import { createNotifications, NOTIFICATION_TYPES } from "../notification.mjs";

const router = express.Router();
const FEEDBACK_KEYS = ["done", "like", "checking", "thanks"];
const CHANNEL_TYPES = ["GENERAL", "ISSUE", "DM", "AGENT", "NOTICE"];
const NOTICE_SCOPES = ["PROJECT", "WORKSPACE"];
const NOTICE_WRITER_ROLES = ["OWNER", "ADMIN"];

const isNoticeWriterRole = (roleName) =>
  NOTICE_WRITER_ROLES.includes(String(roleName || "").toUpperCase());

const resolveNoticeMemberRole = async (channel, userId) => {
  const scope = String(channel?.scope || "").toUpperCase();
  const hasWorkspaceId = Boolean(channel?.workspace_id);
  const hasProjectId = Boolean(channel?.project_id);
  const shouldUseWorkspaceRole = scope === "WORKSPACE" || (hasWorkspaceId && !hasProjectId);

  if (shouldUseWorkspaceRole) {
    const wsRoleRes = await pool.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [channel.workspace_id, userId]
    );
    return String(wsRoleRes.rows[0]?.role_name || "").toUpperCase();
  }

  if (!NOTICE_SCOPES.includes(scope) && !hasProjectId) {
    return "";
  }

  const projectRoleRes = await pool.query(
    "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
    [channel.project_id, userId]
  );
  return String(projectRoleRes.rows[0]?.role_name || "").toUpperCase();
};

const createDmPairKey = (memberIdA, memberIdB) => {
  const first = Number(memberIdA);
  const second = Number(memberIdB);
  const [left, right] = first < second ? [first, second] : [second, first];
  return `${left}:${right}`;
};

const buildFeedbackCountsMap = (rows) => {
  const countsByMessage = {};
  rows.forEach((row) => {
    const messageId = String(row.message_id);
    if (!countsByMessage[messageId]) {
      countsByMessage[messageId] = {};
    }
    countsByMessage[messageId][row.feedback_key] = Number(row.count);
  });
  return countsByMessage;
};

const buildFeedbackMineMap = (rows) => {
  const mineByMessage = {};
  rows.forEach((row) => {
    const messageId = String(row.message_id);
    if (!mineByMessage[messageId]) {
      mineByMessage[messageId] = [];
    }
    mineByMessage[messageId].push(row.feedback_key);
  });
  return mineByMessage;
};

const ensureFeedbackId = async (feedbackKey) => {
  const existing = await pool.query("SELECT id FROM feedback WHERE name = $1", [feedbackKey]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const insertRes = await pool.query(
    "INSERT INTO feedback (name) VALUES ($1) RETURNING id",
    [feedbackKey]
  );
  return insertRes.rows[0].id;
};

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
    return res.status(400).json({ name: "BadRequest", message: "project_id is required" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const recentRes = await pool.query(
      `SELECT 
        c.id as message_id,
        c.content,
        c.created_at,
        c.created_by,
        m.name as creator_name,
        cr.id as channel_id,
        cr.name as channel_name,
        c.type as type
      FROM message c
      JOIN channel cr ON c.channel_id = cr.id
      JOIN channel_member cm ON cm.channel_id = cr.id AND cm.member_id = $2
      LEFT JOIN member m ON c.created_by = m.id
      WHERE cr.project_id = $1
        AND cr.status = 'ACTIVE'
        AND c.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY c.created_at DESC`,
      [projectId, userId]
    );

    res.json(recentRes.rows);
  } catch (error) {
    logger.error("recent chat messages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/archived", isAuth, async (req, res) => {
  const projectId = req.query.project_id;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "project_id is required" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const archivedRes = await pool.query(
      `SELECT
        c.id,
        c.name,
        t.id as task_id,
        t.title as task_title,
        t.kanban_id as kanban_id,
        MAX(m.created_at) as last_message_at,
        COUNT(m.id)::int as total_message_count
      FROM channel c
      JOIN channel_member cm ON cm.channel_id = c.id AND cm.member_id = $2
      LEFT JOIN task t ON t.id = c.task_id
      LEFT JOIN message m ON m.channel_id = c.id
      WHERE c.project_id = $1
        AND c.status = 'ARCHIVED'
      GROUP BY c.id, c.name, t.id, t.title, t.kanban_id
      ORDER BY MAX(m.created_at) DESC NULLS LAST, c.created_at DESC`,
      [projectId, userId]
    );

    res.json(archivedRes.rows);
  } catch (error) {
    logger.error("archived channel list error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
  const { name, project_id, type, agent_key: agentKey } = req.body;
  const userId = req.session.userId;
  const channelType = String(type || "GENERAL").toUpperCase();

  if (!CHANNEL_TYPES.includes(channelType)) {
    return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 channel type 입니다." });
  }

  if (channelType === "DM") {
    return res.status(400).json({
      name: "BadRequest",
      message: "DM 채널은 /channels/dm 엔드포인트를 사용하세요.",
    });
  }

  if (channelType === "NOTICE") {
    return res.status(400).json({
      name: "BadRequest",
      message: "NOTICE 채널은 시스템에서 자동 생성됩니다.",
    });
  }

  if (channelType === "AGENT" && !agentKey) {
    return res.status(400).json({
      name: "BadRequest",
      message: "agent_key is required for AGENT channel",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertChannel = `
      INSERT INTO channel (name, project_id, type, agent_key)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const chatRes = await client.query(insertChannel, [
      name || null,
      project_id || null,
      channelType,
      channelType === "AGENT" ? agentKey : null,
    ]);
    const newRoom = chatRes.rows[0];

    const insertMember = `
      INSERT INTO channel_member (channel_id, member_id, role_name)
      VALUES ($1, $2, 'OWNER')
      RETURNING *;
    `;
    await client.query(insertMember, [newRoom.id, userId]);

    await client.query("COMMIT");
    res.status(201).json({ id: newRoom.id });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("channel create error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

router.post("/dm", isAuth, async (req, res) => {
  const { project_id: projectId, target_member_id: targetMemberId } = req.body;
  const userId = req.session.userId;

  if (!projectId || !targetMemberId) {
    return res.status(400).json({
      name: "BadRequest",
      message: "project_id and target_member_id are required",
    });
  }

  if (String(userId) === String(targetMemberId)) {
    return res.status(400).json({ name: "BadRequest", message: "본인과 DM을 생성할 수 없습니다." });
  }

  const dmPairKey = createDmPairKey(userId, targetMemberId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const myProjectMemberRes = await client.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (myProjectMemberRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const targetProjectMemberRes = await client.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, targetMemberId]
    );
    if (targetProjectMemberRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ name: "BadRequest", message: "대상이 프로젝트 멤버가 아닙니다." });
    }

    let channel;
    const existingRes = await client.query(
      "SELECT * FROM channel WHERE project_id = $1 AND type = 'DM' AND dm_pair_key = $2",
      [projectId, dmPairKey]
    );

    if (existingRes.rows.length > 0) {
      channel = existingRes.rows[0];
    } else {
      try {
        const createRes = await client.query(
          `INSERT INTO channel (name, project_id, type, dm_pair_key, status)
           VALUES ($1, $2, 'DM', $3, 'ACTIVE')
           RETURNING *`,
          [null, projectId, dmPairKey]
        );
        channel = createRes.rows[0];
      } catch (error) {
        if (error?.code !== "23505") {
          throw error;
        }

        const conflictRes = await client.query(
          "SELECT * FROM channel WHERE project_id = $1 AND type = 'DM' AND dm_pair_key = $2",
          [projectId, dmPairKey]
        );
        channel = conflictRes.rows[0];
      }
    }

    await client.query(
      `INSERT INTO channel_member (channel_id, member_id, role_name)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (channel_id, member_id) DO NOTHING`,
      [channel.id, userId]
    );

    await client.query(
      `INSERT INTO channel_member (channel_id, member_id, role_name)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (channel_id, member_id) DO NOTHING`,
      [channel.id, targetMemberId]
    );

    await client.query("COMMIT");
    res.status(201).json({ id: channel.id, type: channel.type });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("dm create error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
    return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 채널 ID입니다." });
  }

  try {
    const chatRes = await pool.query(
      `SELECT c.*, t.title as task_title, t.kanban_id as kanban_id, t.id as task_id
       FROM channel c
       LEFT JOIN task t ON t.id = c.task_id
       WHERE c.id = $1`,
      [channelId]
    );

    if (chatRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const channel = chatRes.rows[0];
    const channelType = String(channel.type || "").toUpperCase();

    if (channelType === "NOTICE") {
      const noticeRole = await resolveNoticeMemberRole(channel, userId);
      if (!noticeRole) {
        return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
      }
      return res.json({
        ...channel,
        viewer_role_name: noticeRole,
        can_post_message: isNoticeWriterRole(noticeRole),
      });
    }

    const memberCheck = await pool.query(
      "SELECT role_name FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const roleName = String(memberCheck.rows[0]?.role_name || "").toUpperCase();
    res.json({
      ...channel,
      viewer_role_name: roleName,
      can_post_message: true,
    });
  } catch (error) {
    logger.error("channel detail error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}:
 *   patch:
 *     summary: 채널 수정
 *     description: 채널 이름 변경 (OWNER 전용)
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
 *               name:
 *                 type: string
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: 채널 수정 성공
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
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:channelId", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const { name } = req.body;
  const userId = req.session.userId;

  if (!name) {
    return res.status(400).json({ name: "BadRequest", message: "채널 이름은 필수입니다." });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ name: "Forbidden", message: "채널 수정 권한이 없습니다." });
    }

    const updateRes = await pool.query(
      "UPDATE channel SET name = $1 WHERE id = $2 RETURNING *",
      [name, channelId]
    );

    res.json(updateRes.rows[0]);
  } catch (error) {
    logger.error("channel update error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
  const parsedLimit = Number.parseInt(String(req.query.limit || ""), 10);
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 30;

  const rawBeforeId = req.query.before_id;
  const hasBeforeId = rawBeforeId !== undefined && rawBeforeId !== null && String(rawBeforeId).trim() !== "";
  const beforeMessageId = hasBeforeId ? Number.parseInt(String(rawBeforeId), 10) : null;

  if (hasBeforeId && (!Number.isInteger(beforeMessageId) || beforeMessageId <= 0)) {
    return res.status(400).json({ name: "BadRequest", message: "before_id must be a positive integer." });
  }

  try {
    const channelRes = await pool.query(
      "SELECT id, type, scope, project_id, workspace_id FROM channel WHERE id = $1",
      [channelId]
    );
    if (channelRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const channel = channelRes.rows[0];
    const channelType = String(channel.type || "").toUpperCase();

    if (channelType === "NOTICE") {
      const noticeRole = await resolveNoticeMemberRole(channel, userId);
      if (!noticeRole) {
        return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
      }
    } else {
      const memberCheck = await pool.query(
        "SELECT * FROM channel_member WHERE channel_id = $1 AND member_id = $2",
        [channelId, userId]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
      }
    }

    if (beforeMessageId) {
      const anchorRes = await pool.query(
        "SELECT id FROM message WHERE id = $1 AND channel_id = $2",
        [beforeMessageId, channelId]
      );
      if (anchorRes.rows.length === 0) {
        return res.status(400).json({
          name: "BadRequest",
          message: "before_id is invalid for this channel.",
        });
      }
    }

    const msgsRes = await pool.query(
      `WITH anchor AS (
         SELECT id, created_at
         FROM message
         WHERE id = $2 AND channel_id = $1
       ),
       paged AS (
         SELECT 
           c.id, c.content, c.created_at, c.created_by,
           m.name as creator_name, m.img_url as creator_img,
           c.type as type
         FROM message c
         LEFT JOIN member m ON c.created_by = m.id
         WHERE c.channel_id = $1
           AND (
             $2::int IS NULL
             OR (c.created_at, c.id) < (SELECT created_at, id FROM anchor)
           )
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT $3
       )
       SELECT *
       FROM paged
       ORDER BY created_at ASC, id ASC`,
      [channelId, beforeMessageId, limit]
    );

    const messageIds = msgsRes.rows
      .map((row) => Number.parseInt(String(row.id), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (messageIds.length === 0) {
      return res.json([]);
    }

    const feedbackRes = await pool.query(
      `SELECT
        mf.message_id,
        f.name as feedback_key,
        COUNT(*)::int as count
      FROM message_feedback mf
      JOIN feedback f ON mf.feedback_id = f.id
      WHERE mf.message_id = ANY($1::int[])
      GROUP BY mf.message_id, f.name`,
      [messageIds]
    );
    const mineRes = await pool.query(
      `SELECT
        mf.message_id,
        f.name as feedback_key
      FROM message_feedback mf
      JOIN feedback f ON mf.feedback_id = f.id
      WHERE mf.message_id = ANY($1::int[])
        AND mf.created_by = $2`,
      [messageIds, userId]
    );

    const countsByMessage = buildFeedbackCountsMap(feedbackRes.rows);
    const mineByMessage = buildFeedbackMineMap(mineRes.rows);
    const data = msgsRes.rows.map((message) => ({
      ...message,
      feedback_counts: countsByMessage[String(message.id)] || {},
      feedback_mine: mineByMessage[String(message.id)] || [],
    }));

    res.json(data);
  } catch (error) {
    logger.error("channel messages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/messages/{messageId}/feedback:
 *   post:
 *     summary: 메시지 피드백 토글
 *     description: 메시지에 피드백(리액션)을 등록하거나 이미 등록된 경우 취소합니다.
 *     tags:
 *       - Channel
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: messageId
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
 *               feedback_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: 피드백 등록 성공
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/:channelId/messages/:messageId/feedback", isAuth, async (req, res) => {
  const { channelId, messageId } = req.params;
  const feedbackKey = String(req.body?.feedback_key || "")
    .trim()
    .toLowerCase();
  const userId = req.session.userId;

  if (!FEEDBACK_KEYS.includes(feedbackKey)) {
    return res.status(400).json({ name: "BadRequest", message: "invalid feedback_key" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const messageCheck = await pool.query(
      "SELECT id FROM message WHERE id = $1 AND channel_id = $2",
      [messageId, channelId]
    );
    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "메시지를 찾을 수 없습니다." });
    }

    const feedbackId = await ensureFeedbackId(feedbackKey);

    const existingRes = await pool.query(
      "SELECT id FROM message_feedback WHERE message_id = $1 AND feedback_id = $2 AND created_by = $3",
      [messageId, feedbackId, userId]
    );

    if (existingRes.rows.length > 0) {
      await pool.query(
        "DELETE FROM message_feedback WHERE id = $1",
        [existingRes.rows[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO message_feedback (message_id, feedback_id, created_by) VALUES ($1, $2, $3)",
        [messageId, feedbackId, userId]
      );
    }

    const countsRes = await pool.query(
      `SELECT
        mf.message_id,
        f.name as feedback_key,
        COUNT(*)::int as count
      FROM message_feedback mf
      JOIN feedback f ON mf.feedback_id = f.id
      WHERE mf.message_id = $1
      GROUP BY mf.message_id, f.name`,
      [messageId]
    );

    const feedbackCounts = buildFeedbackCountsMap(countsRes.rows)[String(messageId)] || {};
    const mineRes = await pool.query(
      `SELECT
        mf.message_id,
        f.name as feedback_key
      FROM message_feedback mf
      JOIN feedback f ON mf.feedback_id = f.id
      WHERE mf.message_id = $1
        AND mf.created_by = $2`,
      [messageId, userId]
    );
    const feedbackMine = buildFeedbackMineMap(mineRes.rows)[String(messageId)] || [];

    broadcastToRoom(channelId, {
      type: "feedback",
      data: {
        message_id: Number(messageId),
        feedback_counts: feedbackCounts,
      },
    });

    res.json({
      message_id: Number(messageId),
      feedback_counts: feedbackCounts,
      feedback_mine: feedbackMine,
    });
  } catch (error) {
    logger.error("message feedback error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
    const channelRes = await pool.query(
      "SELECT id, type, scope, project_id, workspace_id FROM channel WHERE id = $1",
      [channelId]
    );
    if (channelRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const channel = channelRes.rows[0];
    const channelType = String(channel.type || "").toUpperCase();

    if (channelType === "NOTICE") {
      const noticeRole = await resolveNoticeMemberRole(channel, userId);
      if (!noticeRole) {
        return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
      }

      if (String(channel.scope || "").toUpperCase() === "WORKSPACE") {
        const wsMembersRes = await pool.query(
          `SELECT
            m.id,
            m.name,
            m.email,
            m.img_url,
            wm.role_name
          FROM workspace_member wm
          JOIN member m ON wm.member_id = m.id
          WHERE wm.workspace_id = $1
          ORDER BY wm.role_name DESC, m.name ASC`,
          [channel.workspace_id]
        );
        return res.json(wsMembersRes.rows);
      }

      const projectMembersRes = await pool.query(
        `SELECT
          m.id,
          m.name,
          m.email,
          m.img_url,
          pm.role_name
        FROM project_member pm
        JOIN member m ON pm.member_id = m.id
        WHERE pm.project_id = $1
        ORDER BY pm.role_name DESC, m.name ASC`,
        [channel.project_id]
      );
      return res.json(projectMembersRes.rows);
    }

    const memberCheck = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
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

    res.json(membersRes.rows);
  } catch (error) {
    logger.error("channel members error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
    return res.status(400).json({ name: "BadRequest", message: "member_id is required" });
  }

  try {
    const chatRes = await pool.query(
      "SELECT id, project_id FROM channel WHERE id = $1",
      [channelId]
    );
    if (chatRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const projectId = chatRes.rows[0].project_id;

    const memberCheck = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const projectMemberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, member_id]
    );
    if (projectMemberCheck.rows.length === 0) {
      return res.status(400).json({ name: "BadRequest", message: "프로젝트 멤버가 아닙니다." });
    }

    const alreadyMember = await pool.query(
      "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, member_id]
    );
    if (alreadyMember.rows.length > 0) {
      return res.status(200).json({ message: "이미 참여 중입니다." });
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
      "INSERT INTO message (channel_id, content, created_by, type) VALUES ($1, $2, $3, 'SYSTEM') RETURNING id, content, created_at, created_by, type",
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
        type: newMessage.type || "SYSTEM",
      },
    };
    broadcastToRoom(channelId, broadcastPayload);

    await createNotifications({
      recipientIds: [member_id],
      actorId: userId,
      type: NOTIFICATION_TYPES.CHANNEL_INVITED_ME,
      resourceType: "channel",
      resourceId: Number(channelId),
      projectId,
      title: "채널에 초대되었습니다.",
      body: `${inviterName}님이 채널에 초대했습니다.`,
      payload: {
        channel_id: Number(channelId),
        invited_member_id: Number(member_id),
      },
    });

    res.status(201).json({
      message: "초대되었습니다.",
      channel_member_id: channelMemberId,
      message_id: newMessage.id,
    });
  } catch (error) {
    logger.error("channel invite error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: 채널 목록
 *     description: 프로젝트 내 채널 중 내가 속한 채널 목록 조회
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
  const archivedParam = String(req.query.archived || "").toLowerCase();
  const archivedOnly = archivedParam === "1" || archivedParam === "true";
  const typeParam = String(req.query.type || "").trim();
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "project_id is required" });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const projectRes = await pool.query("SELECT workspace_id FROM project WHERE id = $1", [projectId]);
    if (projectRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
    }

    const workspaceId = projectRes.rows[0].workspace_id;
    const status = archivedOnly ? "ARCHIVED" : "ACTIVE";
    const requestedTypes = typeParam
      ? typeParam
          .split(",")
          .map((value) => String(value || "").trim().toUpperCase())
          .filter(Boolean)
      : CHANNEL_TYPES;

    const invalidType = requestedTypes.find((value) => !CHANNEL_TYPES.includes(value));
    if (invalidType) {
      return res.status(400).json({
        name: "BadRequest",
        message: `유효하지 않은 channel type 입니다: ${invalidType}`,
      });
    }

    const roomsRes = await pool.query(
      `
        SELECT c.*
        FROM channel c
        LEFT JOIN channel_member cm ON cm.channel_id = c.id AND cm.member_id = $2
        WHERE (
            (c.scope = 'PROJECT' AND c.project_id = $1)
            OR (c.scope = 'WORKSPACE' AND c.workspace_id = $5)
          )
          AND c.status = $3
          AND c.type = ANY($4::text[])
          AND (c.type = 'NOTICE' OR cm.member_id IS NOT NULL)
        ORDER BY
          CASE
            WHEN c.type = 'NOTICE' AND c.scope = 'WORKSPACE' THEN 0
            WHEN c.type = 'NOTICE' AND c.scope = 'PROJECT' THEN 1
            ELSE 2
          END,
          c.sort_order ASC,
          c.created_at ASC
      `,
      [projectId, userId, status, requestedTypes, workspaceId]
    );

    res.json(roomsRes.rows);
  } catch (error) {
    logger.error("channel list error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/:channelId/status", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const { status } = req.body;
  const userId = req.session.userId;

  const nextStatus = String(status || "").toUpperCase();
  if (!["ACTIVE", "ARCHIVED"].includes(nextStatus)) {
    return res.status(400).json({ name: "BadRequest", message: "유효하지 않은 상태입니다." });
  }

  try {
    const channelRes = await pool.query(
      "SELECT id, type, scope, project_id, workspace_id FROM channel WHERE id = $1",
      [channelId]
    );
    if (channelRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const channel = channelRes.rows[0];
    const channelType = String(channel.type || "").toUpperCase();

    if (channelType === "NOTICE") {
      const noticeRole = await resolveNoticeMemberRole(channel, userId);
      if (!isNoticeWriterRole(noticeRole)) {
        return res.status(403).json({ name: "Forbidden", message: "상태 변경 권한이 없습니다." });
      }
    } else {
      const authCheck = await pool.query(
        "SELECT role_name FROM channel_member WHERE channel_id = $1 AND member_id = $2",
        [channelId, userId]
      );

      const roleName = String(authCheck.rows[0]?.role_name || "").toUpperCase();
      if (!["OWNER", "ADMIN"].includes(roleName)) {
        return res.status(403).json({ name: "Forbidden", message: "상태 변경 권한이 없습니다." });
      }
    }

    const updateRes = await pool.query(
      "UPDATE channel SET status = $1 WHERE id = $2 RETURNING *",
      [nextStatus, channelId]
    );

    res.json(updateRes.rows[0]);
  } catch (error) {
    logger.error("channel status update error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/channels/{channelId}/leave:
 *   post:
 *     summary: 채널 나가기
 *     description: 현재 사용자를 채널 참여자 목록에서 제거
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
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/:channelId/leave", isAuth, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.session.userId;

  try {
    const memberRes = await pool.query(
      `SELECT cm.role_name, c.type
       FROM channel_member cm
       JOIN channel c ON c.id = cm.channel_id
       WHERE cm.channel_id = $1 AND cm.member_id = $2`,
      [channelId, userId]
    );

    if (memberRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "채널 참여자를 찾을 수 없습니다." });
    }

    const roleName = String(memberRes.rows[0].role_name || "").toUpperCase();
    const channelType = String(memberRes.rows[0].type || "").toUpperCase();
    if (channelType === "DM") {
      return res.status(400).json({
        name: "BadRequest",
        message: "DM 채널은 나갈 수 없습니다.",
      });
    }

    if (roleName === "OWNER") {
      return res.status(400).json({
        name: "BadRequest",
        message: "OWNER는 방을 나갈 수 없습니다. 필요 시 채널을 삭제하거나 소유권을 이전하세요.",
      });
    }

    await pool.query(
      "DELETE FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );

    res.json({ message: "채널에서 나갔습니다." });
  } catch (error) {
    logger.error("channel leave error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const channelRes = await client.query("SELECT type FROM channel WHERE id = $1 FOR UPDATE", [
      channelId,
    ]);
    if (channelRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "채널을 찾을 수 없습니다." });
    }

    const channelType = String(channelRes.rows[0].type || "").toUpperCase();
    if (channelType === "NOTICE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        name: "BadRequest",
        message: "공지 채널은 삭제할 수 없습니다.",
      });
    }

    const authCheck = await client.query(
      "SELECT role_name FROM channel_member WHERE channel_id = $1 AND member_id = $2",
      [channelId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      await client.query("ROLLBACK");
      return res.status(403).json({ name: "Forbidden", message: "채널 삭제 권한이 없습니다." });
    }

    await client.query("DELETE FROM channel WHERE id = $1", [channelId]);
    await client.query("COMMIT");

    res.json({ message: "채널이 삭제되었습니다." });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("channel delete error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

export default router;
