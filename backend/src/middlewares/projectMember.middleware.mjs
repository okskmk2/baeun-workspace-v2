import pool from "../db.mjs";
import logger from "../logger.mjs";

export const resolveProjectIdFromRequest = (req, res, next) => {
  const projectId = req.query.project_id ?? req.body?.project_id;
  if (!projectId) {
    return res.status(400).json({ name: "BadRequest", message: "project_id is required" });
  }
  req.projectId = projectId;
  next();
};

export const resolveProjectIdFromPageId = async (req, res, next) => {
  const { pageId } = req.params;

  try {
    const pageRes = await pool.query("SELECT project_id FROM page WHERE id = $1", [pageId]);
    const projectId = pageRes.rows[0]?.project_id || null;

    if (!projectId) {
      return res.status(404).json({ name: "NotFound", message: "페이지를 찾을 수 없습니다." });
    }

    req.projectId = projectId;
    next();
  } catch (error) {
    logger.error("resolve project by page error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
};

export const resolveProjectIdFromOrderedPages = async (req, res, next) => {
  const { parent_id = null, ordered_ids } = req.body;

  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return res.status(400).json({ name: "BadRequest", message: "ordered_ids is required" });
  }

  const ids = ordered_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (ids.length !== ordered_ids.length) {
    return res.status(400).json({ name: "BadRequest", message: "ordered_ids must be numbers" });
  }

  try {
    const projectsRes = await pool.query("SELECT DISTINCT project_id FROM page WHERE id = ANY($1)", [ids]);

    if (projectsRes.rows.length !== 1) {
      return res.status(400).json({ name: "BadRequest", message: "정렬 대상이 올바르지 않습니다." });
    }

    const projectId = projectsRes.rows[0].project_id;

    if (parent_id != null) {
      const parentRes = await pool.query("SELECT project_id FROM page WHERE id = $1", [parent_id]);
      if (parentRes.rows.length === 0 || String(parentRes.rows[0].project_id) !== String(projectId)) {
        return res.status(400).json({ name: "BadRequest", message: "정렬 대상이 올바르지 않습니다." });
      }
    }

    req.projectId = projectId;
    req.orderedPageIds = ids;
    req.parentId = parent_id;

    next();
  } catch (error) {
    logger.error("resolve project by ordered pages error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
};

export const requireProjectMember = async (req, res, next) => {
  const projectId = req.projectId;
  const userId = req.session.userId;

  if (!projectId) {
    return res.status(500).json({
      name: "InternalServerError",
      message: "projectId is not resolved before membership check",
    });
  }

  try {
    const memberCheck = await pool.query(
      "SELECT id FROM project_member WHERE project_id = $1 AND member_id = $2",
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ name: "Forbidden", message: "접근 권한이 없습니다." });
    }

    next();
  } catch (error) {
    logger.error("project member auth error", {
      err: error?.message,
      stack: error?.stack,
    });
    res.status(500).json({ name: "InternalServerError", message: error.message });
  }
};
