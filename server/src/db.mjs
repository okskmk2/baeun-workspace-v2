import pg from "pg";
import dotenv from "dotenv";
import logger from "./logger.mjs";

// Load environment variables from .env.
dotenv.config();

/**
 * PostgreSQL connection pool setup.
 * Avoid creating a new connection per request by reusing pooled connections.
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,

  // Max connections (default is 10).
  max: 7,
  // Connection timeout (ms).
  connectionTimeoutMillis: 2000,
  // Idle timeout before a connection is closed (ms).
  idleTimeoutMillis: 60000,
});

// Database connection event.
pool.on("connect", () => {
  logger.info("PostgreSQL DB connected.");
});

// Error handler.
pool.on("error", (err) => {
  logger.error("Unexpected DB connection error", {
    err: err?.message,
    stack: err?.stack,
  });
  process.exit(-1);
});

export default pool;
