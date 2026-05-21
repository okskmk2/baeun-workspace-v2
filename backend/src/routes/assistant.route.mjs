import express from "express";
import { GoogleGenAI } from "@google/genai";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";
import pool from "../db.mjs";
import {
  buildAssistantPrompt,
  detectDetailRequest,
  detectIntent,
  extractReferencedResourceFromHistory,
  normalizeHistory,
  resolveAutoDetailTargets,
  resolveContextNeeds,
  toPositiveInt,
} from "../utils/assistantChat.util.mjs";

const router = express.Router();
const DEFAULT_MODEL = "gemini-3.5-flash";
const MAX_MESSAGE_LENGTH = 8000;
const MAX_CONTEXT_ITEMS = 6;
const CONTEXT_CACHE_TTL_MINUTES = 5;
const INTENT_VALUES = new Set(["general", "overview", "pages", "tasks", "channels"]);
const CLASSIFIER_MAX_HISTORY_ITEMS = 2;
const CLASSIFIER_MAX_HISTORY_TEXT_CHARS = 120;
const CLASSIFIER_MAX_MESSAGE_CHARS = 220;

const getAiClient = () => {
  const apiKey = String(process.env.GOOGLE_AI_API_KEY || "").trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const extractJsonObject = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  return "";
};

const normalizeClassifierResult = (parsed) => {
  const rawIntent = String(parsed?.intent || "general").toLowerCase();
  const intent = INTENT_VALUES.has(rawIntent) ? rawIntent : "general";

  return {
    intent,
    wantsDetail: parsed?.wants_detail === true,
    followUpDetail: parsed?.follow_up_detail === true,
    needsRefetch: parsed?.needs_refetch === true,
    mentionsPage: parsed?.mentions_page === true,
    mentionsTask: parsed?.mentions_task === true,
    targetHint: String(parsed?.target_hint || "").trim(),
  };
};

const classifyUserRequestWithModel = async ({ ai, model, message, history, locale }) => {
  const compact = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

  const historyForClassifier = Array.isArray(history)
    ? history.slice(-CLASSIFIER_MAX_HISTORY_ITEMS).map((item) => ({
        r: String(item.role || "").slice(0, 1),
        t: compact(item.text, CLASSIFIER_MAX_HISTORY_TEXT_CHARS),
      }))
    : [];

  const compactMessage = compact(message, CLASSIFIER_MAX_MESSAGE_CHARS);

  const instruction = [
    "Classify request routing. Return JSON only.",
    '{"intent":"general|overview|pages|tasks|channels","wants_detail":boolean,"follow_up_detail":boolean,"needs_refetch":boolean,"mentions_page":boolean,"mentions_task":boolean,"target_hint":string}',
    "Keep target_hint short. Empty if unknown.",
    `locale=${String(locale || "").toLowerCase() || "unknown"}`,
    `history=${JSON.stringify(historyForClassifier)}`,
    `message=${JSON.stringify(compactMessage)}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: instruction,
  });

  const jsonText = extractJsonObject(response?.text);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    return normalizeClassifierResult(parsed);
  } catch {
    return null;
  }
};

const shouldRunClassifier = ({ fallbackIntent, fallbackDetailRequest }) => {
  if (fallbackDetailRequest.pageId || fallbackDetailRequest.taskId) return false;

  // Run classifier only when rule-based routing is ambiguous or follow-up style.
  if (fallbackIntent === "general") return true;
  if (fallbackDetailRequest.followUpDetail) return true;
  if (fallbackDetailRequest.needsRefetch) return true;

  return false;
};

const parseRetryAfterSeconds = (error) => {
  const retryInfo = error?.error?.details?.find(
    (detail) => detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  );
  const retryDelay = String(retryInfo?.retryDelay || "");
  const match = retryDelay.match(/(\d+)/);
  if (match) return Number(match[1]);

  const message = String(error?.message || "");
  const messageMatch = message.match(/retry in\s+([\d.]+)s/i);
  if (!messageMatch) return null;
  return Math.max(1, Math.ceil(Number(messageMatch[1])));
};

const isQuotaExceededError = (error) => {
  const statusCode = Number(error?.status) || Number(error?.error?.code) || 0;
  const statusText = String(error?.error?.status || "").toUpperCase();
  const message = String(error?.message || "");
  return (
    statusCode === 429 ||
    statusText === "RESOURCE_EXHAUSTED" ||
    /quota exceeded|resource_exhausted/i.test(message)
  );
};


const ensureProjectMember = async (projectId, userId) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.summary, p.workspace_id, pm.role_name, m.locale
       FROM project p
       JOIN project_member pm ON pm.project_id = p.id AND pm.member_id = $2
       JOIN member m ON m.id = $2
      WHERE p.id = $1`,
    [projectId, userId]
  );

  return result.rows[0] || null;
};

const getCachedProjectContext = async ({ projectId, intent }) => {
  try {
    const result = await pool.query(
      `SELECT context_json, expires_at
         FROM assistant_project_context_cache
        WHERE project_id = $1
          AND intent = $2
          AND expires_at > NOW()`,
      [projectId, intent]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      context: row.context_json || {},
      expiresAt: row.expires_at,
      cacheHit: true,
    };
  } catch (error) {
    if (error?.code === "42P01") {
      return null;
    }
    throw error;
  }
};

const saveProjectContextCache = async ({ projectId, intent, context }) => {
  try {
    await pool.query(
      `INSERT INTO assistant_project_context_cache
         (project_id, intent, context_json, used_tools, evidence_count, expires_at, updated_at)
       VALUES
         ($1, $2, $3::jsonb, '[]'::jsonb, 0, NOW() + ($4::text || ' minutes')::interval, NOW())
       ON CONFLICT (project_id, intent)
       DO UPDATE SET
         context_json = EXCLUDED.context_json,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        projectId,
        intent,
        JSON.stringify(context),
        CONTEXT_CACHE_TTL_MINUTES,
      ]
    );
  } catch (error) {
    if (error?.code !== "42P01") {
      throw error;
    }
  }
};

const getProjectOverview = async (projectId) => {
  const overviewRes = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM project_member WHERE project_id = $1) AS member_count,
       (SELECT COUNT(*)::int FROM kanban WHERE project_id = $1 AND is_active = true) AS kanban_count,
       (SELECT COUNT(*)::int FROM task t JOIN kanban k ON k.id = t.kanban_id WHERE k.project_id = $1) AS task_count,
       (SELECT COUNT(*)::int FROM page WHERE project_id = $1) AS page_count,
       (SELECT COUNT(*)::int FROM channel WHERE project_id = $1 AND status = 'ACTIVE') AS channel_count`,
    [projectId]
  );

  return (
    overviewRes.rows[0] || {
      member_count: 0,
      kanban_count: 0,
      task_count: 0,
      page_count: 0,
      channel_count: 0,
    }
  );
};

const getTaskSummaries = async (projectId) => {
  const tasksRes = await pool.query(
    `SELECT
       t.id,
       t.title,
       t.status,
       t.priority,
       t.due_date,
       t.updated_at,
       k.id AS kanban_id,
       k.name AS kanban_name,
       COALESCE(
         jsonb_agg(
           DISTINCT jsonb_build_object(
             'id', tm.member_id,
             'name', m.name,
             'role', tm.role_name
           )
         ) FILTER (WHERE tm.member_id IS NOT NULL),
         '[]'::jsonb
       ) AS related_members
     FROM task t
     JOIN kanban k ON k.id = t.kanban_id
     LEFT JOIN task_member tm ON tm.task_id = t.id
     LEFT JOIN member m ON m.id = tm.member_id
    WHERE k.project_id = $1
    GROUP BY t.id, t.title, t.status, t.priority, t.due_date, t.updated_at, k.id, k.name
    ORDER BY t.updated_at DESC, t.id DESC`,
    [projectId]
  );

  return tasksRes.rows || [];
};

const getPageSummaries = async (projectId) => {
  const pagesRes = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.created_at,
       p.updated_at,
       COALESCE(owner.name, '') AS author_name
     FROM page p
     LEFT JOIN LATERAL (
       SELECT m.name
         FROM page_member pm
         JOIN member m ON m.id = pm.member_id
        WHERE pm.page_id = p.id
          AND pm.role_name = 'OWNER'
        ORDER BY pm.created_at ASC, pm.id ASC
        LIMIT 1
     ) owner ON true
    WHERE p.project_id = $1
    ORDER BY p.updated_at DESC, p.id DESC`,
    [projectId]
  );

  return pagesRes.rows || [];
};

const getPageDetail = async (projectId, pageId) => {
  if (!Number.isInteger(pageId) || pageId <= 0) return null;

  const result = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.content,
       p.created_at,
       p.updated_at,
       COALESCE(owner.name, '') AS author_name
     FROM page p
     LEFT JOIN LATERAL (
       SELECT m.name
         FROM page_member pm
         JOIN member m ON m.id = pm.member_id
        WHERE pm.page_id = p.id
          AND pm.role_name = 'OWNER'
        ORDER BY pm.created_at ASC, pm.id ASC
        LIMIT 1
     ) owner ON true
    WHERE p.project_id = $1
      AND p.id = $2`,
    [projectId, pageId]
  );

  return result.rows[0] || null;
};

const getTaskDetail = async (projectId, taskId) => {
  if (!Number.isInteger(taskId) || taskId <= 0) return null;

  const result = await pool.query(
    `SELECT
       t.id,
       t.title,
       t.content,
       t.status,
       t.priority,
       t.due_date,
       t.updated_at,
       k.id AS kanban_id,
       k.name AS kanban_name,
       COALESCE(
         jsonb_agg(
           DISTINCT jsonb_build_object(
             'id', tm.member_id,
             'name', m.name,
             'role', tm.role_name
           )
         ) FILTER (WHERE tm.member_id IS NOT NULL),
         '[]'::jsonb
       ) AS related_members
     FROM task t
     JOIN kanban k ON k.id = t.kanban_id
     LEFT JOIN task_member tm ON tm.task_id = t.id
     LEFT JOIN member m ON m.id = tm.member_id
    WHERE k.project_id = $1
      AND t.id = $2
    GROUP BY t.id, t.title, t.content, t.status, t.priority, t.due_date, t.updated_at, k.id, k.name`,
    [projectId, taskId]
  );

  return result.rows[0] || null;
};

const getActiveChannels = async (projectId, limit = MAX_CONTEXT_ITEMS) => {
  const channelsRes = await pool.query(
    `SELECT c.id, c.name, c.type, c.scope,
            MAX(m.created_at) AS last_message_at,
            COUNT(m.id)::int AS message_count
       FROM channel c
       LEFT JOIN message m ON m.channel_id = c.id
      WHERE c.project_id = $1
        AND c.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.type, c.scope
      ORDER BY last_message_at DESC NULLS LAST, c.id DESC
      LIMIT $2`,
    [projectId, limit]
  );

  return channelsRes.rows || [];
};

const getProjectContextSnapshot = async (projectId, intent) => {
  const cached = await getCachedProjectContext({ projectId, intent });
  if (cached) {
    return cached;
  }

  const { includeTasks, includePages, includeChannels } = resolveContextNeeds(intent);

  const [overview, tasks, pages, channels] = await Promise.all([
    getProjectOverview(projectId),
    includeTasks ? getTaskSummaries(projectId) : Promise.resolve([]),
    includePages ? getPageSummaries(projectId) : Promise.resolve([]),
    includeChannels ? getActiveChannels(projectId, MAX_CONTEXT_ITEMS) : Promise.resolve([]),
  ]);

  const context = {
    overview,
    tasks,
    pages,
    channels,
  };

  const result = {
    context,
    expiresAt: new Date(Date.now() + CONTEXT_CACHE_TTL_MINUTES * 60 * 1000).toISOString(),
    cacheHit: false,
  };

  await saveProjectContextCache({
    projectId,
    intent,
    context,
  });

  return result;
};

const getProjectContextByIntent = async ({ projectId, intent }) => {
  const snapshot = await getProjectContextSnapshot(projectId, intent);
  const source = snapshot.context || {
    overview: {},
    tasks: [],
    pages: [],
    channels: [],
  };

  const context = {
    overview: source.overview,
    tasks: [],
    pages: [],
    channels: [],
  };
  const usedTools = ["project_overview"];

  if (["tasks", "general"].includes(intent)) {
    context.tasks = Array.isArray(source.tasks) ? source.tasks : [];
    usedTools.push("recent_tasks");
  }

  if (["pages", "general"].includes(intent)) {
    context.pages = Array.isArray(source.pages) ? source.pages : [];
    usedTools.push("recent_pages");
  }

  if (["channels", "general"].includes(intent)) {
    context.channels = Array.isArray(source.channels) ? source.channels : [];
    usedTools.push("active_channels");
  }

  return {
    context,
    usedTools,
    evidenceCount: context.tasks.length + context.pages.length + context.channels.length,
    expiresAt: snapshot.expiresAt,
    cacheHit: snapshot.cacheHit,
  };
};


router.post("/chat", isAuth, async (req, res) => {
  const message = String(req.body?.message || req.body?.contents || "").trim();
  const model = String(req.body?.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const projectId = toPositiveInt(req.body?.project_id);
  const history = normalizeHistory(req.body?.history);
  const fallbackDetailRequest = detectDetailRequest(message);

  if (!message) {
    return res.status(400).json({
      name: "BadRequest",
      message: "message is required",
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      name: "BadRequest",
      message: `message is too long (max: ${MAX_MESSAGE_LENGTH})`,
    });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(500).json({
      name: "ConfigurationError",
      message: "GOOGLE_AI_API_KEY is not configured",
    });
  }

  try {
    let prompt = message;
    let metadata = {
      intent: "general",
      used_tools: [],
      evidence_count: 0,
      history_used: history.length,
    };

    if (projectId) {
      const project = await ensureProjectMember(projectId, req.session.userId);
      if (!project) {
        return res.status(403).json({
          name: "Forbidden",
          message: "프로젝트 접근 권한이 없습니다.",
        });
      }

      const fallbackIntent = detectIntent(message);
      let classifier = null;
      const runClassifier = shouldRunClassifier({
        fallbackIntent,
        fallbackDetailRequest,
      });

      if (runClassifier) {
        try {
          classifier = await classifyUserRequestWithModel({
            ai,
            model,
            message,
            history,
            locale: project.locale,
          });
        } catch (error) {
          logger.warn("assistant classifier fallback", {
            err: error?.message,
            model,
            user_id: req.session?.userId || null,
          });
        }
      }

      const intent = classifier?.intent || fallbackIntent;
      const detailRequest = {
        wantsDetail: Boolean(classifier?.wantsDetail || fallbackDetailRequest.wantsDetail),
        followUpDetail: Boolean(classifier?.followUpDetail || fallbackDetailRequest.followUpDetail),
        needsRefetch: Boolean(classifier?.needsRefetch || fallbackDetailRequest.needsRefetch),
        mentionsPage: Boolean(classifier?.mentionsPage || fallbackDetailRequest.mentionsPage),
        mentionsTask: Boolean(classifier?.mentionsTask || fallbackDetailRequest.mentionsTask),
        pageId: fallbackDetailRequest.pageId,
        taskId: fallbackDetailRequest.taskId,
      };

      const projectContext = await getProjectContextByIntent({
        projectId,
        intent,
      });

      const historyRef = extractReferencedResourceFromHistory(history);
      const resolvedTargets = resolveAutoDetailTargets({
        message: classifier?.targetHint || message,
        intent,
        detailRequest,
        historyRef,
        pageSummaries: projectContext.context?.pages || [],
        taskSummaries: projectContext.context?.tasks || [],
      });

      const detail = {
        page: resolvedTargets.pageId ? await getPageDetail(projectId, resolvedTargets.pageId) : null,
        task: resolvedTargets.taskId ? await getTaskDetail(projectId, resolvedTargets.taskId) : null,
      };

      const contextData = {
        ...projectContext.context,
        detail,
      };

      prompt = buildAssistantPrompt({
        message,
        history,
        project,
        contextData,
        intent,
        locale: project.locale,
      });

      metadata = {
        intent,
        used_tools: projectContext.usedTools,
        evidence_count: projectContext.evidenceCount,
        history_used: history.length,
        context_cache_hit: Boolean(projectContext.cacheHit),
        context_expires_at: projectContext.expiresAt || null,
        detail_fetched: Boolean(detail.page || detail.task),
        detail_ref_source: resolvedTargets.source,
        detail_refetch_requested: Boolean(detailRequest.needsRefetch),
        classifier_used: Boolean(classifier),
        classifier_skipped: !runClassifier,
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = String(response?.text || "").trim();

    res.json({
      model,
      text,
      project_id: projectId,
      metadata,
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      const retryAfterSeconds = parseRetryAfterSeconds(error);
      return res.status(429).json({
        name: "QuotaExceeded",
        error_code: "ASSISTANT_QUOTA_EXCEEDED",
        message: "AI quota exceeded",
        retry_after_seconds: retryAfterSeconds,
      });
    }

    logger.error("assistant chat generate error", {
      err: error?.message,
      stack: error?.stack,
      model,
      user_id: req.session?.userId || null,
    });

    res.status(500).json({
      name: "AiGenerationError",
      error_code: "ASSISTANT_GENERATION_FAILED",
      message: "Failed to generate AI response",
    });
  }
});

export default router;
