import { pool } from "../lib/db.js";

export const checkSubscription = async (req, res, next) => {
  const memberId = req.user.sub;

  try {
    const subQuery = `
      SELECT status, ends_at 
      FROM public.member_subscription 
      WHERE member_id = $1 AND status = 'ACTIVE'
    `;
    const { rows } = await pool.query(subQuery, [memberId]);

    if (rows.length === 0 || new Date(rows[0].ends_at) < new Date()) {
      return res.status(403).json({
        message:
          "유효한 구독이 없습니다. 서비스를 이용하려면 구독을 갱신해주세요.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    next(); // 유효하면 다음 로직(워크스페이스 생성 등)으로 진행
  } catch (err) {
    res.status(500).json({ message: "구독 정보 확인 중 오류 발생" });
  }
};
