import express from "express";
import { randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { isAuth } from "../middlewares/auth.middleware.mjs";
import logger from "../logger.mjs";
import pool from "../db.mjs";
import { broadcastToUsers } from "../ws.mjs";
import {
  buildAssistantPrompt,
  detectDetailRequest,
  detectIntent,
  extractReferencedResourceFromHistory,
  findBestSummaryId,
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
const TABLE_NAME_MAX_LENGTH = 60;
const MAX_EXTRACTION_CONTENT_CHARS = 32000;
const EXTRACTION_CHUNK_TARGET_CHARS = 12000;
const EXTRACTION_CHUNK_OVERLAP_CHARS = 1200;
const MAX_EXTRACTION_CHUNKS = 8;
const EXTRACTION_AI_RETRY_ATTEMPTS = 2;
const EXTRACTION_MAX_OUTPUT_TOKENS = 8192;
const WIKI_TO_DATA_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
const AI_RETRY_ATTEMPTS = 3;
const AI_RETRY_BASE_DELAY_MS = 1200;
const ACTION_CLASSIFIER_MAX_HISTORY_ITEMS = 4;
const ACTION_CLASSIFIER_MAX_HISTORY_TEXT_CHARS = 180;
const ACTION_CLASSIFIER_MAX_MESSAGE_CHARS = 260;
const MAX_IMPORT_ROWS = 500;
const DATA_COLUMN_TYPES = new Set(["TEXT", "NUMBER", "DATE", "SELECT"]);
const WIKI_TO_DATA_CONFIRM_KEYWORDS = [
  "실행",
  "진행",
  "확정",
  "생성해",
  "적재해",
  "가져와",
  "go ahead",
  "confirm",
  "yes",
  "run it",
];
const WIKI_TO_DATA_EXECUTION_KEYWORDS = [
  "데이터 메뉴",
  "data menu",
  "테이블",
  "table",
  "컬럼",
  "행",
  "레코드",
  "schema",
  "적재",
  "import",
  "insert",
  "생성",
  "만들",
  "채워",
  "넣어",
  "구축",
];
const WIKI_TO_DATA_PENDING_HINTS = [
  "실행하려면 '실행해'",
  "실행하려면 \"실행해\"",
  "실행하려면",
  "테이블 생성 미리보기",
  "적재 예정 행 수",
  "action_status: preview",
];
const wikiToDataPreviewCache = new Map();

const cleanupWikiToDataPreviewCache = () => {
  const now = Date.now();
  for (const [key, value] of wikiToDataPreviewCache.entries()) {
    if (!value || Number(value.expiresAt) <= now) {
      wikiToDataPreviewCache.delete(key);
    }
  }
};

const setWikiToDataPreviewCache = ({ userId, projectId, pageId, data }) => {
  cleanupWikiToDataPreviewCache();
  const key = randomUUID();
  wikiToDataPreviewCache.set(key, {
    userId: Number(userId) || null,
    projectId: Number(projectId) || null,
    pageId: Number(pageId) || null,
    data,
    expiresAt: Date.now() + WIKI_TO_DATA_PREVIEW_CACHE_TTL_MS,
  });
  return key;
};

const consumeWikiToDataPreviewCache = ({ key, userId, projectId, pageId }) => {
  cleanupWikiToDataPreviewCache();
  const item = wikiToDataPreviewCache.get(String(key || ""));
  if (!item) return null;

  const matched =
    Number(item.userId) === Number(userId) &&
    Number(item.projectId) === Number(projectId) &&
    Number(item.pageId) === Number(pageId);
  if (!matched) return null;

  wikiToDataPreviewCache.delete(String(key));
  return item.data || null;
};

const emitAssistantProgress = ({ userId, projectId, stage, message, progress = null, extra = {} }) => {
  if (!userId) return;
  broadcastToUsers([userId], {
    type: "assistant_progress",
    data: {
      action: "wiki_to_data",
      project_id: Number(projectId) || null,
      stage: String(stage || ""),
      message: String(message || ""),
      progress: Number.isFinite(Number(progress)) ? Number(progress) : null,
      timestamp: new Date().toISOString(),
      ...extra,
    },
  });
};

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

const normalizeActionClassifierResult = (parsed) => {
  const rawAction = String(parsed?.action || "none").toLowerCase();
  const action = rawAction === "wiki_to_data" ? "wiki_to_data" : "none";
  const pageId = toPositiveInt(parsed?.page_id);
  const confidenceNum = Number(parsed?.confidence);
  const confidence = Number.isFinite(confidenceNum)
    ? Math.max(0, Math.min(1, confidenceNum))
    : null;

  return {
    action,
    confirmExecution: parsed?.confirm_execution === true,
    pageId,
    tableName: String(parsed?.table_name || "").trim(),
    confidence,
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

  const response = await generateContentWithRetry({
    ai,
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

const classifyActionIntentWithModel = async ({ ai, model, message, history, locale }) => {
  const compact = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

  const historyForClassifier = Array.isArray(history)
    ? history.slice(-ACTION_CLASSIFIER_MAX_HISTORY_ITEMS).map((item) => ({
        role: String(item.role || "").slice(0, 1),
        text: compact(item.text, ACTION_CLASSIFIER_MAX_HISTORY_TEXT_CHARS),
      }))
    : [];

  const compactMessage = compact(message, ACTION_CLASSIFIER_MAX_MESSAGE_CHARS);
  const instruction = [
    "Decide whether user requests wiki-to-data execution in this turn.",
    "Return JSON only.",
    '{"action":"none|wiki_to_data","confirm_execution":boolean,"page_id":number|null,"table_name":string,"confidence":number}',
    "Set action=wiki_to_data only when user clearly asks to create/fill Data table from wiki content.",
    "Set confirm_execution=true only when user is explicitly approving execution after preview (e.g., run it/진행해/실행해).",
    "If page id is unknown, set page_id to null.",
    "If table name is unknown, set table_name to empty string.",
    `locale=${String(locale || "").toLowerCase() || "unknown"}`,
    `history=${JSON.stringify(historyForClassifier)}`,
    `message=${JSON.stringify(compactMessage)}`,
  ].join("\n");

  const response = await generateContentWithRetry({
    ai,
    model,
    contents: instruction,
  });

  const jsonText = extractJsonObject(response?.text);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    return normalizeActionClassifierResult(parsed);
  } catch {
    return null;
  }
};

const suggestTableNameWithModel = async ({ ai, model, locale, pageTitle, columns, rowSample }) => {
  if (!ai) return "";

  const compact = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  const instruction = [
    "Generate a concise and meaningful Korean table name for imported workspace data.",
    "Return JSON only.",
    '{"table_name":string}',
    `Length <= ${TABLE_NAME_MAX_LENGTH}. Do not include quotes or markdown.`,
    "The name should be specific to data semantics and readable for business users.",
    `locale=${String(locale || "").toLowerCase() || "unknown"}`,
    `page_title=${JSON.stringify(compact(pageTitle, 120))}`,
    `columns=${JSON.stringify((Array.isArray(columns) ? columns : []).slice(0, 20).map((c) => compact(c?.name, 40)))}`,
    `row_sample=${JSON.stringify((Array.isArray(rowSample) ? rowSample : []).slice(0, 3))}`,
  ].join("\n");

  const response = await generateContentWithRetry({
    ai,
    model,
    contents: instruction,
  });

  const jsonText = extractJsonObject(response?.text);
  if (!jsonText) return "";

  try {
    const parsed = JSON.parse(jsonText);
    return String(parsed?.table_name || "").trim();
  } catch {
    return "";
  }
};

const resolveExtractionModel = (fallbackModel = DEFAULT_MODEL) => {
  const preferred = String(process.env.GOOGLE_AI_EXTRACTION_MODEL || "").trim();
  return preferred || String(fallbackModel || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
};

const generateExtractionContentWithRetry = async ({
  ai,
  model,
  contents,
  maxAttempts = EXTRACTION_AI_RETRY_ATTEMPTS,
}) => {
  return generateContentWithRetry({
    ai,
    model: resolveExtractionModel(model),
    contents,
    maxAttempts,
    config: {
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: EXTRACTION_MAX_OUTPUT_TOKENS,
    },
  });
};

const extractStructuredRowsWithModel = async ({
  ai,
  model,
  locale,
  pageTitle,
  content,
  maxRows,
}) => {
  if (!ai) return null;

  const compact = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  const contentSnippet = String(content || "").slice(0, MAX_EXTRACTION_CONTENT_CHARS);
  const instruction = [
    "Extract structured records from this wiki markdown document.",
    "Return JSON only.",
    '{"columns":string[],"rows":object[]}',
    `rows length must be <= ${Math.max(1, maxRows)}.`,
    "Use Korean column labels when natural in source text.",
    "Each row must be a flat object (no nested objects/arrays).",
    "Do not omit records that follow repeated section patterns.",
    "If the page contains repeated company/profile blocks, convert each block into one row.",
    `locale=${String(locale || "").toLowerCase() || "unknown"}`,
    `page_title=${JSON.stringify(compact(pageTitle, 120))}`,
    `markdown_content=${JSON.stringify(contentSnippet)}`,
  ].join("\n");

  const response = await generateExtractionContentWithRetry({
    ai,
    model,
    contents: instruction,
  });

  const jsonText = extractJsonObject(response?.text);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    const rows = Array.isArray(parsed?.rows)
      ? parsed.rows.filter((row) => row && typeof row === "object" && !Array.isArray(row))
      : [];

    const columnCandidates = Array.isArray(parsed?.columns)
      ? parsed.columns.map((col) => String(col || "").trim()).filter(Boolean)
      : [];

    const fallbackColumns = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row || {}).map((key) => String(key || "").trim())))
    ).filter(Boolean);

    return {
      columns: columnCandidates.length > 0 ? columnCandidates : fallbackColumns,
      rows,
    };
  } catch {
    return null;
  }
};

const isSectionStartLine = (line) => {
  const text = String(line || "").trim();
  if (!text) return false;
  return /^#{1,6}\s+/.test(text) || /^\d+[.)]\s+/.test(text) || /^[-*]\s+/.test(text);
};

const createChunkOverlap = (text, overlapChars = EXTRACTION_CHUNK_OVERLAP_CHARS) => {
  const source = String(text || "");
  if (!source || overlapChars <= 0) return "";
  if (source.length <= overlapChars) return source;

  const start = Math.max(0, source.length - overlapChars);
  const sliced = source.slice(start);
  const firstNewline = sliced.indexOf("\n");
  if (firstNewline >= 0 && firstNewline < sliced.length - 1) {
    return sliced.slice(firstNewline + 1).trim();
  }
  return sliced.trim();
};

const splitOversizedBlock = (text, chunkSize = EXTRACTION_CHUNK_TARGET_CHARS) => {
  const value = String(text || "");
  if (!value) return [];
  if (value.length <= chunkSize) return [value];

  const parts = [];
  let cursor = 0;

  while (cursor < value.length) {
    let end = Math.min(cursor + chunkSize, value.length);
    if (end < value.length) {
      const newlineAt = value.lastIndexOf("\n", end);
      if (newlineAt > cursor + Math.floor(chunkSize * 0.55)) {
        end = newlineAt;
      }
    }

    const part = value.slice(cursor, end).trim();
    if (part) parts.push(part);
    if (end >= value.length) break;

    cursor = Math.max(0, end - EXTRACTION_CHUNK_OVERLAP_CHARS);
  }

  return parts;
};

const splitContentForExtraction = (content, chunkSize = EXTRACTION_CHUNK_TARGET_CHARS) => {
  const text = String(content || "");
  if (!text) return [];
  if (text.length <= chunkSize) return [text];

  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentBlock = [];

  const flushBlock = () => {
    if (currentBlock.length === 0) return;
    const blockText = currentBlock.join("\n").trim();
    if (blockText) blocks.push(blockText);
    currentBlock = [];
  };

  for (const line of lines) {
    const isBoundary = isSectionStartLine(line);
    if (isBoundary && currentBlock.length > 0) {
      flushBlock();
    }

    currentBlock.push(line);

    if (!String(line || "").trim()) {
      flushBlock();
    }
  }
  flushBlock();

  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  const flushChunk = () => {
    if (currentChunk.length === 0) return;
    const chunkText = currentChunk.join("\n\n").trim();
    if (!chunkText) return;
    chunks.push(chunkText);

    const overlapText = createChunkOverlap(chunkText, EXTRACTION_CHUNK_OVERLAP_CHARS);
    currentChunk = overlapText ? [overlapText] : [];
    currentLength = overlapText.length;
  };

  for (const block of blocks) {
    if (block.length > chunkSize) {
      const parts = splitOversizedBlock(block, chunkSize);
      for (const part of parts) {
        const partLength = part.length + (currentChunk.length > 0 ? 2 : 0);
        if (currentLength + partLength > chunkSize && currentChunk.length > 0) {
          flushChunk();
        }
        currentChunk.push(part);
        currentLength += part.length + (currentChunk.length > 1 ? 2 : 0);
      }
      continue;
    }

    const blockLength = block.length + (currentChunk.length > 0 ? 2 : 0);
    if (currentLength + blockLength > chunkSize && currentChunk.length > 0) {
      flushChunk();
    }

    currentChunk.push(block);
    currentLength += block.length + (currentChunk.length > 1 ? 2 : 0);
  }

  flushChunk();
  return chunks.filter(Boolean);
};

const mergeExtractedRows = (partials, maxRows) => {
  const mergedColumns = [];
  const columnSet = new Set();
  const mergedRows = [];
  const rowSet = new Set();

  for (const partial of partials) {
    const columns = Array.isArray(partial?.columns) ? partial.columns : [];
    for (const col of columns) {
      const key = String(col || "").trim();
      if (!key || columnSet.has(key)) continue;
      columnSet.add(key);
      mergedColumns.push(key);
    }

    const rows = Array.isArray(partial?.rows) ? partial.rows : [];
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const normalized = {};
      for (const [k, v] of Object.entries(row)) {
        const key = String(k || "").trim();
        if (!key) continue;
        normalized[key] = v;
      }
      if (Object.keys(normalized).length === 0) continue;

      const rowKey = JSON.stringify(normalized);
      if (rowSet.has(rowKey)) continue;
      rowSet.add(rowKey);
      mergedRows.push(normalized);

      if (mergedRows.length >= maxRows) {
        return { columns: mergedColumns, rows: mergedRows };
      }
    }
  }

  if (mergedColumns.length === 0 && mergedRows.length > 0) {
    const fallbackColumns = Array.from(
      new Set(mergedRows.flatMap((row) => Object.keys(row || {}).map((key) => String(key || "").trim())))
    ).filter(Boolean);
    return { columns: fallbackColumns, rows: mergedRows };
  }

  return { columns: mergedColumns, rows: mergedRows };
};

const extractStructuredRowsWithModelMulti = async ({
  ai,
  model,
  locale,
  pageTitle,
  content,
  maxRows,
  onProgress,
}) => {
  const chunks = splitContentForExtraction(content, EXTRACTION_CHUNK_TARGET_CHARS).slice(
    0,
    MAX_EXTRACTION_CHUNKS
  );
  if (chunks.length === 0) {
    return null;
  }

  const partials = [];
  let remaining = Math.max(1, maxRows);
  onProgress?.({
    stage: "chunking",
    message: `문서를 ${chunks.length}개 구간으로 분할했습니다.`,
    progress: 20,
    chunk_count: chunks.length,
  });

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    if (remaining <= 0) break;
    const perChunkRows = Math.max(10, Math.min(remaining, 120));
    onProgress?.({
      stage: "extracting",
      message: `구간 ${index + 1}/${chunks.length} 추출 중...`,
      progress: Math.min(90, 20 + Math.round(((index + 0.3) / chunks.length) * 70)),
      chunk_index: index + 1,
      chunk_count: chunks.length,
    });

    const partial = await extractStructuredRowsWithModel({
      ai,
      model,
      locale,
      pageTitle,
      content: chunk,
      maxRows: perChunkRows,
    });

    if (!partial || !Array.isArray(partial.rows) || partial.rows.length === 0) {
      continue;
    }

    partials.push(partial);
    remaining -= partial.rows.length;
    onProgress?.({
      stage: "extracting",
      message: `구간 ${index + 1}/${chunks.length} 완료 (누적 ${Math.max(0, maxRows - remaining)}건)`,
      progress: Math.min(92, 20 + Math.round(((index + 1) / chunks.length) * 70)),
      chunk_index: index + 1,
      chunk_count: chunks.length,
      extracted_rows: Math.max(0, maxRows - remaining),
    });
  }

  if (partials.length === 0) return null;
  return mergeExtractedRows(partials, maxRows);
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
  if (messageMatch) {
    return Math.max(1, Math.ceil(Number(messageMatch[1])));
  }

  const htmlMatch = message.match(/try again in\s+(\d+)\s+seconds/i);
  if (htmlMatch) {
    return Math.max(1, Number(htmlMatch[1]));
  }

  return null;
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

const isTemporaryUpstreamError = (error) => {
  const statusCode = Number(error?.status) || Number(error?.error?.code) || 0;
  const statusText = String(error?.error?.status || "").toUpperCase();
  const message = String(error?.message || "");
  return (
    [500, 502, 503, 504].includes(statusCode) ||
    ["INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED", "BAD_GATEWAY"].includes(statusText) ||
    /temporary error|bad gateway|unavailable|timeout|try again/i.test(message)
  );
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateContentWithRetry = async ({
  ai,
  model,
  contents,
  maxAttempts = AI_RETRY_ATTEMPTS,
  config = undefined,
}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const request = config ? { model, contents, config } : { model, contents };
      return await ai.models.generateContent(request);
    } catch (error) {
      lastError = error;
      const retryable = isTemporaryUpstreamError(error) || isQuotaExceededError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      const retryAfterSeconds = parseRetryAfterSeconds(error);
      const waitMs = retryAfterSeconds
        ? retryAfterSeconds * 1000
        : AI_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await delay(waitMs);
    }
  }

  throw lastError;
};

const normalizeDataColumnName = (value, index) => {
  const base = String(value || "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (base) return base;
  return `column_${index + 1}`;
};

const isMarkdownSeparatorRow = (line) => {
  const cleaned = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  if (!cleaned) return false;
  return cleaned
    .split("|")
    .map((cell) => cell.trim())
    .every((cell) => /^:?-{3,}:?$/.test(cell));
};

const parseMarkdownCells = (line) =>
  String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => String(cell || "").trim());

const parseMarkdownTableFromContent = (content) => {
  const lines = String(content || "").split(/\r?\n/);
  const candidates = [];

  for (let i = 0; i < lines.length - 1; i += 1) {
    const headerLine = lines[i];
    const separatorLine = lines[i + 1];
    if (!headerLine.includes("|") || !separatorLine.includes("|")) continue;
    if (!isMarkdownSeparatorRow(separatorLine)) continue;

    const headers = parseMarkdownCells(headerLine);
    if (headers.length === 0) continue;

    const rows = [];
    for (let j = i + 2; j < lines.length; j += 1) {
      const line = String(lines[j] || "");
      if (!line.includes("|")) break;
      if (!line.trim()) break;

      const cells = parseMarkdownCells(line);
      if (cells.length < headers.length) {
        while (cells.length < headers.length) cells.push("");
      }
      if (cells.length > headers.length) cells.length = headers.length;
      rows.push(cells);
    }

    if (rows.length > 0) {
      candidates.push({ headers, rows });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.rows.length - a.rows.length);
  return candidates[0];
};

const inferColumnType = (values) => {
  const filled = (Array.isArray(values) ? values : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (filled.length === 0) return "TEXT";

  const isNumberColumn = filled.every((value) => /^-?\d+(?:\.\d+)?$/.test(value));
  if (isNumberColumn) return "NUMBER";

  const isDateColumn = filled.every((value) => {
    if (!/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value)) return false;
    return !Number.isNaN(Date.parse(value));
  });
  if (isDateColumn) return "DATE";

  return "TEXT";
};

const coerceValueByType = (value, type) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (type === "NUMBER") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : raw;
  }

  return raw;
};

const GENERIC_TABLE_NAME_TERMS = new Set([
  "table",
  "data",
  "dataset",
  "new table",
  "temp",
  "임시",
  "테이블",
  "데이터",
  "새 테이블",
  "표",
]);

const cleanTableName = (value) =>
  String(value || "")
    .replace(/["'`“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TABLE_NAME_MAX_LENGTH);

const isMeaningfulTableName = (value) => {
  const cleaned = cleanTableName(value);
  if (!cleaned || cleaned.length < 2) return false;

  const normalized = cleaned.toLowerCase();
  if (GENERIC_TABLE_NAME_TERMS.has(normalized)) return false;
  if (/^(table|data|dataset|temp)\s*\d*$/i.test(cleaned)) return false;
  if (/^(테이블|데이터|임시)\s*\d*$/i.test(cleaned)) return false;
  return true;
};

const buildSemanticTableName = ({ pageTitle, columns }) => {
  const baseTitle = cleanTableName(pageTitle);
  const columnNames = (Array.isArray(columns) ? columns : [])
    .map((column) => String(column?.name || "").toLowerCase())
    .filter(Boolean);

  const hasApiSignals = columnNames.some((name) =>
    ["api", "endpoint", "method", "path", "url", "auth", "agent", "status"].some((signal) =>
      name.includes(signal)
    )
  );

  if (baseTitle) {
    if (/(테이블|데이터|목록|명세)$/i.test(baseTitle)) {
      return baseTitle.slice(0, TABLE_NAME_MAX_LENGTH);
    }
    if (/api|endpoint|명세|spec/i.test(baseTitle)) {
      return `${baseTitle} 목록`.slice(0, TABLE_NAME_MAX_LENGTH);
    }
    return `${baseTitle} 데이터`.slice(0, TABLE_NAME_MAX_LENGTH);
  }

  if (hasApiSignals) {
    return "API 엔드포인트 목록";
  }

  if (columnNames.length > 0) {
    return `${cleanTableName(columnNames[0]) || "가져온"} 데이터`.slice(0, TABLE_NAME_MAX_LENGTH);
  }

  return "가져온 데이터";
};

const resolveUniqueTableName = async ({ workspaceId, projectId, desiredName, db = pool }) => {
  const base = cleanTableName(desiredName).slice(0, TABLE_NAME_MAX_LENGTH) || "가져온 데이터";
  const existingRes = await db.query(
    `SELECT name
       FROM data_table
      WHERE workspace_id = $1
        AND project_id = $2`,
    [workspaceId, projectId]
  );

  const existingNames = new Set(existingRes.rows.map((row) => String(row?.name || "").toLowerCase()));
  if (!existingNames.has(base.toLowerCase())) return base;

  for (let i = 2; i <= 99; i += 1) {
    const suffix = ` (${i})`;
    const trimmedBase = base.slice(0, Math.max(1, TABLE_NAME_MAX_LENGTH - suffix.length));
    const candidate = `${trimmedBase}${suffix}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${base.slice(0, 50)} ${Date.now()}`;
};

const isDataTableNameConflictError = (error) => {
  const code = String(error?.code || "");
  const constraint = String(error?.constraint || "");
  return code === "23505" && constraint === "uq_data_table_workspace_project_name";
};

const hasAnyTerm = (text, terms) => {
  const lower = String(text || "").toLowerCase();
  return terms.some((term) => lower.includes(String(term || "").toLowerCase()));
};

const detectWikiToDataIntent = (message, history = []) => {
  const historyText = Array.isArray(history)
    ? history
        .slice(-6)
        .map((item) => String(item?.text || ""))
        .join(" ")
    : "";
  const text = `${String(message || "")} ${historyText}`.trim();
  const hasWikiRef =
    hasAnyTerm(text, ["위키", "wiki", "page", "페이지", "문서"]) ||
    /\/project\/\d+\/wiki\/\d+/i.test(text);
  const hasDataAction = hasAnyTerm(text, WIKI_TO_DATA_EXECUTION_KEYWORDS);
  return hasWikiRef && hasDataAction;
};

const detectExecutionConfirm = (message) => hasAnyTerm(message, WIKI_TO_DATA_CONFIRM_KEYWORDS);

const hasPendingWikiToDataPreview = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) return false;
  const recentAssistantText = history
    .filter((item) => String(item?.role || "") === "assistant")
    .slice(-3)
    .map((item) => String(item?.text || ""))
    .join("\n");
  return hasAnyTerm(recentAssistantText, WIKI_TO_DATA_PENDING_HINTS);
};

const extractPageIdFromText = (text) => {
  const value = String(text || "");
  const matches = [
    value.match(/\/project\/\d+\/wiki\/(\d+)/i),
    value.match(/(?:위키|wiki|페이지|page|문서)\s*#?\s*(\d+)/i),
    value.match(/\bpage\s*id\s*[:#]?\s*(\d+)\b/i),
  ];

  for (const match of matches) {
    if (match?.[1]) {
      const parsed = Number(match[1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }

  return null;
};

const extractPageIdFromConversation = (message, history) => {
  const fromMessage = extractPageIdFromText(message);
  if (fromMessage) return fromMessage;

  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const fromHistory = extractPageIdFromText(history[i]?.text || "");
    if (fromHistory) return fromHistory;
  }

  return null;
};

const resolveActionPageId = async ({
  projectId,
  message,
  history,
  preferredPageId = null,
  allowHistoryFallback = false,
}) => {
  const explicitId = preferredPageId || extractPageIdFromText(message);
  if (explicitId) return explicitId;

  const summaries = await getPageSummaries(projectId);
  const titleFromMessage = findBestSummaryId(String(message || ""), summaries, "title");
  if (titleFromMessage) return titleFromMessage;

  if (!allowHistoryFallback) return null;

  const historyText = Array.isArray(history)
    ? history
        .slice(-6)
        .map((item) => String(item?.text || ""))
        .join(" ")
    : "";
  return findBestSummaryId(historyText, summaries, "title");
};

const extractTableNameHint = (message) => {
  const text = String(message || "");
  const quoted = text.match(/(?:테이블(?:명| 이름)?(?:은|는|:)?\s*)?["'`“”‘’]([^"'`“”‘’]{2,60})["'`“”‘’]/i);
  if (quoted?.[1]) return quoted[1].trim();

  const simple = text.match(/(?:테이블(?:명| 이름)?(?:을|를|은|는|:)?\s*)([a-zA-Z0-9_\-가-힣\s]{2,50})/i);
  if (!simple?.[1]) return "";
  return simple[1].trim().replace(/[.,!?]$/, "");
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

const createHttpError = (status, name, message) => {
  const error = new Error(message);
  error.status = status;
  error.name = name;
  return error;
};

const runWikiToDataAction = async ({
  userId,
  projectId,
  pageId,
  tableNameInput,
  dryRun,
  maxRows,
  ai = null,
  model = DEFAULT_MODEL,
  preExtracted = null,
}) => {
  emitAssistantProgress({
    userId,
    projectId,
    stage: "started",
    message: "데이터 적재 준비를 시작합니다.",
    progress: 5,
  });

  if (!ai) {
    throw createHttpError(500, "ConfigurationError", "GOOGLE_AI_API_KEY is not configured.");
  }

  const project = await ensureProjectMember(projectId, userId);
  if (!project) {
    throw createHttpError(403, "Forbidden", "프로젝트 접근 권한이 없습니다.");
  }

  const role = String(project.role_name || "").toUpperCase();
  if (!["OWNER", "ADMIN"].includes(role)) {
    throw createHttpError(403, "Forbidden", "데이터 테이블 생성 권한이 없습니다.");
  }

  const pageRes = await pool.query(
    `SELECT id, project_id, title, content, updated_at
       FROM page
      WHERE id = $1
        AND project_id = $2`,
    [pageId, projectId]
  );
  const page = pageRes.rows[0] || null;
  if (!page) {
    throw createHttpError(404, "NotFound", "페이지를 찾을 수 없습니다.");
  }

  emitAssistantProgress({
    userId,
    projectId,
    stage: "page_loaded",
    message: `위키 페이지 '${String(page.title || "")}'를 확인했습니다.`,
    progress: 12,
    extra: { page_id: Number(page.id) },
  });

  const preExtractedValid =
    preExtracted &&
    Number(preExtracted.pageId) === Number(page.id) &&
    String(preExtracted.pageUpdatedAt || "") === String(page.updated_at || "") &&
    Array.isArray(preExtracted.rows) &&
    preExtracted.rows.length > 0;

  const extracted = preExtractedValid
    ? {
        columns: Array.isArray(preExtracted.columns) ? preExtracted.columns : [],
        rows: preExtracted.rows,
      }
    : await extractStructuredRowsWithModelMulti({
        ai,
        model,
        locale: project.locale,
        pageTitle: page.title,
        content: page.content,
        maxRows,
        onProgress: ({ stage, message, progress, ...extra }) => {
          emitAssistantProgress({
            userId,
            projectId,
            stage,
            message,
            progress,
            extra,
          });
        },
      });

  if (preExtractedValid) {
    emitAssistantProgress({
      userId,
      projectId,
      stage: "using_preview_cache",
      message: "미리보기 추출 결과를 재사용합니다.",
      progress: 35,
    });
  }
  if (!extracted || !Array.isArray(extracted.rows) || extracted.rows.length === 0) {
    throw createHttpError(
      422,
      "UnprocessableEntity",
      "LLM이 페이지에서 적재 가능한 레코드를 추출하지 못했습니다."
    );
  }

  const extractionChunkCount = splitContentForExtraction(
    page.content,
    EXTRACTION_CHUNK_TARGET_CHARS
  ).slice(0, MAX_EXTRACTION_CHUNKS).length;

  const sourceRows = extracted.rows.slice(0, maxRows);
  const sourceKeys = (Array.isArray(extracted.columns) ? extracted.columns : [])
    .map((key) => String(key || "").trim())
    .filter(Boolean);
  const fallbackSourceKeys = Array.from(
    new Set(sourceRows.flatMap((row) => Object.keys(row || {}).map((key) => String(key || "").trim())))
  ).filter(Boolean);
  const selectedSourceKeys = sourceKeys.length > 0 ? sourceKeys : fallbackSourceKeys;

  const usedNames = new Set();
  const columnSpecs = selectedSourceKeys.map((sourceKey, index) => {
    const normalizedBaseName = normalizeDataColumnName(sourceKey, index);
    let candidate = normalizedBaseName;
    let suffix = 2;
    while (usedNames.has(candidate)) {
      candidate = `${normalizedBaseName}_${suffix}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return {
      sourceKey,
      name: candidate,
      sort_order: index,
    };
  });

  if (columnSpecs.length === 0) {
    throw createHttpError(
      422,
      "UnprocessableEntity",
      "LLM 추출 결과에 컬럼 정보가 없어 테이블을 생성할 수 없습니다."
    );
  }

  emitAssistantProgress({
    userId,
    projectId,
    stage: "schema_ready",
    message: `스키마를 생성했습니다. (컬럼 ${columnSpecs.length}개)` ,
    progress: 94,
  });

  const columns = columnSpecs.map((spec) => {
    const values = sourceRows.map((row) => row?.[spec.sourceKey]);
    const inferredType = inferColumnType(values);
    return {
      name: spec.name,
      type: DATA_COLUMN_TYPES.has(inferredType) ? inferredType : "TEXT",
      is_visible: true,
      is_required: false,
      sort_order: spec.sort_order,
      permissions: {
        readRoles: ["OWNER", "ADMIN", "MEMBER"],
        writeRoles: ["OWNER", "ADMIN", "MEMBER"],
      },
    };
  });

  const tableRows = sourceRows.map((row) => {
    const jsonData = {};
    for (let i = 0; i < columnSpecs.length; i += 1) {
      const spec = columnSpecs[i];
      jsonData[spec.name] = coerceValueByType(row?.[spec.sourceKey], columns[i].type);
    }
    return jsonData;
  });

  const requestedTableName = isMeaningfulTableName(tableNameInput) ? tableNameInput : "";
  let llmSuggestedName = "";
  if (!requestedTableName && ai) {
    try {
      llmSuggestedName = await suggestTableNameWithModel({
        ai,
        model,
        locale: project.locale,
        pageTitle: page.title,
        columns,
        rowSample: tableRows.slice(0, 3),
      });
    } catch (error) {
      logger.warn("assistant table name suggestion fallback", {
        err: error?.message,
        project_id: projectId,
        page_id: pageId,
      });
    }
  }

  const semanticFallbackName = buildSemanticTableName({ pageTitle: page.title, columns });
  const selectedBaseName =
    requestedTableName ||
    (isMeaningfulTableName(llmSuggestedName) ? llmSuggestedName : "") ||
    semanticFallbackName;
  const suggestedTableName = await resolveUniqueTableName({
    workspaceId: project.workspace_id,
    projectId,
    desiredName: selectedBaseName,
  });

  const preview = {
    source: {
      page_id: Number(page.id),
      page_title: String(page.title || ""),
      page_updated_at: page.updated_at,
    },
    inferred_schema: {
      table_name: suggestedTableName,
      table_name_source: requestedTableName
        ? "user"
        : isMeaningfulTableName(llmSuggestedName)
          ? "llm"
          : "rule",
      columns,
    },
    extraction: {
      mode: "llm_chunked_multi",
      chunks: extractionChunkCount,
    },
    row_count: tableRows.length,
    row_sample: tableRows.slice(0, 5),
    max_rows: maxRows,
    truncated: extracted.rows.length > tableRows.length,
  };

  if (dryRun) {
    emitAssistantProgress({
      userId,
      projectId,
      stage: "preview_ready",
      message: `미리보기가 준비되었습니다. (행 ${tableRows.length}개)` ,
      progress: 100,
    });
    return {
      status: 200,
      body: {
        dry_run: true,
        preview,
      },
      cacheable: {
        pageId: Number(page.id),
        pageUpdatedAt: String(page.updated_at || ""),
        columns: sourceKeys,
        rows: extracted.rows,
      },
    };
  }

  const initialTableName = String(preview.inferred_schema.table_name || "").trim();
  let finalTableName = initialTableName;
  if (!finalTableName) {
    throw createHttpError(400, "BadRequest", "테이블 이름을 결정할 수 없습니다.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    emitAssistantProgress({
      userId,
      projectId,
      stage: "writing",
      message: "데이터 테이블을 생성하고 있습니다.",
      progress: 96,
    });

    let createdTable = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const tableInsertRes = await client.query(
          `INSERT INTO data_table (workspace_id, project_id, name, description, is_asset, created_by)
           VALUES ($1, $2, $3, $4, false, $5)
           RETURNING *`,
          [
            project.workspace_id,
            projectId,
            finalTableName,
            `Imported from wiki page #${page.id}: ${String(page.title || "")}`.slice(0, 500),
            userId,
          ]
        );
        createdTable = tableInsertRes.rows[0] || null;
        break;
      } catch (error) {
        if (!isDataTableNameConflictError(error) || attempt >= 3) {
          throw error;
        }
        finalTableName = await resolveUniqueTableName({
          workspaceId: project.workspace_id,
          projectId,
          desiredName: selectedBaseName,
          db: client,
        });
      }
    }

    if (!createdTable) {
      throw createHttpError(500, "InternalError", "테이블 생성에 실패했습니다.");
    }

    for (const column of columns) {
      await client.query(
        `INSERT INTO data_column
           (table_id, name, type, options_json, is_visible, is_required, sort_order, permissions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          createdTable.id,
          column.name,
          column.type,
          column.type === "SELECT" ? JSON.stringify([]) : null,
          column.is_visible,
          column.is_required,
          column.sort_order,
          JSON.stringify(column.permissions),
        ]
      );
    }

    for (const rowData of tableRows) {
      await client.query(
        `INSERT INTO data_row (table_id, json_data, created_by, updated_by)
         VALUES ($1, $2, $3, $3)`,
        [createdTable.id, rowData, userId]
      );
    }

    await client.query(
      `INSERT INTO data_audit_log (table_id, action, after_data, changed_by)
       VALUES ($1, 'INSERT', $2, $3)`,
      [
        createdTable.id,
        JSON.stringify({
          source_page_id: page.id,
          source_page_title: page.title,
          imported_rows: tableRows.length,
          imported_columns: columns.length,
        }),
        userId,
      ]
    );

    await client.query("COMMIT");

    emitAssistantProgress({
      userId,
      projectId,
      stage: "completed",
      message: `적재가 완료되었습니다. (행 ${tableRows.length}개)` ,
      progress: 100,
      extra: { table_id: Number(createdTable.id) || null },
    });

    return {
      status: 201,
      body: {
        dry_run: false,
        table: createdTable,
        imported: {
          rows: tableRows.length,
          columns: columns.length,
        },
        source: {
          page_id: page.id,
          page_title: page.title,
        },
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

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
