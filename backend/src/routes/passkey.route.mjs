import express from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import pool from "../db.mjs";
import {
  clearWebAuthnChallenge,
  getWebAuthnConfig,
  readWebAuthnChallenge,
  setWebAuthnChallenge,
} from "../config/webauthn.mjs";
import {
  assertMemberLoginAllowed,
  establishMemberSession,
  toPublicMember,
} from "../lib/memberAuth.mjs";

const router = express.Router();

const toUint8Array = (value) => {
  if (!value) return new Uint8Array();
  if (value instanceof Uint8Array) return value;
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  return new Uint8Array(value);
};

const parseTransports = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeTransports = (value) => {
  const items = parseTransports(value);
  return items.length ? items.join(",") : null;
};

const sanitizeNickname = (value) => {
  const nickname = String(value || "").trim();
  if (!nickname) return null;
  return nickname.slice(0, 80);
};

const mapCredentialRow = (row) => ({
  id: row.id,
  nickname: row.nickname,
  device_type: row.device_type,
  backed_up: row.backed_up,
  created_at: row.created_at,
  last_used_at: row.last_used_at,
});

const listMemberCredentials = async (memberId) => {
  const result = await pool.query(
    `SELECT id, credential_id, public_key, counter, device_type, backed_up, transports, nickname, created_at, last_used_at
     FROM webauthn_credential
     WHERE member_id = $1
     ORDER BY created_at DESC, id DESC`,
    [memberId]
  );
  return result.rows;
};

/**
 * @swagger
 * /api/members/passkeys:
 *   get:
 *     summary: List passkeys
 *     tags: [Member]
 */
router.get("/passkeys", isAuth, async (req, res) => {
  try {
    const rows = await listMemberCredentials(req.session.userId);
    res.json({ items: rows.map(mapCredentialRow) });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/passkeys:
 *   delete:
 *     summary: Delete all passkeys for the current member
 *     tags: [Member]
 */
router.delete("/passkeys", isAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM webauthn_credential
       WHERE member_id = $1
       RETURNING id`,
      [req.session.userId]
    );
    await clearWebAuthnChallenge(req);
    res.json({
      message: "Passkeys reset.",
      deleted: result.rowCount || 0,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/passkeys/register/options:
 *   post:
 *     summary: Create passkey registration options
 *     tags: [Member]
 */
router.post("/passkeys/register/options", isAuth, async (req, res) => {
  try {
    const memberResult = await pool.query(
      `SELECT id, name, email, approval_status, COALESCE(account_status, 'ACTIVE') AS account_status
       FROM member
       WHERE id = $1`,
      [req.session.userId]
    );
    const member = memberResult.rows[0];
    if (!member) {
      return res.status(401).json({ name: "Unauthorized", message: "Login is required." });
    }

    const allowed = assertMemberLoginAllowed(member);
    if (!allowed.ok) {
      return res.status(allowed.status).json(allowed.body);
    }

    const existing = await listMemberCredentials(member.id);
    const { rpName, rpID } = getWebAuthnConfig();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: member.email,
      userDisplayName: member.name || member.email,
      userID: new TextEncoder().encode(String(member.id)),
      attestationType: "none",
      excludeCredentials: existing.map((row) => ({
        id: row.credential_id,
        transports: parseTransports(row.transports),
      })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await setWebAuthnChallenge(req, {
      type: "registration",
      challenge: options.challenge,
      memberId: member.id,
    });

    res.json(options);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/passkeys/register:
 *   post:
 *     summary: Verify and store a new passkey
 *     tags: [Member]
 */
router.post("/passkeys/register", isAuth, async (req, res) => {
  try {
    const stored = readWebAuthnChallenge(req, "registration");
    if (!stored || Number(stored.memberId) !== Number(req.session.userId)) {
      return res.status(400).json({ name: "BadRequest", message: "Passkey registration challenge is missing or expired." });
    }

    const { rpID, origins } = getWebAuthnConfig();
    const verification = await verifyRegistrationResponse({
      response: req.body?.credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo?.credential) {
      return res.status(400).json({ name: "BadRequest", message: "Passkey registration could not be verified." });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const nickname = sanitizeNickname(req.body?.nickname);

    const inserted = await pool.query(
      `INSERT INTO webauthn_credential
        (member_id, credential_id, public_key, counter, device_type, backed_up, transports, nickname)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nickname, device_type, backed_up, created_at, last_used_at`,
      [
        req.session.userId,
        credential.id,
        Buffer.from(credential.publicKey),
        credential.counter || 0,
        credentialDeviceType || null,
        Boolean(credentialBackedUp),
        serializeTransports(credential.transports),
        nickname,
      ]
    );

    await clearWebAuthnChallenge(req);
    res.status(201).json(mapCredentialRow(inserted.rows[0]));
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ name: "Conflict", message: "This passkey is already registered." });
    }
    res.status(400).json({ name: "BadRequest", message: error.message || "Passkey registration failed." });
  }
});

/**
 * @swagger
 * /api/members/passkeys/{passkeyId}:
 *   delete:
 *     summary: Delete a passkey
 *     tags: [Member]
 */
router.delete("/passkeys/:passkeyId", isAuth, async (req, res) => {
  const passkeyId = Number.parseInt(req.params.passkeyId, 10);
  if (!Number.isInteger(passkeyId) || passkeyId <= 0) {
    return res.status(400).json({ name: "BadRequest", message: "passkeyId must be a positive integer." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM webauthn_credential
       WHERE id = $1 AND member_id = $2
       RETURNING id`,
      [passkeyId, req.session.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Passkey not found." });
    }
    res.json({ message: "Passkey deleted." });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/passkeys/login/options:
 *   post:
 *     summary: Create passkey login options
 *     tags: [Member]
 */
router.post("/passkeys/login/options", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    let allowCredentials = [];

    if (email) {
      const memberResult = await pool.query(
        `SELECT id FROM member WHERE lower(email) = $1 LIMIT 1`,
        [email]
      );
      if (memberResult.rows[0]) {
        const rows = await listMemberCredentials(memberResult.rows[0].id);
        allowCredentials = rows.map((row) => ({
          id: row.credential_id,
          transports: parseTransports(row.transports),
        }));
      }
    }

    const { rpID } = getWebAuthnConfig();
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: "preferred",
    });

    await setWebAuthnChallenge(req, {
      type: "authentication",
      challenge: options.challenge,
    });

    res.json(options);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/passkeys/login:
 *   post:
 *     summary: Verify passkey and create a session
 *     tags: [Member]
 */
router.post("/passkeys/login", async (req, res) => {
  try {
    const stored = readWebAuthnChallenge(req, "authentication");
    if (!stored) {
      return res.status(400).json({ name: "BadRequest", message: "Passkey login challenge is missing or expired." });
    }

    const credentialResponse = req.body?.credential;
    const credentialId = String(credentialResponse?.id || "").trim();
    if (!credentialId) {
      return res.status(400).json({ name: "BadRequest", message: "Passkey credential is required." });
    }

    const credResult = await pool.query(
      `SELECT wc.id, wc.member_id, wc.credential_id, wc.public_key, wc.counter, wc.transports,
              m.id AS user_id, m.name, m.email, m.role_name, m.approval_status,
              COALESCE(m.account_status, 'ACTIVE') AS account_status
       FROM webauthn_credential wc
       JOIN member m ON m.id = wc.member_id
       WHERE wc.credential_id = $1
       LIMIT 1`,
      [credentialId]
    );
    const row = credResult.rows[0];
    if (!row) {
      return res.status(401).json({ name: "Unauthorized", message: "Unknown passkey." });
    }

    const allowed = assertMemberLoginAllowed(row);
    if (!allowed.ok) {
      return res.status(allowed.status).json(allowed.body);
    }

    const { rpID, origins } = getWebAuthnConfig();
    const verification = await verifyAuthenticationResponse({
      response: credentialResponse,
      expectedChallenge: stored.challenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: row.credential_id,
        publicKey: toUint8Array(row.public_key),
        counter: Number(row.counter) || 0,
        transports: parseTransports(row.transports),
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ name: "Unauthorized", message: "Passkey could not be verified." });
    }

    const nextCounter = verification.authenticationInfo?.newCounter ?? (Number(row.counter) || 0);
    await pool.query(
      `UPDATE webauthn_credential
       SET counter = $1, last_used_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [nextCounter, row.id]
    );

    await clearWebAuthnChallenge(req);
    await establishMemberSession(req, row, { remember: req.body?.remember });
    res.json(toPublicMember(row, allowed.approvalStatus, allowed.accountStatus));
  } catch (error) {
    res.status(400).json({ name: "BadRequest", message: error.message || "Passkey login failed." });
  }
});

export default router;
