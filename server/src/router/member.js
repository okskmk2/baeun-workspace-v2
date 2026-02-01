import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateToken } from "../middlewares/authenticate.js";
import { pool } from "../lib/db.js";

const memberRouter = express.Router();

/**
 * 1. 회원가입 (POST /api/v1/members/signup)
 */
memberRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO public.member (name, email, password, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id, name, email;
    `;

    const result = await pool.query(query, [name, email, hashedPassword]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "회원가입 중 오류가 발생했습니다." });
  }
});

/**
 * 2. 로그인 및 JWT 발급 (POST /api/v1/members/login)
 */
memberRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = "SELECT * FROM public.member WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 틀립니다." });
    }

    // JWT Payload 구성
    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      // 필요한 경우 여기에 추가 정보(role 등) 삽입
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
    res.json({ accessToken: token });
  } catch (err) {
    res.status(500).json({ message: "로그인 중 오류 발생" });
  }
});

/**
 * 3. 내 프로필 조회 (GET /api/v1/members/me)
 */
memberRouter.get("/me", authenticateToken, async (req, res) => {
  try {
    // JWT sub(id)를 이용하여 최신 정보 조회
    const query = `
      SELECT m.id, m.name, m.email, m.created_at, ms.status as subscription_status
      FROM public.member m
      LEFT JOIN public.member_subscription ms ON m.id = ms.member_id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [req.user.sub]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "정보 조회 오류" });
  }
});

export { memberRouter };
