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
 * /api/project/{projectId}/member/{memberId}:
 *   delete:
 *     summary: 프로젝트 멤버 제거
 *     description: 프로젝트 멤버를 제거 (OWNER 전용)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 멤버 제거 성공
 *       403:
 *         description: 권한이 없음
 *       500:
 *         description: 서버 오류
 */
router.delete("/:projectId/member/:memberId", isAuth, async (req, res) => {
  const { projectId, memberId } = req.params;
  const userId = req.session.userId;

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "멤버 제거 권한이 없습니다." });
    }

    await pool.query(
      "DELETE FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, memberId]
    );

    res.json({ success: true, message: "멤버가 제거되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
/**
 * @swagger
 * /api/project/{projectId}:
 *   get:
 *     summary: 프로젝트 상세 조회
 *     description: 프로젝트의 상세 정보 조회
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
 *         description: 프로젝트 상세 조회 성공
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM project WHERE id = $1",
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "프로젝트를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/project/{projectId}:
 *   patch:
 *     summary: 프로젝트 수정
 *     description: 프로젝트의 정보 수정 (OWNER 전용)
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               img_url:
 *                 type: string
 *               theme_json:
 *                 type: object
 *     responses:
 *       200:
 *         description: 프로젝트 수정 성공
 *       403:
 *         description: 수정 권한이 없음
 *       404:
 *         description: 프로젝트를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.patch("/:projectId", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const { name, img_url, theme_json } = req.body;
  const userId = req.session.userId;

  try {
    // 권한 확인: 프로젝트 OWNER인지
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "프로젝트 수정 권한이 없습니다." });
    }

    // 프로젝트 정보 수정
    const result = await pool.query(
      `UPDATE project 
       SET name = COALESCE($1, name), img_url = COALESCE($2, img_url), theme_json = COALESCE($3, theme_json)
       WHERE id = $4 RETURNING *`,
      [name, img_url, theme_json, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "프로젝트를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

/**
 * @route   GET /api/project/:projectId/pages
 * @desc    특정 프로젝트의 페이지(위키) 트리 조회
 */
router.get("/:projectId/pages", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;

  try {
    // 프로젝트 멤버 검증
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const pagesRes = await pool.query(
      "SELECT * FROM page WHERE project_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [projectId]
    );

    const rows = pagesRes.rows;
    const map = {};
    rows.forEach((r) => (map[r.id] = { ...r, children: [] }));
    const roots = [];
    rows.forEach((r) => {
      if (r.parent_id) {
        if (map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
      } else {
        roots.push(map[r.id]);
      }
    });

    res.json({ success: true, data: roots });
  } catch (error) {
    console.error("pages error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/project/:projectId/pages/:pageId
 * @desc    특정 페이지 상세 조회
 */
router.get("/:projectId/pages/:pageId", isAuth, async (req, res) => {
  const { projectId, pageId } = req.params;
  const userId = req.session.userId;

  try {
    // 권한 확인
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const pageRes = await pool.query(
      "SELECT * FROM page WHERE id = $1 AND project_id = $2",
      [pageId, projectId]
    );

    if (pageRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "페이지를 찾을 수 없습니다." });
    }

    const page = pageRes.rows[0];
    const childrenRes = await pool.query(
      "SELECT * FROM page WHERE parent_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [page.id]
    );

    page.children = childrenRes.rows;

    res.json({ success: true, data: page });
  } catch (error) {
    console.error("page detail error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/project/:projectId/pages/:pageId
 * @desc    특정 페이지 수정
 */
router.patch("/:projectId/pages/:pageId", isAuth, async (req, res) => {
  const { projectId, pageId } = req.params;
  const userId = req.session.userId;
  const { title, content } = req.body;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const updateRes = await pool.query(
      `UPDATE page
       SET title = COALESCE($1, title), content = COALESCE($2, content)
       WHERE id = $3 AND project_id = $4
       RETURNING *`,
      [title, content, pageId, projectId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "페이지를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: updateRes.rows[0] });
  } catch (error) {
    console.error("update page error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/project/:projectId/pages/:pageId
 * @desc    특정 페이지 삭제 (페이지 OWNER 전용)
 */
router.delete("/:projectId/pages/:pageId", isAuth, async (req, res) => {
  const { projectId, pageId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT role_name FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, userId]
    );

    if (!memberCheck.rows[0] || memberCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "페이지 삭제 권한이 없습니다." });
    }

    await pool.query(
      "DELETE FROM page WHERE id = $1 AND project_id = $2",
      [pageId, projectId]
    );

    res.json({ success: true, message: "페이지가 삭제되었습니다." });
  } catch (error) {
    console.error("delete page error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/project/:projectId/pages/:pageId/members
 * @desc    페이지 권한 목록 조회
 */
router.get("/:projectId/pages/:pageId/members", isAuth, async (req, res) => {
  const { projectId, pageId } = req.params;
  const userId = req.session.userId;

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const result = await pool.query(
      `SELECT pm.id, m.id as member_id, m.name, m.email, pm.role_name
       FROM page_member pm
       JOIN member m ON pm.member_id = m.id
       WHERE pm.page_id = $1
       ORDER BY m.name ASC`,
      [pageId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("page members error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/project/:projectId/pages/:pageId/member
 * @desc    페이지 권한 부여 (OWNER 전용)
 */
router.post("/:projectId/pages/:pageId/member", isAuth, async (req, res) => {
  const { projectId, pageId } = req.params;
  const { member_id, role_name } = req.body;
  const userId = req.session.userId;

  if (!member_id || !role_name) {
    return res.status(400).json({ success: false, message: "member_id와 role_name이 필요합니다." });
  }

  try {
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "권한이 없습니다." });
    }

    await pool.query(
      "DELETE FROM page_member WHERE page_id = $1 AND member_id = $2",
      [pageId, member_id]
    );

    await pool.query(
      "INSERT INTO page_member (page_id, member_id, role_name) VALUES ($1, $2, $3)",
      [pageId, member_id, role_name]
    );

    res.status(201).json({ success: true, message: "권한이 저장되었습니다." });
  } catch (error) {
    console.error("page member add error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/project/:projectId/pages
 * @desc    특정 프로젝트에 페이지 생성
 */
router.post("/:projectId/pages", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;
  const { title, content, parent_id } = req.body;

  try {
    // 프로젝트 멤버 검증
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const insertRes = await pool.query(
      `INSERT INTO page (title, content, project_id, parent_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content || null, projectId, parent_id || null]
    );

    await pool.query(
      "INSERT INTO page_member (page_id, member_id, role_name) VALUES ($1, $2, 'OWNER')",
      [insertRes.rows[0].id, userId]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (error) {
    console.error("create page error", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/project/:projectId/pages/reorder
 * @desc    페이지 정렬 순서 변경 (동일 부모 내)
 */
router.post("/:projectId/pages/reorder", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.session.userId;
  const { parent_id = null, ordered_ids } = req.body;

  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return res.status(400).json({ success: false, message: "ordered_ids is required" });
  }

  const ids = ordered_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (ids.length !== ordered_ids.length) {
    return res.status(400).json({ success: false, message: "ordered_ids must be numbers" });
  }

  const client = await pool.connect();
  try {
    const memberCheck = await client.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: "접근 권한이 없습니다." });
    }

    const parentFilter = parent_id ? "parent_id = $2" : "parent_id IS NULL";
    const params = parent_id ? [projectId, parent_id, ids] : [projectId, ids];

    const checkRes = await client.query(
      `SELECT id FROM page WHERE project_id = $1 AND ${parentFilter} AND id = ANY($${parent_id ? 3 : 2})`,
      params
    );

    if (checkRes.rows.length !== ids.length) {
      return res.status(400).json({ success: false, message: "정렬 대상이 올바르지 않습니다." });
    }

    await client.query("BEGIN");
    for (let index = 0; index < ids.length; index += 1) {
      await client.query(
        "UPDATE page SET sort_order = $1 WHERE id = $2 AND project_id = $3",
        [index, ids[index], projectId]
      );
    }
    await client.query("COMMIT");

    res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("page reorder error", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/project/{projectId}/members:
 *   get:
 *     summary: 프로젝트 멤버 목록
 *     description: 프로젝트에 속한 멤버 목록 조회
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
 *         description: 멤버 목록 조회 성공
 *       500:
 *         description: 서버 오류
 */
router.get("/:projectId/members", isAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    const query = `
      SELECT m.id, m.name, m.email, pm.role_name
      FROM project_member pm
      JOIN member m ON pm.member_id = m.id
      WHERE pm.project_id = $1
      ORDER BY m.name ASC
    `;
    const result = await pool.query(query, [projectId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /api/project/{projectId}/member:
 *   post:
 *     summary: 프로젝트 멤버 추가
 *     description: 워크스페이스 멤버를 프로젝트 멤버로 추가
 *     tags:
 *       - Project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               member_id:
 *                 type: integer
 *               role_name:
 *                 type: string
 *                 default: MEMBER
 *             required:
 *               - member_id
 *     responses:
 *       201:
 *         description: 멤버 추가 성공
 *       403:
 *         description: 권한이 없음
 *       500:
 *         description: 서버 오류
 */
router.post("/:projectId/member", isAuth, async (req, res) => {
  const { projectId } = req.params;
  const { member_id, role_name = "MEMBER" } = req.body;
  const userId = req.session.userId;

  try {
    // 1. 권한 확인: 현재 사용자가 프로젝트 OWNER인지
    const authCheck = await pool.query(
      "SELECT role_name FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (!authCheck.rows[0] || authCheck.rows[0].role_name !== "OWNER") {
      return res.status(403).json({ success: false, message: "멤버 추가 권한이 없습니다." });
    }

    // 2. 이미 프로젝트 멤버인지 확인
    const duplicateCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, member_id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "이미 프로젝트 멤버입니다.",
      });
    }

    // 3. 멤버 추가
    await pool.query(
      "INSERT INTO project_member (project_id, member_id, role_name) VALUES ($1, $2, $3)",
      [projectId, member_id, role_name]
    );

    res.status(201).json({ success: true, message: "멤버가 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
