import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { createNotifications, NOTIFICATION_TYPES } from "../notification.mjs";
import { broadcastToUsers } from "../ws.mjs";

const router = express.Router();

const ensureProjectExists = async (projectId, res) => {
  const projectRes = await pool.query("SELECT id FROM project WHERE id = $1", [projectId]);
  if (projectRes.rows.length === 0) {
    res.status(404).json({ name: "NotFound", message: "프로젝트를 찾을 수 없습니다." });
    return false;
  }
  return true;
};

const normalizeTaskRealtimePayload = (task) => {
  if (!task) return null;
  return {
    id: task.id,
    title: task.title,
    content: task.content,
    status: task.status,
    priority: task.priority,
    kanban_id: task.kanban_id,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
};

const broadcastTaskEventToProjectMembers = async (
  db,
  {
    projectId,
    event,
    task = null,
    taskId = null,
  }
) => {
  if (!projectId || !event) return;

  const memberRes = await db.query("SELECT member_id FROM project_member WHERE project_id = $1", [projectId]);
  const recipientIds = memberRes.rows
    .map((row) => Number(row.member_id))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (recipientIds.length === 0) return;

  const data = {
    event,
    project_id: Number(projectId),
  };

  const normalizedTask = normalizeTaskRealtimePayload(task);
  if (normalizedTask) {
    data.task = normalizedTask;
  }

  if (taskId != null) {
    const numericTaskId = Number(taskId);
    if (Number.isInteger(numericTaskId) && numericTaskId > 0) {
      data.task_id = numericTaskId;
    }
  }

  broadcastToUsers(recipientIds, {
    type: "task",
    data,
  });
};

/**
 * @swagger
 * /api/tasks/recent:
 *   get:
 *     summary: 최근 작업 활동 조회
 *     description: 최근 24시간 작업 활동 목록 조회
 *     tags:
 *       - Task
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 최근 작업 활동 조회 성공
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           title:
 *                             type: string
 *                           kanban_id:
 *                             type: integer
 *                           kanban_name:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           event_type:
 *                             type: string
 *                             enum: [CREATED, UPDATED]
 *                           occurred_at:
 *                             type: string
 *                             format: date-time
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
    const projectExists = await ensureProjectExists(projectId, res);
    if (!projectExists) return;

    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const recentRes = await pool.query(
      `SELECT
        t.id,
        t.title,
        t.kanban_id,
        k.name as kanban_name,
        t.created_at,
        t.updated_at,
        'CREATED' as event_type,
        t.created_at as occurred_at
       FROM task t
       JOIN kanban k ON t.kanban_id = k.id
       WHERE k.project_id = $1
         AND t.created_at >= NOW() - INTERVAL '24 hours'
       UNION ALL
       SELECT
        t.id,
        t.title,
        t.kanban_id,
        k.name as kanban_name,
        t.created_at,
        t.updated_at,
        'UPDATED' as event_type,
        t.updated_at as occurred_at
       FROM task t
       JOIN kanban k ON t.kanban_id = k.id
       WHERE k.project_id = $1
         AND t.updated_at >= NOW() - INTERVAL '24 hours'
         AND t.updated_at > t.created_at
       ORDER BY occurred_at DESC`,
      [projectId]
    );

    res.json(recentRes.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: 프로젝트 작업 전체 조회
 *     description: project_id 기준으로 프로젝트 내 전체 작업 목록 조회
 *     tags:
 *       - Task
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 작업 목록 조회 성공
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
    return res.status(400).json({ name: "BadRequest", message: "project_id is required" });
  }

  try {
    const projectExists = await ensureProjectExists(projectId, res);
    if (!projectExists) return;

    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    const taskRes = await pool.query(
      `SELECT
        t.id,
        t.title,
        t.content,
        t.status,
        t.priority,
        t.kanban_id,
        t.created_at,
        t.updated_at
      FROM task t
      JOIN kanban k ON k.id = t.kanban_id
      WHERE k.project_id = $1
      ORDER BY t.updated_at DESC, t.created_at DESC, t.id DESC`,
      [projectId]
    );

    res.json(taskRes.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: 작업 생성
 *     description: 새 작업을 생성하고 작성자를 REPORTER로 등록
 *     tags:
 *       - Task
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
 *               kanban_id:
 *                 type: integer
 *               status:
 *                 type: string
 *                 default: BACKLOG
 *             required:
 *               - title
 *               - kanban_id
 *     responses:
 *       201:
 *         description: 작업 생성 성공
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
  const { title, content, kanban_id, status = "BACKLOG", priority = 0 } = req.body;
  const userId = req.session.userId;
  const normalizedPriority = Number(priority);

  if (![2, 1, 0, -1].includes(normalizedPriority)) {
    return res.status(400).json({
      name: "BadRequest",
      message: "priority는 2, 1, 0, -1 중 하나여야 합니다.",
    });
  }

  const client = await pool.connect();
  try {
    // 권한 확인: 프로젝트 멤버인지 체크
    const authCheck = await client.query(
      `SELECT pm.id, k.project_id FROM project_member pm
       JOIN kanban k ON k.project_id = pm.project_id
       WHERE k.id = $1 AND pm.member_id = $2`,
      [kanban_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "작업 생성 권한이 없습니다." });
    }

    await client.query("BEGIN");

    // 작업 삽입
    const taskRes = await client.query(
      `INSERT INTO task (title, content, kanban_id, status, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, content, kanban_id, status, normalizedPriority]
    );
    const newTask = taskRes.rows[0];

    // 작성자를 REPORTER로 등록
    await client.query(
      `INSERT INTO task_member (task_id, member_id, role_name) VALUES ($1, $2, 'REPORTER')`,
      [newTask.id, userId]
    );

    const projectId = authCheck.rows[0]?.project_id;

    await client.query("COMMIT");

    try {
      await broadcastTaskEventToProjectMembers(client, {
        projectId,
        event: "created",
        task: newTask,
      });
    } catch (broadcastError) {
      console.warn("task created websocket broadcast failed", broadcastError?.message || broadcastError);
    }

    res.status(201).json({ id: newTask.id });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // noop
    }
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   get:
 *     summary: 작업 상세 조회
 *     description: 작업의 상세 정보 조회
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 작업 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Task"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:taskId", isAuth, async (req, res) => {
  const { taskId } = req.params;
  try {
    const taskRes = await pool.query(`SELECT * FROM task WHERE id = $1`, [taskId]);
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "작업을 찾을 수 없습니다." });
    }

    res.json(taskRes.rows[0]);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/:taskId/channel", isAuth, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.session.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const taskRes = await client.query(
      `SELECT t.id, t.title, k.project_id, p.workspace_id
       FROM task t
       JOIN kanban k ON k.id = t.kanban_id
       JOIN project p ON p.id = k.project_id
       WHERE t.id = $1
       FOR UPDATE`,
      [taskId]
    );

    if (taskRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "작업을 찾을 수 없습니다." });
    }

    const task = taskRes.rows[0];

    const memberCheck = await client.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [task.project_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    let createdNow = false;
    let channel;

    const existingChannelRes = await client.query("SELECT * FROM channel WHERE task_id = $1", [taskId]);
    if (existingChannelRes.rows.length > 0) {
      channel = existingChannelRes.rows[0];
    } else {
      const createChannelRes = await client.query(
        `INSERT INTO channel (name, project_id, workspace_id, task_id, type, status, scope)
         VALUES ($1, $2, $3, $4, 'TASK', 'ACTIVE', 'PROJECT')
         RETURNING *`,
        [task.title || `Task #${taskId}`, task.project_id, task.workspace_id, taskId]
      );
      channel = createChannelRes.rows[0];
      createdNow = true;
    }

    if (createdNow) {
      await client.query(
        `INSERT INTO channel_member (channel_id, member_id, role_name)
         VALUES ($1, $2, 'OWNER')
         ON CONFLICT (channel_id, member_id) DO NOTHING`,
        [channel.id, userId]
      );

      const taskMemberRes = await client.query(
        "SELECT DISTINCT member_id FROM task_member WHERE task_id = $1",
        [taskId]
      );

      for (const row of taskMemberRes.rows) {
        if (String(row.member_id) === String(userId)) {
          continue;
        }
        await client.query(
          `INSERT INTO channel_member (channel_id, member_id, role_name)
           VALUES ($1, $2, 'MEMBER')
           ON CONFLICT (channel_id, member_id) DO NOTHING`,
          [channel.id, row.member_id]
        );
      }
    }

    await client.query(
      `INSERT INTO channel_member (channel_id, member_id, role_name)
       VALUES ($1, $2, 'MEMBER')
       ON CONFLICT (channel_id, member_id) DO NOTHING`,
      [channel.id, userId]
    );

    await client.query("COMMIT");
    res.json({
      id: channel.id,
      name: channel.name,
      status: channel.status,
      task_id: Number(taskId),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}/members:
 *   get:
 *     summary: 작업 관련자 목록 조회
 *     description: 작업에 연결된 멤버 목록 조회
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 작업 관련자 목록 조회 성공
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
 *                     $ref: "#/components/schemas/TaskMember"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:taskId/members", isAuth, async (req, res) => {
  const { taskId } = req.params;
  try {
    const membersRes = await pool.query(
      `SELECT tm.id as task_member_id, m.id as member_id, m.name, m.email, tm.role_name, tm.created_at
       FROM task_member tm
       JOIN member m ON tm.member_id = m.id
       WHERE tm.task_id = $1
       ORDER BY tm.created_at ASC`,
      [taskId]
    );

    res.json(membersRes.rows);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: 작업 수정
 *     description: 작업의 정보와 상태 수정
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *         description: 작업 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Task"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/:taskId", isAuth, async (req, res) => {
  const { taskId } = req.params;
  let { title, content, status, kanban_id, priority } = req.body; // Use 'let' for kanban_id as it might be reassigned
  const actorId = req.session.userId;
  const client = await pool.connect();

  if (priority !== undefined) {
    const parsedPriority = Number(priority);
    if (![2, 1, 0, -1].includes(parsedPriority)) {
      return res.status(400).json({
        name: "BadRequest",
        message: "priority는 2, 1, 0, -1 중 하나여야 합니다.",
      });
    }
    priority = parsedPriority;
  }

  try {
    await client.query("BEGIN");

    const prevTaskRes = await client.query(
      `SELECT t.id, t.title, t.content, t.status, t.priority, t.kanban_id, k.project_id
       FROM task t
       JOIN kanban k ON k.id = t.kanban_id
       WHERE t.id = $1`,
      [taskId]
    );

    if (prevTaskRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "작업 없음" });
    }

    const prevTask = prevTaskRes.rows[0];

    // If status is being set to BACKLOG, automatically move to the project's backlog kanban
    if (status === 'BACKLOG') {
      // 1. Get the current task's project_id
      const currentTaskInfo = await client.query(
        `SELECT k.project_id
         FROM task t
         JOIN kanban k ON t.kanban_id = k.id
         WHERE t.id = $1`,
        [taskId]
      );

      if (currentTaskInfo.rows.length > 0) {
        const currentProjectId = currentTaskInfo.rows[0].project_id;

        // 2. Find the backlog kanban for this project
        const backlogKanban = await client.query(
          `SELECT id FROM kanban WHERE project_id = $1 AND type = 'BACKLOG'`,
          [currentProjectId]
        );

        if (backlogKanban.rows.length > 0) {
          kanban_id = backlogKanban.rows[0].id; // Override kanban_id to the backlog kanban's ID
        }
      }
    }

    const result = await client.query(
      `UPDATE task
       SET title = COALESCE($1, title), content = COALESCE($2, content), status = COALESCE($3, status), kanban_id = COALESCE($4, kanban_id), priority = COALESCE($5, priority), updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [title, content, status, kanban_id, priority, taskId]
    );

    const updatedTask = result.rows[0];
    const previousStatus = String(prevTask.status || "").toUpperCase();
    const nextStatus = String(updatedTask.status || "").toUpperCase();
    const isStatusChanged = previousStatus !== nextStatus;
    const isTitleChanged = String(prevTask.title || "") !== String(updatedTask.title || "");
    const isContentChanged =
      String(prevTask.title || "") !== String(updatedTask.title || "") ||
      String(prevTask.content || "") !== String(updatedTask.content || "") ||
      Number(prevTask.priority) !== Number(updatedTask.priority);

    if (String(updatedTask.status || "").toUpperCase() === "DONE") {
      await client.query(
        `UPDATE channel
         SET status = 'ARCHIVED'
         WHERE task_id = $1
           AND type = 'TASK'`,
        [taskId]
      );
    } else {
      await client.query(
        `UPDATE channel
         SET status = 'ACTIVE'
         WHERE task_id = $1
           AND type = 'TASK'`,
        [taskId]
      );
    }

    if (isStatusChanged || isContentChanged) {
      const watcherRes = await client.query(
        `SELECT member_id
         FROM task_member
         WHERE task_id = $1
           AND role_name = 'WATCHER'`,
        [taskId]
      );

      const watcherIds = watcherRes.rows.map((row) => row.member_id);
      const taskTitle = updatedTask.title || prevTask.title || `Task #${taskId}`;

      if (isStatusChanged) {
        await createNotifications(
          {
            recipientIds: watcherIds,
            actorId,
            type: NOTIFICATION_TYPES.TASK_WATCHING_STATUS_CHANGED,
            resourceType: "task",
            resourceId: Number(taskId),
            projectId: prevTask.project_id,
            title: `팔로우 작업 상태 변경: ${taskTitle}`,
            body: `${previousStatus} → ${nextStatus}`,
            payload: {
              task_id: Number(taskId),
              previous_status: previousStatus,
              next_status: nextStatus,
            },
          },
          { client }
        );
      }

      if (isContentChanged) {
        await createNotifications(
          {
            recipientIds: watcherIds,
            actorId,
            type: NOTIFICATION_TYPES.TASK_WATCHING_CONTENT_CHANGED,
            resourceType: "task",
            resourceId: Number(taskId),
            projectId: prevTask.project_id,
            title: `팔로우 작업 내용 변경: ${taskTitle}`,
            body: "작업 제목 또는 내용이 변경되었습니다.",
            payload: {
              task_id: Number(taskId),
            },
          },
          { client }
        );
      }
    }

    if (previousStatus === "IN_REVIEW" && nextStatus === "DONE") {
      const assigneeRes = await client.query(
        `SELECT member_id
         FROM task_member
         WHERE task_id = $1
           AND role_name = 'ASSIGNEE'`,
        [taskId]
      );

      await createNotifications(
        {
          recipientIds: assigneeRes.rows.map((row) => row.member_id),
          actorId,
          type: NOTIFICATION_TYPES.TASK_ASSIGNEE_REVIEW_TO_DONE,
          resourceType: "task",
          resourceId: Number(taskId),
          projectId: prevTask.project_id,
          title: `담당 작업 완료 처리: ${updatedTask.title || `Task #${taskId}`}`,
          body: "검토 중 상태에서 완료로 변경되었습니다.",
          payload: {
            task_id: Number(taskId),
            previous_status: previousStatus,
            next_status: nextStatus,
          },
        },
        { client }
      );
    }

    await client.query("COMMIT");

    if (isTitleChanged) {
      try {
        await broadcastTaskEventToProjectMembers(client, {
          projectId: prevTask.project_id,
          event: "updated",
          task: updatedTask,
        });
      } catch (broadcastError) {
        console.warn("task updated websocket broadcast failed", broadcastError?.message || broadcastError);
      }
    }

    res.json(updatedTask);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // noop
    }
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}/members:
 *   post:
 *     summary: 작업 담당자 추가
 *     description: 작업에 담당자를 추가
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskId
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
router.post("/:taskId/members", isAuth, async (req, res) => {
  const { taskId } = req.params;
  const { member_id, role_name = "ASSIGNEE" } = req.body;
  const actorId = req.session.userId;
  try {
    const insertRes = await pool.query(
      `INSERT INTO task_member (task_id, member_id, role_name) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [taskId, member_id, role_name]
    );

    let taskMemberId = insertRes.rows[0]?.id;
    if (!taskMemberId) {
      const existingRes = await pool.query(
        "SELECT id FROM task_member WHERE task_id = $1 AND member_id = $2",
        [taskId, member_id]
      );
      taskMemberId = existingRes.rows[0]?.id;
    }

    const roleUpper = String(role_name || "").toUpperCase();
    if (roleUpper === "ASSIGNEE") {
      const taskRes = await pool.query(
        `SELECT t.title, k.project_id, k.id AS kanban_id
         FROM task t
         JOIN kanban k ON k.id = t.kanban_id
         WHERE t.id = $1`,
        [taskId]
      );
      const taskTitle = taskRes.rows[0]?.title || `Task #${taskId}`;
      const projectId = taskRes.rows[0]?.project_id || null;
      const kanbanId = taskRes.rows[0]?.kanban_id || null;
      await createNotifications({
        recipientIds: [member_id],
        actorId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED_TO_ME,
        resourceType: "task",
        resourceId: Number(taskId),
        projectId,
        title: `작업 담당자로 지정됨: ${taskTitle}`,
        body: "담당자로 할당되었습니다.",
        payload: {
          task_id: Number(taskId),
          kanban_id: kanbanId ? Number(kanbanId) : null,
        },
      });
    }

    res.json({ id: taskMemberId, message: "담당자가 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks/members/{taskMemberId}:
 *   patch:
 *     summary: 작업 담당자 역할 수정
 *     description: 작업 담당자의 역할을 수정
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskMemberId
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
 *                     task_id:
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
router.patch("/members/:taskMemberId", isAuth, async (req, res) => {
  const { taskMemberId } = req.params;
  const { role_name } = req.body;
  const actorId = req.session.userId;

  if (!role_name) {
    return res.status(400).json({ name: "BadRequest", message: "역할이 필요합니다." });
  }

  try {
    const result = await pool.query(
      `UPDATE task_member SET role_name = $1 WHERE id = $2 RETURNING *`,
      [role_name, taskMemberId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "관련자를 찾을 수 없습니다." });
    }

    const updatedMember = result.rows[0];
    const roleUpper = String(updatedMember.role_name || "").toUpperCase();
    if (roleUpper === "ASSIGNEE") {
      const taskRes = await pool.query(
        `SELECT t.title, k.project_id, k.id AS kanban_id
         FROM task t
         JOIN kanban k ON k.id = t.kanban_id
         WHERE t.id = $1`,
        [updatedMember.task_id]
      );
      const taskTitle = taskRes.rows[0]?.title || `Task #${updatedMember.task_id}`;
      const projectId = taskRes.rows[0]?.project_id || null;
      const kanbanId = taskRes.rows[0]?.kanban_id || null;

      await createNotifications({
        recipientIds: [updatedMember.member_id],
        actorId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED_TO_ME,
        resourceType: "task",
        resourceId: Number(updatedMember.task_id),
        projectId,
        title: `작업 담당자로 지정됨: ${taskTitle}`,
        body: "담당자로 할당되었습니다.",
        payload: {
          task_id: Number(updatedMember.task_id),
          task_member_id: Number(updatedMember.id),
          kanban_id: kanbanId ? Number(kanbanId) : null,
        },
      });
    }

    res.json(updatedMember);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks/members/{taskMemberId}:
 *   delete:
 *     summary: 작업 담당자 제거
 *     description: 작업 담당자를 제거
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskMemberId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/members/:taskMemberId", isAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM task_member WHERE id = $1`, [req.params.taskMemberId]);
    res.json({ message: "멤버가 제외되었습니다." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: 작업 삭제
 *     description: 작업 삭제
 *     tags:
 *       - Task
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/:taskId", isAuth, async (req, res) => {
  const { taskId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const taskRes = await client.query(
      `SELECT t.id, k.project_id
       FROM task t
       JOIN kanban k ON k.id = t.kanban_id
       WHERE t.id = $1`,
      [taskId]
    );

    await client.query(`DELETE FROM task WHERE id = $1`, [taskId]);
    await client.query("COMMIT");

    const projectId = taskRes.rows[0]?.project_id;
    if (projectId) {
      try {
        await broadcastTaskEventToProjectMembers(client, {
          projectId,
          event: "deleted",
          taskId,
        });
      } catch (broadcastError) {
        console.warn("task deleted websocket broadcast failed", broadcastError?.message || broadcastError);
      }
    }

    res.json({ message: "작업이 삭제되었습니다." });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // noop
    }
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

export default router;
