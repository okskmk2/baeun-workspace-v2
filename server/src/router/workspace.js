import express from "express";
import { pool } from "../lib/db.js";
import { authenticateToken } from "../middlewares/authenticate.js";
import { checkSubscription } from "../middlewares/subscription.js";

const workspaceRouter = express.Router();

// authenticateToken 미들웨어는 이미 정의되어 있다고 가정합니다.

/**
 * 1. 워크스페이스 생성 (POST /api/v1/workspaces)
 * 워크스페이스 생성자는 자동으로 ADMIN 역할을 가집니다.
 */
workspaceRouter.post("/", authenticateToken, async (req, res) => {
  const { name, subscription_id } = req.body;
  const memberId = req.user.sub;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1-1. 워크스페이스 생성
    const workspaceQuery = `
      INSERT INTO public.workspace (name, subscription_id, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, name;
    `;
    const workspaceRes = await client.query(workspaceQuery, [
      name,
      subscription_id,
    ]);
    const workspaceId = workspaceRes.rows[0].id;

    // 1-2. 생성자를 워크스페이스 멤버(ADMIN)로 추가
    const memberQuery = `
      INSERT INTO public.workspace_member (workspace_id, member_id, role, created_at)
      VALUES ($1, $2, 'ADMIN', CURRENT_TIMESTAMP);
    `;
    await client.query(memberQuery, [workspaceId, memberId]);

    await client.query("COMMIT");
    res.status(201).json(workspaceRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "워크스페이스 생성 실패" });
  } finally {
    client.release();
  }
});

/**
 * 2. 내 워크스페이스 목록 조회 (GET /api/v1/workspaces)
 */
workspaceRouter.get("/", authenticateToken, async (req, res) => {
  const memberId = req.user.sub;

  try {
    const query = `
      SELECT w.id, w.name, w.created_at, wm.role, s.name as subscription_name
      FROM public.workspace w
      JOIN public.workspace_member wm ON w.id = wm.workspace_id
      LEFT JOIN public.subscription s ON w.subscription_id = s.id
      WHERE wm.member_id = $1;
    `;
    const result = await pool.query(query, [memberId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "목록 조회 실패" });
  }
});

/**
 * 3. 워크스페이스에 멤버 초대 (POST /api/v1/workspaces/:id/members)
 */
workspaceRouter.post(
  "/:id/members",
  authenticateToken,
  checkSubscription,
  async (req, res) => {
    const workspaceId = req.params.id;
    const { target_member_id, role } = req.body;
    const requesterId = req.user.sub;

    try {
      // 권한 체크: 요청자가 해당 워크스페이스의 ADMIN인지 확인
      const checkQuery = `SELECT role FROM public.workspace_member WHERE workspace_id = $1 AND member_id = $2`;
      const checkRes = await pool.query(checkQuery, [workspaceId, requesterId]);

      if (!checkRes.rows[0] || checkRes.rows[0].role !== "ADMIN") {
        return res
          .status(403)
          .json({ message: "멤버를 초대할 권한이 없습니다." });
      }

      const inviteQuery = `
      INSERT INTO public.workspace_member (workspace_id, member_id, role, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (workspace_id, member_id) DO NOTHING
      RETURNING id;
    `;
      const result = await pool.query(inviteQuery, [
        workspaceId,
        target_member_id,
        role || "MEMBER",
      ]);

      if (result.rowCount === 0) {
        return res
          .status(400)
          .json({ message: "이미 추가된 멤버이거나 추가할 수 없습니다." });
      }

      res.status(201).json({ message: "멤버가 성공적으로 추가되었습니다." });
    } catch (err) {
      res.status(500).json({ message: "멤버 초대 실패" });
    }
  },
);

export { workspaceRouter };
