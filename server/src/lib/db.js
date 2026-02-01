import { Pool } from "pg";

export const pool = new Pool({
  // .env 파일에 DB 연결 정보를 설정하세요
  connectionString: process.env.DATABASE_URL,
});
