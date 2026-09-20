const DEFAULT_RP_NAME = "바은 워크스페이스";
const DEFAULT_PUBLIC_URL = "http://localhost:8081";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const originFromUrl = (value) => {
  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
};

const rpIdFromHostname = (hostname) => {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host || host === "127.0.0.1" || host === "[::1]" || host === "::1") {
    return "localhost";
  }
  return host.split(":")[0];
};

export const getWebAuthnConfig = () => {
  const publicOrigin =
    originFromUrl(process.env.WEBAUTHN_ORIGIN) ||
    originFromUrl(process.env.APP_PUBLIC_URL) ||
    originFromUrl(DEFAULT_PUBLIC_URL);
  const publicHost = publicOrigin ? new URL(publicOrigin).hostname : "localhost";

  const rpName = String(process.env.WEBAUTHN_RP_NAME || DEFAULT_RP_NAME).trim() || DEFAULT_RP_NAME;
  const rpID = String(process.env.WEBAUTHN_RP_ID || rpIdFromHostname(publicHost)).trim() || "localhost";
  const extraOrigins = parseOrigins(process.env.WEBAUTHN_ORIGIN);
  const origins = [...new Set([publicOrigin, ...extraOrigins, "http://localhost:8081"].filter(Boolean))];

  return {
    rpName,
    rpID,
    origins,
  };
};

export const WEBAUTHN_CHALLENGE_TTL_MS = CHALLENGE_TTL_MS;

export const setWebAuthnChallenge = async (req, payload) => {
  req.session.webauthnChallenge = {
    ...payload,
    createdAt: Date.now(),
  };
  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

export const readWebAuthnChallenge = (req, expectedType) => {
  const stored = req.session?.webauthnChallenge;
  if (!stored || stored.type !== expectedType || !stored.challenge) {
    return null;
  }
  if (Date.now() - Number(stored.createdAt || 0) > CHALLENGE_TTL_MS) {
    return null;
  }
  return stored;
};

export const clearWebAuthnChallenge = async (req) => {
  if (!req.session) return;
  delete req.session.webauthnChallenge;
  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};
