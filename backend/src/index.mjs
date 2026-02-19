import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.mjs";
import pool from "./db.mjs";
import logger from "./logger.mjs";
import http from "http";
import { WebSocketServer } from "ws";
import { broadcastToRoom, joinRoom, removeSocket } from "./ws.mjs";
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
import boardRouter from "./routes/board.route.mjs";
import issueRouter from "./routes/issue.route.mjs";
import chatRouter from "./routes/chat.route.mjs";

const app = express();
const pgSession = connectPgSimple(session);
const isProduction = process.env.NODE_ENV === "production";

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
app.use("/api/boards", boardRouter);
app.use("/api/issues", issueRouter);
app.use("/api/channels", chatRouter);

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
      if (!channelId || !content) return;

      try {
        const memberCheck = await pool.query(
          "SELECT id FROM channel_member WHERE channel_id = $1 AND member_id = $2",
          [channelId, userId]
        );
        if (memberCheck.rows.length === 0) return;

        const insertRes = await pool.query(
          "INSERT INTO message (channel_id, content, created_by) VALUES ($1, $2, $3) RETURNING id, content, created_at, created_by",
          [channelId, content, userId]
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
          },
        });
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


