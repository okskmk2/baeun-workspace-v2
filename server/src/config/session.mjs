const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const parsedSessionTtlMs = Number.parseInt(process.env.SESSION_TTL_MS || "", 10);

export const SESSION_TTL_MS =
  Number.isFinite(parsedSessionTtlMs) && parsedSessionTtlMs > 0
    ? parsedSessionTtlMs
    : DEFAULT_SESSION_TTL_MS;

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
