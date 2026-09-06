import express from "express";
import bcrypt from "bcrypt"; // bcrypt module.
import { randomUUID } from "crypto";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import { isAuth, isGuest, isSystemAdmin } from "../middlewares/auth.middleware.mjs";
import pool from "../db.mjs"; // DB connection config.
import {
  DEFAULT_PROJECT_WIKI_CONTENT,
  DEFAULT_PROJECT_WIKI_TITLE,
} from "../constants/defaultProjectWiki.mjs";
import { REMEMBER_SESSION_TTL_MS } from "../config/session.mjs";

const router = express.Router();
const SALT_ROUNDS = 10; // Hash cost (higher is more secure but slower).
const MAX_CONCURRENT_SESSIONS = 4;
const PROFILE_IMAGE_BUCKET = "workspace.baeun.com";
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const storage = new Storage();
const bucket = storage.bucket(PROFILE_IMAGE_BUCKET);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_IMAGE_MAX_SIZE },
});

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_MEMBER_LOCALES = new Set(["ko", "en"]);
const ALLOWED_MEMBER_REGIONS = new Set(["kr", "us"]);
const ALLOWED_MEMBER_APPROVAL_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const normalizeRememberValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "on";
  }
  return false;
};

const getOwnedResourceItems = async (client, userId) => {
  const [workspaceRes, projectRes, pageRes, boardRes, channelRes] = await Promise.all([
    client.query(
      `SELECT w.id, w.name
       FROM workspace_member wm
       JOIN workspace w ON w.id = wm.workspace_id
       WHERE wm.member_id = $1 AND wm.role_name = 'OWNER'
       ORDER BY w.id DESC`,
      [userId]
    ),
    client.query(
      `SELECT p.id, p.name, p.workspace_id
       FROM project_member pm
       JOIN project p ON p.id = pm.project_id
       WHERE pm.member_id = $1 AND pm.role_name = 'OWNER'
       ORDER BY p.id DESC`,
      [userId]
    ),
    client.query(
      `SELECT pg.id, pg.title, pg.project_id
       FROM page_member pgm
       JOIN page pg ON pg.id = pgm.page_id
       WHERE pgm.member_id = $1 AND pgm.role_name = 'OWNER'
       ORDER BY pg.id DESC`,
      [userId]
    ),
    client.query(
      `SELECT b.id, b.name, b.project_id
       FROM kanban_member bm
       JOIN kanban b ON b.id = bm.kanban_id
       WHERE bm.member_id = $1 AND bm.role_name = 'OWNER'
       ORDER BY b.id DESC`,
      [userId]
    ),
    client.query(
      `SELECT c.id, c.name, c.project_id
       FROM channel_member cm
       JOIN channel c ON c.id = cm.channel_id
       WHERE cm.member_id = $1 AND cm.role_name = 'OWNER'
       ORDER BY c.id DESC`,
      [userId]
    ),
  ]);

  const workspaceItems = workspaceRes.rows.map((row) => ({
    type: "workspace",
    id: row.id,
    name: row.name || `Workspace #${row.id}`,
  }));

  const projectItems = projectRes.rows.map((row) => ({
    type: "project",
    id: row.id,
    name: row.name || `Project #${row.id}`,
    workspace_id: row.workspace_id,
  }));

  const pageItems = pageRes.rows.map((row) => ({
    type: "page",
    id: row.id,
    name: row.title || `Page #${row.id}`,
    project_id: row.project_id,
  }));

  const boardItems = boardRes.rows.map((row) => ({
    type: "board",
    id: row.id,
    name: row.name || `Board #${row.id}`,
    project_id: row.project_id,
  }));

  const channelItems = channelRes.rows.map((row) => ({
    type: "channel",
    id: row.id,
    name: row.name || `Channel #${row.id}`,
    project_id: row.project_id,
  }));

  return [...workspaceItems, ...projectItems, ...pageItems, ...boardItems, ...channelItems];
};

const getOwnedResourceTypes = (items = []) => {
  const types = [...new Set(items.map((item) => item?.type).filter(Boolean))];
  return types;
};

const getProfileImageApiUrl = (memberId) => `/api/members/${memberId}/profile/image`;

const normalizeMemberImageUrl = (memberId, rawImageUrl) => {
  if (!rawImageUrl) return null;
  const value = String(rawImageUrl).trim();
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (/^\/api\/members\/\d+\/profile\/image(\?.*)?$/.test(value)) {
    return value;
  }

  return getProfileImageApiUrl(memberId);
};

const getMemberApprovalStatusMessage = (approvalStatus) => {
  const normalized = String(approvalStatus || "").toUpperCase();
  if (normalized === "PENDING") return "Signup request is pending approval.";
  if (normalized === "REJECTED") return "Signup request was rejected.";
  return "Signup approval is required.";
};

const createApprovedMemberResources = async (client, userId, userName) => {
  const workspaceRes = await client.query(
    `INSERT INTO workspace (name, member_id, is_default)
     VALUES ($1, $2, true)
     RETURNING id`,
    [`${userName}'s personal workspace`, userId]
  );
  const workspaceId = workspaceRes.rows[0].id;

  await client.query(
    `INSERT INTO workspace_member (workspace_id, member_id, role_name)
     VALUES ($1, $2, 'OWNER')`,
    [workspaceId, userId]
  );

  await client.query(
    `INSERT INTO channel (name, workspace_id, type, scope, status)
     VALUES ($1, $2, 'NOTICE', 'WORKSPACE', 'ACTIVE')`,
    ["워크스페이스 공지채널", workspaceId]
  );

  const projectRes = await client.query(
    `INSERT INTO project (name, workspace_id, is_default)
     VALUES ($1, $2, true)
     RETURNING id`,
    ["First Project", workspaceId]
  );
  const projectId = projectRes.rows[0].id;

  await client.query(
    `INSERT INTO channel (name, project_id, type, scope, status)
     VALUES ($1, $2, 'NOTICE', 'PROJECT', 'ACTIVE')`,
    ["프로젝트 공지채널", projectId]
  );

  await client.query(
    `INSERT INTO project_member (project_id, member_id, role_name)
     VALUES ($1, $2, 'OWNER')`,
    [projectId, userId]
  );

  const pageRes = await client.query(
    `INSERT INTO page (title, content, project_id, parent_id)
     VALUES ($1, $2, $3, NULL)
     RETURNING id`,
    [DEFAULT_PROJECT_WIKI_TITLE, DEFAULT_PROJECT_WIKI_CONTENT, projectId]
  );

  await client.query(
    `INSERT INTO page_member (page_id, member_id, role_name)
     VALUES ($1, $2, 'OWNER')`,
    [pageRes.rows[0].id, userId]
  );

  return { workspaceId, projectId, pageId: pageRes.rows[0].id };
};

const listMemberProfileFiles = async (memberId) => {
  const prefix = `members/${memberId}/profile.`;
  const [files] = await bucket.getFiles({ prefix });
  return files || [];
};

const enforceSessionLimit = async (userId, currentSid) => {
  const sessionsResult = await pool.query(
    `SELECT sid
     FROM session
     WHERE sess ->> 'userId' = $1
     ORDER BY created_at ASC, sid ASC`,
    [String(userId)]
  );

  const overflowCount = sessionsResult.rows.length - MAX_CONCURRENT_SESSIONS;
  if (overflowCount <= 0) return;

  const deleteSids = [];
  for (const row of sessionsResult.rows) {
    if (row.sid === currentSid) continue;
    deleteSids.push(row.sid);
    if (deleteSids.length === overflowCount) break;
  }

  if (deleteSids.length === 0) return;

  await pool.query("DELETE FROM session WHERE sid = ANY($1::varchar[])", [deleteSids]);
};

/**
 * @swagger
 * /api/members/signup/email-check:
 *   get:
 *     summary: Check signup email availability
 *     description: Check whether an email is already used by a member account
 *     tags:
 *       - Member
 */
router.get("/signup/email-check", async (req, res) => {
  const email = String(req.query.email || "").trim();

  if (!email) {
    return res.status(400).json({ name: "BadRequest", message: "email is required." });
  }

  try {
    const result = await pool.query("SELECT id FROM member WHERE email = $1 LIMIT 1", [email]);
    const isAvailable = result.rows.length === 0;

    return res.json({
      available: isAvailable,
      message: isAvailable ? "Email is available." : "Email already exists.",
    });
  } catch (error) {
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/signup:
 *   post:
 *     summary: Signup
 *     description: Create a signup request that requires admin approval
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - name
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: Signup success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user_id:
 *                   type: integer
 *                 approval_status:
 *                   type: string
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/signup", isGuest, async (req, res) => {
  const { name, email, password } = req.body;
  const client = await pool.connect(); // Use a client for transaction control.

  try {
    await client.query("BEGIN");

    // 1. Create user.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userRes = await client.query(
      `INSERT INTO member (name, email, password, approval_status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, name, approval_status`,
      [name, email, hashedPassword]
    );
    const userId = userRes.rows[0].id;

    await client.query("COMMIT");

    res.status(201).json({
      message: "Signup request submitted. Awaiting admin approval.",
      user_id: userId,
      approval_status: userRes.rows[0].approval_status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.constraint === "member_email_unique") {
      return res.status(400).json({ name: "BadRequest", message: "Email already exists." });
    }
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/members/login:
 *   post:
 *     summary: Login
 *     description: Login with email and password
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     approval_status:
 *                       type: string
 *       401:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;

  try {
    // 1. Find user by email.
    const query = "SELECT * FROM member WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ name: "Unauthorized", message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // 2. Compare password hash.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ name: "Unauthorized", message: "Invalid email or password." });
    }

    const approvalStatus = String(user.approval_status || "").toUpperCase();
    if (approvalStatus !== "APPROVED") {
      return res.status(403).json({
        name: "Forbidden",
        message: getMemberApprovalStatusMessage(approvalStatus),
      });
    }

    const accountStatus = String(user.account_status || "ACTIVE").toUpperCase();
    if (accountStatus === "SUSPENDED") {
      return res.status(403).json({
        name: "Forbidden",
        message: "Account is suspended.",
      });
    }

    // 3. Set session.
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.userRole = user.role_name;
    if (normalizeRememberValue(remember)) {
      req.session.cookie.maxAge = REMEMBER_SESSION_TTL_MS;
    } else {
      req.session.cookie.expires = false;
    }
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    await enforceSessionLimit(user.id, req.sessionID);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_name: user.role_name,
      approval_status: approvalStatus,
      account_status: accountStatus,
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/admin/signups:
 *   get:
 *     summary: Pending signup requests
 *     description: List pending signup requests for system admins
 *     tags:
 *       - Member
 */
router.get("/admin/signups", isAuth, isSystemAdmin, async (req, res) => {

  const page = Math.max(Number.parseInt(String(req.query.page || "1"), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize || "10"), 10) || 10, 1), 100);
  const offset = (page - 1) * pageSize;
  const keyword = String(req.query.q || "").trim();

  const conditions = ["approval_status = 'PENDING'"];
  const params = [];
  if (keyword) {
    params.push(`%${keyword}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM member ${whereClause}`, params);

  const listParams = [...params, pageSize, offset];
  const listResult = await pool.query(
    `SELECT id, name, email, approval_status, created_at
     FROM member
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  res.json({
    items: listResult.rows,
    pagination: {
      page,
      pageSize,
      total: totalResult.rows[0]?.total || 0,
    },
  });
});

/**
 * @swagger
 * /api/members/admin/signups/{memberId}:
 *   patch:
 *     summary: Approve or reject signup request
 *     description: Update pending signup approval status for system admins
 *     tags:
 *       - Member
 */
router.patch("/admin/signups/:memberId", isAuth, isSystemAdmin, async (req, res) => {

  const memberId = Number.parseInt(req.params.memberId, 10);
  const action = String(req.body?.action || "").toUpperCase();
  const targetStatus = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : null;

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return res.status(400).json({ name: "BadRequest", message: "memberId must be a positive integer." });
  }

  if (!targetStatus || !ALLOWED_MEMBER_APPROVAL_STATUSES.has(targetStatus)) {
    return res.status(400).json({ name: "BadRequest", message: "action must be APPROVE or REJECT." });
  }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const memberResult = await client.query(
      `SELECT id, name, email, approval_status
       FROM member
       WHERE id = $1
       FOR UPDATE`,
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const currentStatus = String(memberResult.rows[0].approval_status || "").toUpperCase();
    if (currentStatus !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        name: "BadRequest",
        message: `Signup request is already ${currentStatus.toLowerCase() || "resolved"}.`,
      });
    }

    const updatedMember = await client.query(
      `UPDATE member
       SET approval_status = $1
       WHERE id = $2
       RETURNING id, name, email, approval_status, created_at`,
      [targetStatus, memberId]
    );

    let resources = null;
    if (targetStatus === "APPROVED") {
      resources = await createApprovedMemberResources(
        client,
        memberId,
        memberResult.rows[0].name || `Member ${memberId}`
      );
    }

    await client.query("COMMIT");

    res.json({
      message: targetStatus === "APPROVED" ? "Signup request approved." : "Signup request rejected.",
      member: updatedMember.rows[0],
      resources,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/members/logout:
 *   post:
 *     summary: Logout
 *     description: Destroy session and logout
 *     tags:
 *       - Member
 *     responses:
 *       200:
 *         $ref: "#/components/responses/Success200Message"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ name: "InternalServerError", message: "Logout failed." });
    }
    res.clearCookie("connect.sid"); // Clear session cookie.
    res.json({ message: "Logged out." });
  });
});

/**
 * @swagger
 * /api/members/me:
 *   get:
 *     summary: Get current user
 *     description: Get profile for the logged-in user
 *     tags:
 *       - Member
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/me", isAuth, async (req, res) => {
  try {
    const query =
      "SELECT id, name, email, img_url, locale, region, role_name, approval_status, COALESCE(account_status, 'ACTIVE') AS account_status, created_at FROM member WHERE id = $1";
    const result = await pool.query(query, [req.session.userId]);
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }
    res.json({
      ...row,
      img_url: normalizeMemberImageUrl(row.id, row.img_url),
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/profile:
 *   put:
 *     summary: Update profile
 *     description: Update profile for the logged-in user
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               img_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     img_url:
 *                       type: string
 *                       nullable: true
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.put("/profile", isAuth, async (req, res) => {
  const { name } = req.body;
  try {
    const query = `
            UPDATE member 
            SET name = COALESCE($1, name)
            WHERE id = $2 
            RETURNING id, name, email, img_url;
        `;
    const result = await pool.query(query, [name, req.session.userId]);

    const row = result.rows[0];
    res.json({
      message: "Profile updated.",
      ...row,
      img_url: normalizeMemberImageUrl(row.id, row?.img_url),
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.get("/:memberId/profile/image", async (req, res) => {
  const { memberId } = req.params;

  try {
    const files = await listMemberProfileFiles(memberId);
    if (!files.length) {
      const memberRes = await pool.query("SELECT img_url FROM member WHERE id = $1", [memberId]);
      const legacyImageUrl = String(memberRes.rows[0]?.img_url || "").trim();
      if (legacyImageUrl.startsWith("http://") || legacyImageUrl.startsWith("https://")) {
        return res.redirect(302, legacyImageUrl);
      }
      return res.status(404).json({ name: "NotFound", message: "Profile image not found." });
    }

    const gcsFile = files[0];
    const [metadata] = await gcsFile.getMetadata();
    res.setHeader("Content-Type", metadata?.contentType || "application/octet-stream");
    if (metadata?.size) {
      res.setHeader("Content-Length", String(metadata.size));
    }
    if (metadata?.etag) {
      res.setHeader("ETag", metadata.etag);
    }
    if (metadata?.updated) {
      res.setHeader("Last-Modified", new Date(metadata.updated).toUTCString());
    }
    // Long-lived immutable cache prevents repeat browser requests for the same versioned URL.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    gcsFile
      .createReadStream()
      .on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ name: "InternalServerError", message: "Failed to stream image." });
        } else {
          res.end();
        }
      })
      .pipe(res);
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/{memberId}/profile/image:
 *   get:
 *     summary: Get profile image
 *     description: Redirect to profile image URL for the authenticated member
 *     tags:
 *       - Member
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Member ID (must match authenticated user)
 *     responses:
 *       302:
 *         description: Redirect to profile image URL
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/:memberId/profile/image", isAuth, async (req, res) => {
  const memberId = Number.parseInt(req.params.memberId, 10);

  if (!Number.isInteger(memberId) || memberId <= 0) {
    return res.status(400).json({ name: "BadRequest", message: "memberId must be a positive integer." });
  }

  try {
    const result = await pool.query("SELECT id, img_url FROM member WHERE id = $1", [memberId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const imageUrl = result.rows[0]?.img_url || "";
    if (!imageUrl) {
      return res.status(404).json({ name: "NotFound", message: "Profile image not found." });
    }

    return res.redirect(302, imageUrl);
  } catch (error) {
    return res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/profile/image:
 *   post:
 *     summary: Upload profile image
 *     description: Upload profile image to Google Cloud Storage and update img_url
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *             required:
 *               - image
 *     responses:
 *       200:
 *         description: Profile image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 img_url:
 *                   type: string
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.post(
  "/profile/image",
  isAuth,
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          name: "BadRequest",
          message: `Image size must be ${Math.floor(PROFILE_IMAGE_MAX_SIZE / (1024 * 1024))}MB or less.`,
        });
      }
      return res.status(400).json({ name: "BadRequest", message: "Invalid upload request." });
    });
  },
  async (req, res) => {
    const userId = req.session.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ name: "BadRequest", message: "image is required." });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        name: "BadRequest",
        message: "Only jpg, png, webp, gif images are allowed.",
      });
    }

    try {
      const extension = MIME_TO_EXTENSION[file.mimetype] || "bin";
      const objectPath = `members/${userId}/profile.${extension}`;
      const gcsFile = bucket.file(objectPath);

      const previousFiles = await listMemberProfileFiles(userId);

      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });

      const [savedMetadata] = await gcsFile.getMetadata();
      const version = savedMetadata?.generation || Date.now();
      const imageUrl = `${getProfileImageApiUrl(userId)}?v=${version}`;

      const updatedMember = await pool.query(
        `UPDATE member
         SET img_url = $1
         WHERE id = $2
         RETURNING id, name, email, img_url`,
        [imageUrl, userId]
      );

      if (updatedMember.rows.length === 0) {
        await gcsFile.delete({ ignoreNotFound: true });
        return res.status(404).json({ name: "NotFound", message: "Member not found." });
      }

      await Promise.all(
        previousFiles
          .filter((fileRef) => fileRef.name !== objectPath)
          .map((fileRef) => fileRef.delete({ ignoreNotFound: true }))
      );

      res.json({ message: "Profile image uploaded.", ...updatedMember.rows[0] });
    } catch (error) {
      res.status(500).json({ name: "InternalServerError", message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/members/profile/image:
 *   delete:
 *     summary: Delete profile image
 *     description: Delete profile image from Google Cloud Storage and clear img_url
 *     tags:
 *       - Member
 *     responses:
 *       200:
 *         description: Profile image deleted
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/profile/image", isAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    const currentMember = await pool.query("SELECT id FROM member WHERE id = $1", [userId]);
    if (currentMember.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const previousFiles = await listMemberProfileFiles(userId);
    await Promise.all(previousFiles.map((fileRef) => fileRef.delete({ ignoreNotFound: true })));

    const updatedMember = await pool.query(
      `UPDATE member
       SET img_url = NULL
       WHERE id = $1
       RETURNING id, name, email, img_url`,
      [userId]
    );

    if (updatedMember.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    res.json({ message: "Profile image removed.", ...updatedMember.rows[0] });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/me:
 *   patch:
 *     summary: Update current user profile
 *     description: Partially update the logged-in user's profile (currently supports name)
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 img_url:
 *                   type: string
 *                   nullable: true
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.patch("/me", isAuth, async (req, res) => {
  const { name, locale, region } = req.body || {};

  if (name === undefined && locale === undefined && region === undefined) {
    return res.status(400).json({ name: "BadRequest", message: "at least one field is required." });
  }

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ name: "BadRequest", message: "name must be a non-empty string." });
  }

  if (locale !== undefined) {
    if (typeof locale !== "string" || !ALLOWED_MEMBER_LOCALES.has(locale)) {
      return res.status(400).json({ name: "BadRequest", message: "locale must be one of: ko, en." });
    }
  }

  if (region !== undefined) {
    if (typeof region !== "string" || !ALLOWED_MEMBER_REGIONS.has(region)) {
      return res.status(400).json({ name: "BadRequest", message: "region must be one of: kr, us." });
    }
  }

  try {
    const result = await pool.query(
      `UPDATE member
       SET name = COALESCE($1, name),
           locale = COALESCE($2, locale),
           region = COALESCE($3, region)
       WHERE id = $4
       RETURNING id, name, email, img_url, locale, region`,
      [name?.trim() ?? null, locale ?? null, region ?? null, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const row = result.rows[0];
    if (name !== undefined) {
      req.session.userName = row.name;
    }

    res.json({
      message: "Profile updated.",
      ...row,
      img_url: normalizeMemberImageUrl(row.id, row.img_url),
    });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

/**
 * @swagger
 * /api/members/me/owned-resources:
 *   get:
 *     summary: Owned resources for withdrawal
 *     description: List owned resources where the current user still has OWNER role
 *     tags:
 *       - Member
 *     responses:
 *       200:
 *         description: Owned resources retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [workspace, project, page, board, channel]
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       workspace_id:
 *                         type: integer
 *                         nullable: true
 *                       project_id:
 *                         type: integer
 *                         nullable: true
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.get("/me/owned-resources", isAuth, async (req, res) => {
  const userId = req.session.userId;
  const client = await pool.connect();

  try {
    const resources = await getOwnedResourceItems(client, userId);
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/members/me:
 *   delete:
 *     summary: Withdraw account
 *     description: Verify password and withdraw account (soft delete + anonymize)
 *     tags:
 *       - Member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *             required:
 *               - password
 *     responses:
 *       200:
 *         description: Withdraw success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: "#/components/responses/ErrorResponse"
 *       401:
 *         $ref: "#/components/responses/ErrorResponse"
 *       403:
 *         $ref: "#/components/responses/ErrorResponse"
 *       404:
 *         $ref: "#/components/responses/ErrorResponse"
 *       500:
 *         $ref: "#/components/responses/ErrorResponse"
 */
router.delete("/me", isAuth, async (req, res) => {
  const { password } = req.body;
  const userId = req.session.userId;

  if (!password) {
    return res.status(400).json({ name: "BadRequest", message: "password is required." });
  }

  const client = await pool.connect();
  try {
    const memberRes = await client.query("SELECT id, password FROM member WHERE id = $1", [userId]);
    if (memberRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const isMatch = await bcrypt.compare(password, memberRes.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ name: "Unauthorized", message: "Invalid password." });
    }

    const ownedResourceItems = await getOwnedResourceItems(client, userId);
    const ownedResources = getOwnedResourceTypes(ownedResourceItems);

    const ownedWorkspaceRes = await client.query(
      `SELECT w.id, w.is_default
       FROM workspace w
       JOIN workspace_member wm ON w.id = wm.workspace_id
       WHERE wm.member_id = $1 AND wm.role_name = 'OWNER'`,
      [userId]
    );

    const ownedProjectRes = await client.query(
      `SELECT p.id, p.is_default
       FROM project p
       JOIN project_member pm ON p.id = pm.project_id
       WHERE pm.member_id = $1 AND pm.role_name = 'OWNER'`,
      [userId]
    );

    const ownedWorkspaceIds = ownedWorkspaceRes.rows.map((row) => row.id);
    const ownedProjectIds = ownedProjectRes.rows.map((row) => row.id);
    const defaultWorkspaceIds = ownedWorkspaceRes.rows
      .filter((row) => row.is_default)
      .map((row) => row.id);
    const defaultProjectIds = ownedProjectRes.rows
      .filter((row) => row.is_default)
      .map((row) => row.id);

    const onlyWorkspaceProjectTypes = ownedResources.every((type) =>
      ["workspace", "project"].includes(type)
    );
    const hasOnlyDefaultWorkspace =
      ownedWorkspaceIds.length > 0 && ownedWorkspaceIds.length === defaultWorkspaceIds.length;
    const hasOnlyDefaultProject =
      ownedProjectIds.length > 0 && ownedProjectIds.length === defaultProjectIds.length;
    const canAutoDeleteDefaults =
      onlyWorkspaceProjectTypes && hasOnlyDefaultWorkspace && hasOnlyDefaultProject;

    if (ownedResources.length > 0 && !canAutoDeleteDefaults) {
      return res.status(403).json({
        name: "Forbidden",
        message: "Owner resources exist. Transfer ownership first.",
        details: ownedResources,
      });
    }

    await client.query("BEGIN");

    if (canAutoDeleteDefaults) {
      await client.query("DELETE FROM project WHERE id = ANY($1::int[])", [defaultProjectIds]);
      await client.query("DELETE FROM workspace WHERE id = ANY($1::int[])", [defaultWorkspaceIds]);
    }

    await client.query("DELETE FROM workspace_member WHERE member_id = $1", [userId]);
    await client.query("DELETE FROM project_member WHERE member_id = $1", [userId]);
    await client.query("DELETE FROM page_member WHERE member_id = $1", [userId]);
    await client.query("DELETE FROM kanban_member WHERE member_id = $1", [userId]);
    await client.query("DELETE FROM channel_member WHERE member_id = $1", [userId]);
    await client.query("DELETE FROM task_member WHERE member_id = $1", [userId]);

    const withdrawnEmail = `withdrawn_${userId}_${Date.now()}@withdrawn.local`;
    const randomPasswordHash = await bcrypt.hash(randomUUID(), SALT_ROUNDS);

    await client.query(
      `UPDATE member
       SET name = $1,
           email = $2,
           password = $3,
           img_url = NULL
       WHERE id = $4`,
      [`withdrawn-user-${userId}`, withdrawnEmail, randomPasswordHash, userId]
    );

    await client.query("DELETE FROM session WHERE sess ->> 'userId' = $1", [String(userId)]);

    await client.query("COMMIT");

    await new Promise((resolve) => {
      req.session.destroy(() => resolve());
    });
    res.clearCookie("connect.sid");

    res.json({
      message: "Account withdrawn.",
      auto_deleted_defaults: canAutoDeleteDefaults,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ name: "InternalServerError", message: error.message });
  } finally {
    client.release();
  }
});

export default router;
