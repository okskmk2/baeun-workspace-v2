import pg from "pg";
import dotenv from "dotenv";

// .env 파일의 환경 변수를 로드합니다.
dotenv.config();

/**
 * PostgreSQL Connection Pool 설정
 * 매 요청마다 새로운 연결을 생성하지 않고, 미리 생성된 연결을 재사용하여 성능을 높입니다.
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,

  // 최대 연결 수 (기본값 10)
  max: 20,
  // 연결 시도 시간 제한 (ms)
  connectionTimeoutMillis: 2000,
  // 연결이 유휴 상태로 유지되는 시간 (ms)
  idleTimeoutMillis: 30000,
});

// 데이터베이스 연결 확인 이벤트
pool.on("connect", () => {
  console.log("✅ PostgreSQL DB에 성공적으로 연결되었습니다.");
});

// 에러 핸들링
pool.on("error", (err) => {
  console.error("❌ 예기치 못한 DB 연결 에러 발생:", err);
  process.exit(-1);
});

export default pool;
