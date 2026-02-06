import express from "express";
import pool from "../db.mjs";
import { isAuth } from "../middlewares/auth.middleware.mjs";

const router = express.Router();

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: 프로젝트 생성
 *     description: 새 프로젝트를 생성하고 생성자를 OWNER로 등록
 *     tags:
 *       - Project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               workspace_id:
 *                 type: integer
 *             required:
 *               - name
 *               - workspace_id
 *     responses:
 *       201:
 *         description: 프로젝트 생성 성공
 *       403:
 *         description: 워크스페이스 멤버가 아님
 *       500:
 *         description: 서버 오류
 */
router.post("/", isAuth, async (req, res) => {
  const { name, workspace_id } = req.body;
  const userId = req.session.userId;

  // 트랜잭션을 위해 풀에서 클라이언트를 직접 가져옵니다.
  const client = await pool.connect();

  try {
    // 1. 권한 확인: 사용자가 해당 워크스페이스의 멤버인지 확인
    // (이 단계는 읽기 전용이므로 트랜잭션 밖에서 해도 무방하지만, 일관성을 위해 유지합니다)
    const authCheck = await client.query(
      "SELECT role_name FROM workspace_member WHERE workspace_id = $1 AND member_id = $2",
      [workspace_id, userId]
    );

    if (authCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "워크스페이스 멤버가 아닙니다." });
    }

    // --- 트랜잭션 시작 ---
    await client.query("BEGIN");

    // 2. 프로젝트 삽입
    const projectQuery = `
        INSERT INTO project (name, workspace_id)
        VALUES ($1, $2)
        RETURNING *;
    `;
    const projectResult = await client.query(projectQuery, [name, workspace_id]);
    const newProject = projectResult.rows[0];

    // 3. 프로젝트 멤버 등록 (생성자를 OWNER로 자동 추가)
    const memberQuery = `
        INSERT INTO project_member (project_id, member_id, role_name)
        VALUES ($1, $2, 'OWNER');
    `;
    await client.query(memberQuery, [newProject.id, userId]);

    // 모든 쿼리가 성공하면 확정
    await client.query("COMMIT");
    // --- 트랜잭션 종료 ---

    res.status(201).json({
      success: true,
      data: newProject,
    });
  } catch (error) {
    // 하나라도 실패하면 이전 상태로 되돌림
    await client.query("ROLLBACK");
    console.error("Project creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    // 연결 반환 (필수)
    client.release();
  }
});

/**
 * @swagger
 * /api/project/{projectId}:
 *   delete:
 *     summary: 프로젝트 삭제
 *     description: 프로젝트 삭제 (OWNER 전용, 기본 프로젝트 삭제 불가)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 프로젝트 삭제 성공
 *       403:
 *         description: 삭제 권한이 없음
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    // 1. 프로젝트 정보 및 권한 동시 확인
    // project_member 테이블에서 사용자의 역할을 확인하고, project 테이블에서 is_default 여부를 확인합니다.
    const projectCheck = await pool.query(
      `SELECT pm.role_name, p.is_default 
       FROM project p
       JOIN project_member pm ON p.id = pm.project_id
       WHERE p.id = $1 AND pm.member_id = $2`,
      [projectId, userId]
    );

    const target = projectCheck.rows[0];

    // 해당 프로젝트를 찾을 수 없거나 멤버가 아닌 경우
    if (!target) {
      return res.status(404).json({
        success: false,
        message: "프로젝트를 찾을 수 없거나 접근 권한이 없습니다.",
      });
    }

    // 권한 확인: 프로젝트 OWNER가 아닌 경우
    if (target.role_name !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "프로젝트 삭제 권한이 없습니다. (소유자만 가능)",
      });
    }

    // 💡 정책 확인: 회원가입 시 생성된 기본 프로젝트인 경우 삭제 불가
    if (target.is_default) {
      return res.status(403).json({
        success: false,
        message: "기본으로 제공되는 첫 번째 프로젝트는 삭제할 수 없습니다.",
      });
    }

    // 2. 프로젝트 삭제
    // DDL의 ON DELETE CASCADE 설정에 의해 관련 보드, 이슈, 멤버 관계가 자동 삭제됩니다.
    await pool.query("DELETE FROM project WHERE id = $1", [projectId]);

    res.json({
      success: true,
      message: "프로젝트가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Project 삭제 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류로 삭제에 실패했습니다." });
  }
});

/**
 * @route   GET /api/project/:projectId/boards
 * @desc    특정 프로젝트 내의 보드 목록 조회
 */
router.get("/:projectId/boards", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    // 프로젝트 멤버 권한 확인
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const boards = await pool.query(
      "SELECT * FROM board WHERE project_id = $1 AND is_active = 1 ORDER BY sort_order ASC, created_at DESC",
      [projectId]
    );

    res.json({ success: true, data: boards.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
