import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors"; // CORS 모듈 추가
import pool from "./db.mjs";
// routes
import memberRouter from "./routes/member.route.mjs";
import workspaceRouter from "./routes/workspace.route.mjs";
import projectRouter from "./routes/project.route.mjs";
import boardRouter from "./routes/board.route.mjs";
import issueRouter from "./routes/issue.route.mjs";

const app = express();
const pgSession = connectPgSimple(session);

// 1. CORS 설정
app.use(
  cors({
    // 클라이언트의 주소 (프론트엔드 주소)
    origin: "http://localhost:8080",
    // 쿠키를 주고받기 위해 필수 설정
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. 세션 설정 (이전과 동일)
app.use(
  session({
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
  })
);

// routes
app.use("/api/member", memberRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/project", projectRouter);
app.use("/api/board", boardRouter);
app.use("/api/issue", issueRouter);

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 서버 가동 중: ${PORT}`));
