import express from "express";
import bcrypt from "bcrypt"; // bcrypt 임포트
import { isAuth, isGuest } from "../middlewares/auth.middleware.mjs";
import pool from "../db.mjs"; // 설정하신 DB 연결 풀

const router = express.Router();
const SALT_ROUNDS = 10; // 해싱 복잡도 (높을수록 보안 강화, 속도 저하)

router.post("/signup", isGuest, async (req, res) => {
  const { name, email, password } = req.body;
  const client = await pool.connect(); // 트랜잭션을 위해 클라이언트 직접 사용

  try {
    await client.query("BEGIN");

    // 1. 사용자 생성
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userRes = await client.query(
      `INSERT INTO member (name, email, password) VALUES ($1, $2, $3) RETURNING id, name`,
      [name, email, hashedPassword]
    );
    const userId = userRes.rows[0].id;

    // 2. 기본 워크스페이스 생성 (개인 공간)
    const wsRes = await client.query(
      `INSERT INTO workspace (name, member_id, is_default) 
             VALUES ($1, $2, true) RETURNING id`,
      [`${name}님의 개인 워크스페이스`, userId]
    );
    const workspaceId = wsRes.rows[0].id;

    // 3. 워크스페이스 멤버 등록 (OWNER)
    await client.query(
      `INSERT INTO workspace_member (workspace_id, member_id, role_name) 
             VALUES ($1, $2, 'OWNER')`,
      [workspaceId, userId]
    );

    // 4. 기본 프로젝트 생성
    const projectRes = await client.query(
      `INSERT INTO project (name, workspace_id, is_default) 
     VALUES ($1, $2, true) RETURNING id`,
      ["첫 번째 프로젝트", workspaceId]
    );
    const projectId = projectRes.rows[0].id;

    // 5. 프로젝트 멤버 등록 (생성자를 멤버로 추가)
    await client.query(
      `INSERT INTO project_member (project_id, member_id, role_name) 
     VALUES ($1, $2, 'OWNER')`,
      [projectId, userId]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "회원가입 및 기본 공간 생성이 완료되었습니다.",
      data: { userId, name },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.constraint === "member_email_unique") {
      return res.status(400).json({ success: false, message: "이미 존재하는 이메일입니다." });
    }
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
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
      return res.status(401).json({ success: false, message: "이메일 또는 비밀번호가 틀립니다." });
    }

    const user = result.rows[0];

    // 2. 입력받은 비밀번호와 DB의 해시값 비교
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "이메일 또는 비밀번호가 틀립니다." });
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
      return res.status(500).json({ success: false, message: "로그아웃 중 오류가 발생했습니다." });
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
