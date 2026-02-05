import express from "express";
import bcrypt from "bcrypt"; // bcrypt 임포트
import { isAuth, isGuest } from "../middlewares/auth.middleware.mjs";
import pool from "../db.mjs"; // 설정하신 DB 연결 풀

const router = express.Router();
const SALT_ROUNDS = 10; // 해싱 복잡도 (높을수록 보안 강화, 속도 저하)

/**
 * @route   POST /api/member/signup
 * @desc    회원가입 (비밀번호 암호화 적용)
 */
router.post("/signup", isGuest, async (req, res) => {
  const { name, email, password, img_url } = req.body;

  try {
    // 1. 비밀번호 해싱 (Salt 생성 및 해싱 자동 처리)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const query = `
            INSERT INTO member (name, email, password, img_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, created_at;
        `;
    const values = [name, email, hashedPassword, img_url];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "회원가입이 완료되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    if (error.constraint === "member_email_unique") {
      return res
        .status(400)
        .json({ success: false, message: "이미 사용 중인 이메일입니다." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/member/login
 * @desc    로그인 (비밀번호 비교 로직 적용)
 */
router.post("/login", isGuest, async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. 이메일로 사용자 조회
    const query = "SELECT * FROM member WHERE email = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "이메일 또는 비밀번호가 틀립니다." });
    }

    const user = result.rows[0];

    // 2. 입력받은 비밀번호와 DB의 해시값 비교
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "이메일 또는 비밀번호가 틀립니다." });
    }

    // 3. 세션 저장
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
 * @route   POST /api/member/logout
 * @desc    로그아웃 (세션 파괴 및 쿠키 삭제)
 */
router.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "로그아웃 중 오류가 발생했습니다." });
    }
    res.clearCookie("connect.sid"); // 세션 쿠키 삭제
    res.json({ success: true, message: "로그아웃 되었습니다." });
  });
});

/**
 * @route   GET /api/member/me
 * @desc    현재 로그인된 내 정보 조회
 */
router.get("/me", isAuth, async (req, res) => {
  try {
    const query =
      "SELECT id, name, email, img_url, created_at FROM member WHERE id = $1";
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
 * @route   PUT /api/member/profile
 * @desc    내 프로필 수정
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
      message: "프로필이 수정되었습니다.",
      data: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
