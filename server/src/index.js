import express from "express";
import dotenv from "dotenv";
import { memberRouter } from "./router/member.js";
import { workspaceRouter } from "./router/workspace.js";
import path from "path";
import { fileURLToPath } from "url";

// 현재 파일의 URL을 파일 경로로 변환
const __filename = fileURLToPath(import.meta.url);
// 파일 경로에서 디렉토리 경로만 추출
const __dirname = path.dirname(__filename);

// 1. 환경 변수 로드 (.env 파일 읽기)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 2. 미들웨어 설정
app.use(express.json()); // JSON 본문 파싱
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "..", "client")));

// 4. 라우터 등록 (버전닝 포함)
app.use("/api/v1/members", memberRouter);
app.use("/api/v1/workspaces", workspaceRouter);

// 기본 경로 확인용
app.get("/", (req, res) => {
  res.send("Collaboration Tool API Server is running...");
});

// 5. 404 에러 처리
app.use((req, res) => {
  res.status(404).json({ message: "해당 경로를 찾을 수 없습니다." });
});

// 6. 서버 시작
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 서버가 포트 ${PORT}에서 작동 중입니다.`);
  console.log(`🔗 접속 주소: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
