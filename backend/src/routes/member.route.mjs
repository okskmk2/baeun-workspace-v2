import express from "express";
import bcrypt from "bcrypt"; // bcrypt module.
import { randomUUID } from "crypto";
import multer from "multer";
import { Storage } from "@google-cloud/storage";
import { isAuth, isGuest } from "../middlewares/auth.middleware.mjs";
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

const getGcsPublicUrl = (bucketName, objectPath) => {
  const encodedPath = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
};

const getObjectPathFromGcsUrl = (url, bucketName) => {
  if (!url) return null;

  const normalizedUrl = String(url).trim();
  if (!normalizedUrl) return null;

  const publicPrefix = `https://storage.googleapis.com/${bucketName}/`;
  const virtualHostPrefix = `https://${bucketName}.storage.googleapis.com/`;

  let rawPath = "";
  if (normalizedUrl.startsWith(publicPrefix)) {
    rawPath = normalizedUrl.slice(publicPrefix.length);
  } else if (normalizedUrl.startsWith(virtualHostPrefix)) {
    rawPath = normalizedUrl.slice(virtualHostPrefix.length);
  } else {
    return null;
  }

  if (!rawPath) return null;
  return rawPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
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
 * /api/members/signup:
 *   post:
 *     summary: Signup
 *     description: Create a user and a default workspace
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
 *                 data:
 *                   $ref: "#/components/schemas/SignupCreatedIds"
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
      `INSERT INTO member (name, email, password) VALUES ($1, $2, $3) RETURNING id, name`,
      [name, email, hashedPassword]
    );
    const userId = userRes.rows[0].id;

    // 2. Create default workspace (personal space).
    const wsRes = await client.query(
      `INSERT INTO workspace (name, member_id, is_default) 
             VALUES ($1, $2, true) RETURNING id`,
      [`${name}'s personal workspace`, userId]
    );
    const workspaceId = wsRes.rows[0].id;

    // 3. Add workspace member (OWNER).
    await client.query(
      `INSERT INTO workspace_member (workspace_id, member_id, role_name) 
             VALUES ($1, $2, 'OWNER')`,
      [workspaceId, userId]
    );

    const workspaceNoticeQuery = `
      INSERT INTO channel (name, workspace_id, type, scope, status)
      VALUES ($1, $2, 'NOTICE', 'WORKSPACE', 'ACTIVE');
    `;
    await client.query(workspaceNoticeQuery, ["워크스페이스 공지채널", workspaceId]);

    // 4. Create default project.
    const projectRes = await client.query(
      `INSERT INTO project (name, workspace_id, is_default) 
     VALUES ($1, $2, true) RETURNING id`,
      ["First Project", workspaceId]
    );
    const projectId = projectRes.rows[0].id;

    const projectNoticeQuery = `
      INSERT INTO channel (name, project_id, type, scope, status)
      VALUES ($1, $2, 'NOTICE', 'PROJECT', 'ACTIVE');
    `;
    await client.query(projectNoticeQuery, ["프로젝트 공지채널", projectId]);

    // 5. Add project member (OWNER).
    await client.query(
      `INSERT INTO project_member (project_id, member_id, role_name) 
     VALUES ($1, $2, 'OWNER')`,
      [projectId, userId]
    );

    // 6. Create default wiki page for signup default project only.
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

    await client.query("COMMIT");

    res.status(201).json({
      message: "Signup complete. Default workspace created.",
      user_id: userId,
      workspace_id: workspaceId,
      project_id: projectId,
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

    // 3. Set session.
    req.session.userId = user.id;
    req.session.userName = user.name;
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

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
    const query = "SELECT id, name, email, img_url, role_name, created_at FROM member WHERE id = $1";
    const result = await pool.query(query, [req.session.userId]);

    res.json(result.rows[0]);
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
  const { name, img_url } = req.body;
  try {
    const query = `
            UPDATE member 
            SET name = COALESCE($1, name), 
                img_url = COALESCE($2, img_url) 
            WHERE id = $3 
            RETURNING id, name, email, img_url;
        `;
    const result = await pool.query(query, [name, img_url, req.session.userId]);

    res.json({ message: "Profile updated.", ...result.rows[0] });
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
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
      const currentMember = await pool.query("SELECT img_url FROM member WHERE id = $1", [userId]);
      const previousImageUrl = currentMember.rows[0]?.img_url || "";
      const previousObjectPath = getObjectPathFromGcsUrl(previousImageUrl, PROFILE_IMAGE_BUCKET);

      const extension = MIME_TO_EXTENSION[file.mimetype] || "bin";
      const objectPath = `members/${userId}/${Date.now()}-${randomUUID()}.${extension}`;
      const gcsFile = bucket.file(objectPath);

      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: "public, max-age=31536000, immutable",
        },
      });

      const imageUrl = getGcsPublicUrl(PROFILE_IMAGE_BUCKET, objectPath);

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

      if (previousObjectPath && previousObjectPath !== objectPath) {
        try {
          await bucket.file(previousObjectPath).delete({ ignoreNotFound: true });
        } catch (error) {
          await gcsFile.delete({ ignoreNotFound: true });
          return res.status(500).json({
            name: "InternalServerError",
            message: "Failed to replace previous profile image.",
          });
        }
      }

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
    const currentMember = await pool.query("SELECT img_url FROM member WHERE id = $1", [userId]);
    if (currentMember.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "Member not found." });
    }

    const currentImageUrl = currentMember.rows[0]?.img_url || "";
    const objectPath = getObjectPathFromGcsUrl(currentImageUrl, PROFILE_IMAGE_BUCKET);

    if (objectPath) {
      await bucket.file(objectPath).delete({ ignoreNotFound: true });
    }

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
