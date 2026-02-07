import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors"; // CORS 모듈 추가
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.mjs";
import pool from "./db.mjs";
import http from "http";
import { WebSocketServer } from "ws";
// routes
import memberRouter from "./routes/member.route.mjs";
import workspaceRouter from "./routes/workspace.route.mjs";
import projectRouter from "./routes/project.route.mjs";
import boardRouter from "./routes/board.route.mjs";
import issueRouter from "./routes/issue.route.mjs";
import chatRouter from "./routes/chat.route.mjs";

const app = express();
const pgSession = connectPgSimple(session);

// 1. CORS 설정
app.use(
  cors({
    // 클라이언트의 주소 (프론트엔드 주소)
    origin: "http://localhost:8080",
    // 쿠키를 주고받기 위해 필수 설정
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger 설정
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { swaggerUrl: "/api-docs.json" }));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// 2. 세션 설정 (이전과 동일)
const sessionParser = session({
  store: new pgSession({
    pool: pool,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // 배포 시(HTTPS) true로 변경
    sameSite: "lax", // 크로스 도메인 쿠키 전달 설정
    maxAge: 1000 * 60 * 60 * 24,
  },
});

app.use(sessionParser);

// routes
app.use("/api/member", memberRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/project", projectRouter);
app.use("/api/board", boardRouter);
app.use("/api/issue", issueRouter);
app.use("/api/chatroom", chatRouter);

const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const roomSockets = new Map();

const joinRoom = (ws, chatroomId) => {
  const key = String(chatroomId);
  if (ws.chatroomId) {
    const prev = roomSockets.get(ws.chatroomId);
    if (prev) {
      prev.delete(ws);
      if (prev.size === 0) {
        roomSockets.delete(ws.chatroomId);
      }
    }
  }
  ws.chatroomId = key;
  if (!roomSockets.has(key)) {
    roomSockets.set(key, new Set());
  }
  roomSockets.get(key).add(ws);
};

const broadcastToRoom = (chatroomId, payload) => {
  const sockets = roomSockets.get(String(chatroomId));
  if (!sockets) return;
  const message = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
};

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
      if (!payload.chatroomId) return;
      joinRoom(ws, payload.chatroomId);
      return;
    }

    if (payload?.type === "message") {
      const { chatroomId, content } = payload;
      if (!chatroomId || !content) return;

      try {
        const memberCheck = await pool.query(
          "SELECT id FROM chatroom_member WHERE chatroom_id = $1 AND member_id = $2",
          [chatroomId, userId]
        );
        if (memberCheck.rows.length === 0) return;

        const insertRes = await pool.query(
          "INSERT INTO chat (chatroom_id, content, created_by) VALUES ($1, $2, $3) RETURNING id, content, created_at, created_by",
          [chatroomId, content, userId]
        );
        const message = insertRes.rows[0];
        const creatorRes = await pool.query("SELECT name FROM member WHERE id = $1", [userId]);
        const creatorName = creatorRes.rows[0]?.name || "";

        broadcastToRoom(chatroomId, {
          type: "message",
          data: {
            id: message.id,
            content: message.content,
            created_at: message.created_at,
            created_by: message.created_by,
            creator_name: creatorName,
            chatroom_id: chatroomId,
          },
        });
      } catch (error) {
        console.error("chat websocket error:", error);
      }
    }
  });

  ws.on("close", () => {
    if (!ws.chatroomId) return;
    const sockets = roomSockets.get(ws.chatroomId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) {
      roomSockets.delete(ws.chatroomId);
    }
  });
});

server.listen(PORT, () => console.log(`🚀 서버 가동 중: ${PORT}`));
