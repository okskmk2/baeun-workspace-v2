import express from "express";
import bcrypt from "bcrypt"; // bcrypt module.
import { isAuth, isGuest } from "../middlewares/auth.middleware.mjs";
import pool from "../db.mjs"; // DB connection config.

const router = express.Router();
const SALT_ROUNDS = 10; // Hash cost (higher is more secure but slower).

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

    // 4. Create default project.
    const projectRes = await client.query(
      `INSERT INTO project (name, workspace_id, is_default) 
     VALUES ($1, $2, true) RETURNING id`,
      ["First Project", workspaceId]
    );
    const projectId = projectRes.rows[0].id;

    // 5. Add project member (OWNER).
    await client.query(
      `INSERT INTO project_member (project_id, member_id, role_name) 
     VALUES ($1, $2, 'OWNER')`,
      [projectId, userId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Signup complete. Default workspace created.",
      data: { user_id: userId, workspace_id: workspaceId, project_id: projectId },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.constraint === "member_email_unique") {
      return res.status(400).json({ success: false, message: "Email already exists." });
    }
    res.status(500).json({ success: false, message: error.message });
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
router.post("/login", isGuest, async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email.
    const query = "SELECT * FROM member WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const user = result.rows[0];

    // 2. Compare password hash.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // 3. Set session.
    req.session.userId = user.id;
    req.session.userName = user.name;

    res.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: "Logout failed." });
    }
    res.clearCookie("connect.sid"); // Clear session cookie.
    res.json({ success: true, message: "Logged out." });
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
    const query = "SELECT id, name, email, img_url, created_at FROM member WHERE id = $1";
    const result = await pool.query(query, [req.session.userId]);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    res.json({
      success: true,
      message: "Profile updated.",
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
