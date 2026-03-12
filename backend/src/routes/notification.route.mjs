import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import { withPagination } from "../middlewares/pagination.middleware.mjs";
import logger from "../logger.mjs";

const router = express.Router();

router.get("/", isAuth, withPagination({ defaultLimit: 30, maxLimit: 100 }), async (req, res) => {
  const userId = req.session.userId;
  const { limit } = req.pagination;
  const beforeId = Number.parseInt(String(req.query.before_id || ""), 10);
  const readFilter = String(req.query.read || "all").toLowerCase();
  const normalizedReadFilter = ["all", "read", "unread"].includes(readFilter)
    ? readFilter
    : "all";

  try {
    const params = [userId, limit];
    let whereClause = "WHERE n.recipient_id = $1";

    if (normalizedReadFilter === "read") {
      whereClause += " AND n.is_read = true";
    } else if (normalizedReadFilter === "unread") {
      whereClause += " AND n.is_read = false";
    }

    if (Number.isInteger(beforeId) && beforeId > 0) {
      params.push(beforeId);
      whereClause += ` AND n.id < $${params.length}`;
    }

    const listRes = await pool.query(
      `SELECT
        n.*,
        m.name AS actor_name,
        m.img_url AS actor_img_url
      FROM notification n
      LEFT JOIN member m ON m.id = n.actor_id
      ${whereClause}
      ORDER BY n.id DESC
      LIMIT $2`,
      params
    );

    const unreadRes = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notification WHERE recipient_id = $1 AND is_read = false",
      [userId]
    );

    res.json({
      unread_count: unreadRes.rows[0]?.count || 0,
      items: listRes.rows,
    });
  } catch (error) {
    logger.error("notification list error", {
      err: error?.message,
      stack: error?.stack,
      userId,
      limit,
      beforeId,
      readFilter: normalizedReadFilter,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.patch("/:notificationId/read", isAuth, async (req, res) => {
  const userId = req.session.userId;
  const { notificationId } = req.params;

  try {
    const updateRes = await pool.query(
      `UPDATE notification
       SET is_read = true,
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1
         AND recipient_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ name: "NotFound", message: "알림을 찾을 수 없습니다." });
    }

    res.json(updateRes.rows[0]);
  } catch (error) {
    logger.error("notification read error", {
      err: error?.message,
      stack: error?.stack,
      userId,
      notificationId,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

router.post("/read-all", isAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    await pool.query(
      `UPDATE notification
       SET is_read = true,
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE recipient_id = $1
         AND is_read = false`,
      [userId]
    );

    res.json({ message: "모든 알림을 읽음 처리했습니다." });
  } catch (error) {
    logger.error("notification read-all error", {
      err: error?.message,
      stack: error?.stack,
      userId,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
});

export default router;
