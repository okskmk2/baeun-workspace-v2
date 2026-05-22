import express from "express";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";
import {
  buildAssistantPrompt,
  detectDetailRequest,
  detectIntent,
  extractReferencedResourceFromHistory,
  normalizeHistory,
  resolveAutoDetailTargets,
  toPositiveInt,
} from "../utils/assistantChat.util.mjs";
import {
  DEFAULT_MODEL,
  MAX_IMPORT_ROWS,
  classifyActionIntentWithModel,
  classifyUserRequestWithModel,
  consumeWikiToDataPreviewCache,
  detectExecutionConfirm,
  detectWikiToDataIntent,
  ensureProjectMember,
  extractPageIdFromConversation,
  extractTableNameHint,
  generateContentWithRetry,
  getAiClient,
  getPageDetail,
  getProjectContextByIntent,
  getTaskDetail,
  hasPendingWikiToDataPreview,
  isQuotaExceededError,
  isTemporaryUpstreamError,
  parseRetryAfterSeconds,
  resolveActionPageId,
  runWikiToDataAction,
  setWikiToDataPreviewCache,
  shouldRunClassifier,
} from "../utils/assistantRoute.util.mjs";

const router = express.Router();
const MAX_MESSAGE_LENGTH = 8000;
router.post("/actions/wiki-to-data", isAuth, async (req, res) => {
  const userId = req.session?.userId;
  const projectId = toPositiveInt(req.body?.project_id);
  const pageId = toPositiveInt(req.body?.page_id);
  const tableNameInput = String(req.body?.table_name || "").trim();
  const dryRun = req.body?.dry_run !== false;
  const requestedMaxRows = Number(req.body?.max_rows);
  const actionModel = String(req.body?.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const actionAi = getAiClient();
  const maxRows = Number.isFinite(requestedMaxRows)
    ? Math.max(1, Math.min(MAX_IMPORT_ROWS, Math.trunc(requestedMaxRows)))
    : 200;

  if (!projectId || !pageId) {
    return res.status(400).json({
      name: "BadRequest",
      message: "project_id와 page_id가 필요합니다.",
    });
  }

  try {
    const result = await runWikiToDataAction({
      userId,
      projectId,
      pageId,
      tableNameInput,
      dryRun,
      maxRows,
      ai: actionAi,
      model: actionModel,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({
        name: error.name || "RequestError",
        message: error.message,
      });
    }

    if (isTemporaryUpstreamError(error)) {
      const retryAfterSeconds = parseRetryAfterSeconds(error);
      return res.status(503).json({
        name: "UpstreamTemporaryError",
        error_code: "ASSISTANT_UPSTREAM_TEMPORARY",
        message: "AI provider temporary error",
        retry_after_seconds: retryAfterSeconds,
      });
    }

    if (error?.code === "23505") {
      return res.status(409).json({
        name: "Conflict",
        message: "같은 이름의 데이터 테이블이 이미 존재합니다.",
      });
    }

    logger.error("assistant wiki-to-data action error", {
      err: error?.message,
      stack: error?.stack,
      user_id: userId || null,
      project_id: projectId || null,
      page_id: pageId || null,
    });

    return res.status(500).json({
      name: "InternalServerError",
      message: "위키 기반 데이터 적재 중 오류가 발생했습니다.",
    });
  }
});


router.post("/chat", isAuth, async (req, res) => {
  const message = String(req.body?.message || req.body?.contents || "").trim();
  const model = String(req.body?.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const projectId = toPositiveInt(req.body?.project_id);
  const requestedAction = req.body?.action && typeof req.body.action === "object" ? req.body.action : null;
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

  try {
    let prompt = message;
    let ai = null;
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

      ai = getAiClient();
      let actionClassifier = null;
      if (ai) {
        try {
          actionClassifier = await classifyActionIntentWithModel({
            ai,
            model,
            message,
            history,
            locale: project.locale,
          });
        } catch (error) {
          logger.warn("assistant action classifier fallback", {
            err: error?.message,
            model,
            user_id: req.session?.userId || null,
          });
        }
      }

      const actionIntentRequested =
        actionClassifier?.action === "wiki_to_data" || detectWikiToDataIntent(message, history);
      const actionConfirmRequested =
        requestedAction?.confirm === true ||
        actionClassifier?.confirmExecution === true ||
        detectExecutionConfirm(message);
      const hasPendingPreview = hasPendingWikiToDataPreview(history);

      if (actionIntentRequested || (actionConfirmRequested && hasPendingPreview)) {
        const explicitPageId =
          toPositiveInt(requestedAction?.page_id) || actionClassifier?.pageId || extractPageIdFromConversation(message, history);
        const pageId = await resolveActionPageId({
          projectId,
          message,
          history,
          preferredPageId: explicitPageId,
          allowHistoryFallback: actionConfirmRequested && hasPendingPreview,
        });
        if (!pageId) {
          return res.json({
            model: "assistant-action",
            text: "위키 페이지를 특정해야 데이터 적재를 진행할 수 있습니다. 위키 링크(`/project/{projectId}/wiki/{pageId}`)나 페이지 ID를 포함해 다시 요청해 주세요.",
            project_id: projectId,
            metadata: {
              intent: "action_wiki_to_data",
              action_name: "wiki_to_data",
              action_status: "needs_input",
              required_input: "page_id",
            },
          });
        }

        const confirmExecution = actionConfirmRequested;
        const tableNameInput =
          String(requestedAction?.table_name || "").trim() ||
          String(actionClassifier?.tableName || "").trim() ||
          extractTableNameHint(message);
        const cachedExtraction = confirmExecution
          ? consumeWikiToDataPreviewCache({
              key: requestedAction?.preview_key,
              userId: req.session.userId,
              projectId,
              pageId,
            })
          : null;
        const actionResult = await runWikiToDataAction({
          userId: req.session.userId,
          projectId,
          pageId,
          tableNameInput,
          dryRun: !confirmExecution,
          maxRows: 200,
          ai,
          model,
          preExtracted: cachedExtraction,
        });

        if (actionResult.body?.dry_run) {
          const preview = actionResult.body.preview || {};
          const tableName = String(preview?.inferred_schema?.table_name || "").trim();
          const rowCount = Number(preview?.row_count) || 0;
          const columnCount = Array.isArray(preview?.inferred_schema?.columns)
            ? preview.inferred_schema.columns.length
            : 0;
          const previewKey = actionResult?.cacheable
            ? setWikiToDataPreviewCache({
                userId: req.session.userId,
                projectId,
                pageId,
                data: actionResult.cacheable,
              })
            : null;

          return res.json({
            model: "assistant-action",
            text: [
              `위키 [${preview?.source?.page_title || `#${pageId}`}](\/project\/${projectId}\/wiki\/${pageId})에서 표를 읽어 데이터 테이블 생성 미리보기를 준비했습니다.`,
              `- 테이블명: ${tableName || "(자동 생성)"}`,
              `- 컬럼 수: ${columnCount}`,
              `- 적재 예정 행 수: ${rowCount}`,
              "실행하려면 '실행해' 또는 '진행해'라고 답변해 주세요.",
            ].join("\n"),
            project_id: projectId,
            metadata: {
              intent: "action_wiki_to_data",
              action_name: "wiki_to_data",
              action_status: "preview",
              preview: actionResult.body.preview,
              preview_key: previewKey,
            },
          });
        }

        const tableId = Number(actionResult.body?.table?.id) || null;
        const tableLink = tableId ? `/project/${projectId}/data/${tableId}/list` : `/project/${projectId}/data`;

        return res.json({
          model: "assistant-action",
          text: [
            `요청한 위키 페이지에서 데이터를 읽어 테이블 생성 및 적재를 완료했습니다.`,
            `- 테이블: [${actionResult.body?.table?.name || "새 테이블"}](${tableLink})`,
            `- 적재 행 수: ${Number(actionResult.body?.imported?.rows) || 0}`,
            `- 컬럼 수: ${Number(actionResult.body?.imported?.columns) || 0}`,
          ].join("\n"),
          project_id: projectId,
          metadata: {
            intent: "action_wiki_to_data",
            action_name: "wiki_to_data",
            action_status: "completed",
            table_id: tableId,
            imported: actionResult.body?.imported || null,
          },
        });
      }

      if (!ai) {
        return res.status(500).json({
          name: "ConfigurationError",
          message: "GOOGLE_AI_API_KEY is not configured",
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
        history,
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

    if (!ai) {
      ai = getAiClient();
      if (!ai) {
        return res.status(500).json({
          name: "ConfigurationError",
          message: "GOOGLE_AI_API_KEY is not configured",
        });
      }
    }

    const response = await generateContentWithRetry({
      ai,
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

    if (isTemporaryUpstreamError(error)) {
      const retryAfterSeconds = parseRetryAfterSeconds(error);
      return res.status(503).json({
        name: "UpstreamTemporaryError",
        error_code: "ASSISTANT_UPSTREAM_TEMPORARY",
        message: "AI provider temporary error",
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
