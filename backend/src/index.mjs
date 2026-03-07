import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.mjs";
import pool from "./db.mjs";
import logger from "./logger.mjs";
import http from "http";
import { WebSocketServer } from "ws";
import { broadcastToRoom, broadcastToUsers, joinRoom, registerUserSocket, removeSocket } from "./ws.mjs";
import { createNotifications, NOTIFICATION_TYPES } from "./notification.mjs";
import path from "path";
import { fileURLToPath } from "url";
import { SESSION_TTL_MS, SESSION_TTL_SECONDS } from "./config/session.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// routes
import memberRouter from "./routes/member.route.mjs";
import workspaceRouter from "./routes/workspace.route.mjs";
import projectRouter from "./routes/project.route.mjs";
import pagesRouter from "./routes/pages.route.mjs";
import kanbanRouter from "./routes/kanban.route.mjs";
import taskRouter from "./routes/task.route.mjs";
import chatRouter from "./routes/chat.route.mjs";
import notificationRouter from "./routes/notification.route.mjs";
import metricsRouter from "./routes/metrics.route.mjs";

const app = express();
const pgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";
const MESSAGE_TYPES = ["SYSTEM", "USER", "AGENT"];

// Cloud Run and other reverse-proxy platforms
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger setup.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerUrl: "/openapi.json" }));
app.get("/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// 2. Session setup.
const sessionParser = session({
  store: new pgSession({
    pool: pool,
    tableName: "session",
    ttl: SESSION_TTL_SECONDS,
  }),
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production (HTTPS).
    sameSite: "lax", // Cross-site cookie delivery setting.
    maxAge: SESSION_TTL_MS,
  },
});

app.use(sessionParser);

// routes
app.use("/api/members", memberRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/projects", projectRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/kanbans", kanbanRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/channels", chatRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/metrics", metricsRouter);

// Static files serve
const staticPath = path.join(__dirname, "../../frontend/dist");

app.use(
  express.static(staticPath, {
    maxAge: "7d",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// SPA fallback
app.get("{/*path}", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"), {
    headers: {
      "Cache-Control": "no-cache",
    },
  });
});

const PORT = parseInt(process.env.PORT) || 8080;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const HEARTBEAT_INTERVAL_MS = 30_000;

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }

    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/ws")) {
    socket.destroy();
    return;
  }

  sessionParser(request, {}, () => {
    if (!request.session?.userId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });
});

wss.on("connection", (ws, request) => {
  const userId = request.session.userId;
  registerUserSocket(ws, userId);
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("error", () => {
    removeSocket(ws);
    ws.terminate();
  });

  ws.on("message", async (raw) => {
    let payload;
    try {
      payload = JSON.parse(raw.toString());
    } catch (error) {
      return;
    }

    if (payload?.type === "join") {
      if (!payload.channelId) return;
      joinRoom(ws, payload.channelId);
      return;
    }

    if (payload?.type === "message") {
      const { channelId, content } = payload;
      const rawMessageType = String(payload?.messageType || "USER").toUpperCase();
      const messageType = MESSAGE_TYPES.includes(rawMessageType) ? rawMessageType : "USER";
      if (!channelId || !content) return;

      try {
        const channelRes = await pool.query(
          "SELECT name, type, scope, project_id, workspace_id FROM channel WHERE id = $1",
          [channelId]
        );
        if (channelRes.rows.length === 0) return;

        const channel = channelRes.rows[0];
        const channelType = String(channel.type || "").toUpperCase();

        if (channelType === "NOTICE") {
          const scope = String(channel.scope || "").toUpperCase();
          const hasWorkspaceId = Boolean(channel.workspace_id);
          const hasProjectId = Boolean(channel.project_id);
          const shouldUseWorkspaceRole = scope === "WORKSPACE" || (hasWorkspaceId && !hasProjectId);

          if (shouldUseWorkspaceRole) {
            const wsRoleRes = await pool.query(
              "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
              [channel.workspace_id, userId]
            );
            const roleName = String(wsRoleRes.rows[0]?.role_name || "").toUpperCase();
            if (!["OWNER", "ADMIN"].includes(roleName)) {
              return;
            }
          } else if (hasProjectId) {
            const projectRoleRes = await pool.query(
              "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
              [channel.project_id, userId]
            );
            const roleName = String(projectRoleRes.rows[0]?.role_name || "").toUpperCase();
            if (!["OWNER", "ADMIN"].includes(roleName)) {
              return;
            }
          } else {
            return;
          }
        } else {
          const memberCheck = await pool.query(
            "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
            [channelId, userId]
          );
          if (memberCheck.rows.length === 0) return;
        }

        const insertRes = await pool.query(
          "INSERT INTO message (channel_id, content, created_by, type) VALUES ($1, $2, $3, $4) RETURNING id, content, created_at, created_by, type",
          [channelId, content, userId, messageType]
        );
        const message = insertRes.rows[0];
        const creatorRes = await pool.query("SELECT name FROM member WHERE id = $1", [userId]);
        const creatorName = creatorRes.rows[0]?.name || "";

        broadcastToRoom(channelId, {
          type: "message",
          data: {
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            created_by: message.created_by,
            creator_name: creatorName,
            channel_id: channelId,
            type: message.type || messageType,
          },
        });

        if (channelType !== "NOTICE") {
          const channelMembersRes = await pool.query(
            "SELECT member_id FROM channel_member WHERE channel_id = $1",
            [channelId]
          );
          const recipientIds = channelMembersRes.rows
            .map((row) => Number(row.member_id))
            .filter((id) => Number.isInteger(id) && id > 0)
            .filter((id) => String(id) !== String(userId));

          if (recipientIds.length > 0) {
            broadcastToUsers(recipientIds, {
              type: "channel_message",
              data: {
                channel_id: Number(channelId),
                message_id: Number(message.id),
                project_id: channel.project_id ? Number(channel.project_id) : null,
                workspace_id: channel.workspace_id ? Number(channel.workspace_id) : null,
                created_by: Number(userId),
                creator_name: creatorName,
                channel_name: String(channel.name || ""),
                content: String(message.content || ""),
              },
            });
          }
        }

        if (channelType === "NOTICE") {
          const scope = String(channel.scope || "").toUpperCase();
          if (scope === "WORKSPACE" && channel.workspace_id) {
            const wsMembersRes = await pool.query(
              "SELECT member_id FROM workspace_member WHERE workspace_id = $1",
              [channel.workspace_id]
            );
            const recipientIds = wsMembersRes.rows
              .map((row) => Number(row.member_id))
              .filter((id) => Number.isInteger(id) && id > 0)
              .filter((id) => String(id) !== String(userId));

            if (recipientIds.length > 0) {
              broadcastToUsers(recipientIds, {
                type: "channel_message",
                data: {
                  channel_id: Number(channelId),
                  message_id: Number(message.id),
                  project_id: channel.project_id ? Number(channel.project_id) : null,
                  workspace_id: channel.workspace_id ? Number(channel.workspace_id) : null,
                  created_by: Number(userId),
                  creator_name: creatorName,
                  channel_name: String(channel.name || ""),
                  content: String(message.content || ""),
                },
              });
            }

            await createNotifications({
              recipientIds,
              actorId: userId,
              type: NOTIFICATION_TYPES.CHANNEL_NOTICE_WORKSPACE_NEW_MESSAGE,
              resourceType: "channel",
              resourceId: Number(channelId),
              workspaceId: channel.workspace_id,
              title: "워크스페이스 공지 새 메시지",
              body: String(content || "").slice(0, 180),
              payload: {
                channel_id: Number(channelId),
                message_id: message.id,
              },
            });
          } else if (channel.project_id) {
            const projectMembersRes = await pool.query(
              "SELECT member_id FROM project_member WHERE project_id = $1",
              [channel.project_id]
            );
            const recipientIds = projectMembersRes.rows
              .map((row) => Number(row.member_id))
              .filter((id) => Number.isInteger(id) && id > 0)
              .filter((id) => String(id) !== String(userId));

            if (recipientIds.length > 0) {
              broadcastToUsers(recipientIds, {
                type: "channel_message",
                data: {
                  channel_id: Number(channelId),
                  message_id: Number(message.id),
                  project_id: channel.project_id ? Number(channel.project_id) : null,
                  workspace_id: channel.workspace_id ? Number(channel.workspace_id) : null,
                  created_by: Number(userId),
                  creator_name: creatorName,
                  channel_name: String(channel.name || ""),
                  content: String(message.content || ""),
                },
              });
            }

            await createNotifications({
              recipientIds,
              actorId: userId,
              type: NOTIFICATION_TYPES.CHANNEL_NOTICE_PROJECT_NEW_MESSAGE,
              resourceType: "channel",
              resourceId: Number(channelId),
              projectId: channel.project_id,
              title: "프로젝트 공지 새 메시지",
              body: String(content || "").slice(0, 180),
              payload: {
                channel_id: Number(channelId),
                message_id: message.id,
              },
            });
          }
        }
      } catch (error) {
        logger.error("chat websocket error", {
          err: error?.message,
          stack: error?.stack,
        });
      }
    }
  });

  ws.on("close", () => {
    removeSocket(ws);
  });
});

server.listen(PORT, () => logger.info(`Server listening on ${PORT}`));


