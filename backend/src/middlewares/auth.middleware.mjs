import pool from "../db.mjs";

/**
 * @desc Auth guard middleware
 */
export const isAuth = (req, res, next) => {
  // Allow requests with an authenticated session.
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({
      name: "Unauthorized",
      message: "Login is required.",
    });
  }
};

/**
 * @desc SYSTEM_ADMIN-only guard. Use after isAuth.
 */
export const isSystemAdmin = async (req, res, next) => {
  try {
    const memberResult = await pool.query(
      `SELECT id, role_name, COALESCE(account_status, 'ACTIVE') AS account_status
       FROM member
       WHERE id = $1`,
      [req.session.userId]
    );
    const member = memberResult.rows[0];
    if (!member || String(member.role_name || "").toUpperCase() !== "SYSTEM_ADMIN") {
      return res.status(403).json({ name: "Forbidden", message: "Admin access required." });
    }
    if (String(member.account_status || "ACTIVE").toUpperCase() === "SUSPENDED") {
      return res.status(403).json({ name: "Forbidden", message: "Account is suspended." });
    }
    req.systemAdmin = member;
    next();
  } catch (error) {
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
};

/**
 * @desc Guest-only guard middleware
 */
export const isGuest = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    next();
  } else {
    res.status(400).json({
      name: "BadRequest",
      message: "You are already logged in.",
    });
  }
};
