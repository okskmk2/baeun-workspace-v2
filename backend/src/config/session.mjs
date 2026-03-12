const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const DEFAULT_REMEMBER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7d

const parsedSessionTtlMs = Number.parseInt(process.env.SESSION_TTL_MS || "", 10);
const parsedRememberSessionTtlMs = Number.parseInt(process.env.REMEMBER_SESSION_TTL_MS || "", 10);

export const SESSION_TTL_MS =
  Number.isFinite(parsedSessionTtlMs) && parsedSessionTtlMs > 0
    ? parsedSessionTtlMs
    : DEFAULT_SESSION_TTL_MS;

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

export const REMEMBER_SESSION_TTL_MS =
  Number.isFinite(parsedRememberSessionTtlMs) && parsedRememberSessionTtlMs > 0
    ? parsedRememberSessionTtlMs
    : DEFAULT_REMEMBER_SESSION_TTL_MS;

export const REMEMBER_SESSION_TTL_SECONDS = Math.floor(REMEMBER_SESSION_TTL_MS / 1000);
