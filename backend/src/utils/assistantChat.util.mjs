const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_TOTAL_CHARS = 4000;
const MAX_CONTEXT_TEXT_LENGTH = 120;
const MAX_PROMPT_SUMMARY_ITEMS = 200;
const MAX_RESPONSE_TOKENS_PROMPT_HINT = 220;

const PAGE_KEYWORDS = ["위키", "문서", "페이지", "wiki", "page"];
const TASK_KEYWORDS = ["태스크", "작업", "이슈", "task", "issue"];
const FOLLOW_UP_DETAIL_PHRASES = [
  "조회해",
  "다시",
  "불러와",
  "불러와봐",
  "가져와",
  "해당",
  "그거",
  "that",
  "fetch",
  "reload",
];
const REFETCH_PHRASES = ["다시", "재조회", "다시 불러", "reload", "refetch", "refresh"];

const STOPWORDS = new Set([
  "위키",
  "문서",
  "페이지",
  "task",
  "태스크",
  "작업",
  "이슈",
  "상세",
  "자세히",
  "내용",
  "알려줘",
  "보여줘",
]);

export const toPositiveInt = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

export const normalizeHistory = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];

  const normalized = rawHistory
    .map((item) => ({
      role: String(item?.role || "").toLowerCase(),
      text: String(item?.text || "").trim(),
    }))
    .filter((item) => ["user", "assistant"].includes(item.role) && item.text)
    .slice(-MAX_HISTORY_ITEMS);

  const selected = [];
  let totalChars = 0;

  for (let i = normalized.length - 1; i >= 0; i -= 1) {
    const item = normalized[i];
    const itemLength = item.text.length;

    if (totalChars + itemLength <= MAX_HISTORY_TOTAL_CHARS) {
      selected.unshift(item);
      totalChars += itemLength;
      continue;
    }

    if (selected.length === 0) {
      selected.unshift({
        role: item.role,
        text: item.text.slice(-MAX_HISTORY_TOTAL_CHARS),
      });
    }
    break;
  }

  return selected;
};

const compactText = (value, max = MAX_CONTEXT_TEXT_LENGTH) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeMatchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAnyKeyword = (message, keywords) => {
  const lower = String(message || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

const hasAnyPhrase = (message, phrases) => {
  const lower = String(message || "").toLowerCase();
  return phrases.some((phrase) => lower.includes(String(phrase).toLowerCase()));
};

const scoreTitleMatch = (message, title) => {
  const normalizedMessage = normalizeMatchText(message);
  const normalizedTitle = normalizeMatchText(title);
  if (!normalizedMessage || !normalizedTitle) return 0;

  let score = 0;
  if (normalizedMessage.includes(normalizedTitle)) score += 6;
  if (normalizedTitle.includes(normalizedMessage) && normalizedMessage.length >= 4) score += 3;

  const tokens = normalizedMessage
    .split(" ")
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));

  for (const token of tokens) {
    if (normalizedTitle.includes(token)) {
      score += 1;
    }
  }

  return score;
};

export const findBestSummaryId = (message, summaries, titleKey = "title") => {
  if (!Array.isArray(summaries) || summaries.length === 0) return null;

  let best = { id: null, score: 0 };
  let secondScore = 0;

  for (const item of summaries) {
    const score = scoreTitleMatch(message, item?.[titleKey]);
    if (score > best.score) {
      secondScore = best.score;
      best = { id: Number(item?.id) || null, score };
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  if (best.score < 2) return null;
  if (secondScore === best.score) return null;
  return best.id;
};

export const detectIntent = (message) => {
  const lower = String(message || "").toLowerCase();

  if (
    ["task", "태스크", "작업", "이슈", "마감", "due", "진행", "상태"].some((keyword) =>
      lower.includes(keyword)
    )
  ) {
    return "tasks";
  }

  if (["page", "문서", "페이지", "위키", "wiki"].some((keyword) => lower.includes(keyword))) {
    return "pages";
  }

  if (["채널", "channel", "메시지", "공지", "대화"].some((keyword) => lower.includes(keyword))) {
    return "channels";
  }

  if (["요약", "summary", "overview", "전체", "현황"].some((keyword) => lower.includes(keyword))) {
    return "overview";
  }

  return "general";
};

export const resolveContextNeeds = (intent) => {
  return {
    includeTasks: ["tasks", "general"].includes(intent),
    includePages: ["pages", "general"].includes(intent),
    includeChannels: ["channels", "general"].includes(intent),
  };
};

export const detectDetailRequest = (message) => {
  const text = String(message || "");
  const lower = text.toLowerCase();
  const wantsDetail = ["상세", "자세히", "내용", "본문", "detail"].some((keyword) =>
    lower.includes(keyword)
  );
  const followUpDetail = hasAnyPhrase(text, FOLLOW_UP_DETAIL_PHRASES);
  const needsRefetch = hasAnyPhrase(text, REFETCH_PHRASES);

  const pageIdMatch = text.match(/(?:위키|문서|페이지|page)\s*#?\s*(\d+)/i);
  const taskIdMatch = text.match(/(?:태스크|작업|이슈|task)\s*#?\s*(\d+)/i);

  return {
    wantsDetail: wantsDetail || followUpDetail,
    followUpDetail,
    needsRefetch,
    mentionsPage: hasAnyKeyword(text, PAGE_KEYWORDS),
    mentionsTask: hasAnyKeyword(text, TASK_KEYWORDS),
    pageId: pageIdMatch ? Number(pageIdMatch[1]) : null,
    taskId: taskIdMatch ? Number(taskIdMatch[1]) : null,
  };
};

export const extractReferencedResourceFromHistory = (history) => {
  if (!Array.isArray(history) || history.length === 0) {
    return { pageId: null, taskId: null };
  }

  let pageId = null;
  let taskId = null;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const text = String(history[i]?.text || "");
    if (!text) continue;

    if (!pageId) {
      const pageMatch =
        text.match(/(?:문서|위키|페이지|page)[^\d]{0,20}(?:id\s*[:#]?\s*)?(\d+)/i) ||
        text.match(/\bpage\s*id\s*[:#]?\s*(\d+)\b/i);
      if (pageMatch) pageId = Number(pageMatch[1]);
    }

    if (!taskId) {
      const taskMatch =
        text.match(/(?:태스크|작업|이슈|task)[^\d]{0,20}(?:id\s*[:#]?\s*)?(\d+)/i) ||
        text.match(/\btask\s*id\s*[:#]?\s*(\d+)\b/i);
      if (taskMatch) taskId = Number(taskMatch[1]);
    }

    if (pageId && taskId) break;
  }

  return {
    pageId: Number.isInteger(pageId) && pageId > 0 ? pageId : null,
    taskId: Number.isInteger(taskId) && taskId > 0 ? taskId : null,
  };
};

export const resolveAutoDetailTargets = ({
  message,
  intent,
  detailRequest,
  historyRef,
  pageSummaries,
  taskSummaries,
}) => {
  const shouldAutoPageDetail =
    detailRequest.wantsDetail || intent === "pages" || detailRequest.mentionsPage;
  const shouldAutoTaskDetail =
    detailRequest.wantsDetail || intent === "tasks" || detailRequest.mentionsTask;

  const pageByTitle = shouldAutoPageDetail
    ? findBestSummaryId(message, pageSummaries || [], "title")
    : null;
  const taskByTitle = shouldAutoTaskDetail
    ? findBestSummaryId(message, taskSummaries || [], "title")
    : null;

  const pageId =
    detailRequest.pageId ||
    pageByTitle ||
    (detailRequest.followUpDetail ? historyRef?.pageId : null);
  const taskId =
    detailRequest.taskId ||
    taskByTitle ||
    (detailRequest.followUpDetail ? historyRef?.taskId : null);

  return {
    pageId: Number.isInteger(pageId) && pageId > 0 ? pageId : null,
    taskId: Number.isInteger(taskId) && taskId > 0 ? taskId : null,
    source: {
      page: detailRequest.pageId
        ? "explicit"
        : pageByTitle
          ? "title"
          : detailRequest.followUpDetail && historyRef?.pageId
            ? "history"
            : null,
      task: detailRequest.taskId
        ? "explicit"
        : taskByTitle
          ? "title"
          : detailRequest.followUpDetail && historyRef?.taskId
            ? "history"
            : null,
    },
  };
};

export const buildAssistantPrompt = ({
  message,
  history,
  project,
  contextData,
  intent,
  locale,
}) => {
  const normalizedLocale = String(locale || project?.locale || "en").toLowerCase();
  const projectId = Number(project?.id) || 0;
  const responseLanguageInstruction =
    normalizedLocale === "en" ? "Answer in English." : "Answer in Korean.";
  const responseLengthInstruction = `Keep the final answer within about ${MAX_RESPONSE_TOKENS_PROMPT_HINT} tokens.`;
  const linkInstruction =
    normalizedLocale === "en"
      ? "When answering about a specific page, task, or channel, include a markdown link using its link field."
      : "특정 페이지, 태스크, 채널을 답변할 때는 link 필드를 사용해 마크다운 링크를 함께 포함하세요.";

  const context = {
    project: {
      id: Number(project.id),
      name: compactText(project.name, 60),
      summary: compactText(project.summary, 120),
      workspace_id: Number(project.workspace_id),
      role_name: String(project.role_name || ""),
    },
    overview: contextData.overview,
    tasks: (contextData.tasks || []).slice(0, MAX_PROMPT_SUMMARY_ITEMS).map((item) => ({
      id: Number(item.id),
      title: compactText(item.title, 80),
      status: String(item.status || ""),
      priority: Number(item.priority) || 0,
      due_date: item.due_date || null,
      kanban_id: Number(item.kanban_id) || null,
      kanban_name: compactText(item.kanban_name, 40),
      link:
        projectId > 0 && Number(item.kanban_id) > 0 && Number(item.id) > 0
          ? `/project/${projectId}/kanban/${Number(item.kanban_id)}/task/${Number(item.id)}`
          : null,
      related_members: Array.isArray(item.related_members)
        ? item.related_members.map((member) => ({
            id: Number(member?.id) || null,
            name: compactText(member?.name, 40),
            role: String(member?.role || ""),
          }))
        : [],
    })),
    pages: (contextData.pages || []).slice(0, MAX_PROMPT_SUMMARY_ITEMS).map((item) => ({
      id: Number(item.id),
      title: compactText(item.title, 80),
      author_name: compactText(item.author_name, 40),
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
      link: projectId > 0 && Number(item.id) > 0 ? `/project/${projectId}/wiki/${Number(item.id)}` : null,
    })),
    channels: (contextData.channels || []).map((item) => ({
      id: Number(item.id),
      name: compactText(item.name, 60),
      type: String(item.type || ""),
      scope: String(item.scope || ""),
      message_count: Number(item.message_count) || 0,
      last_message_at: item.last_message_at || null,
      link:
        projectId > 0 && Number(item.id) > 0 ? `/project/${projectId}/channel/${Number(item.id)}` : null,
    })),
    detail: {
      page: contextData?.detail?.page
        ? {
            ...contextData.detail.page,
            link:
              projectId > 0 && Number(contextData.detail.page.id) > 0
                ? `/project/${projectId}/wiki/${Number(contextData.detail.page.id)}`
                : null,
          }
        : null,
      task: contextData?.detail?.task
        ? {
            ...contextData.detail.task,
            link:
              projectId > 0 &&
              Number(contextData.detail.task.kanban_id) > 0 &&
              Number(contextData.detail.task.id) > 0
                ? `/project/${projectId}/kanban/${Number(contextData.detail.task.kanban_id)}/task/${Number(
                    contextData.detail.task.id
                  )}`
                : null,
          }
        : null,
    },
  };

  return [
    "You are an assistant for a project collaboration workspace.",
    responseLanguageInstruction,
    responseLengthInstruction,
    linkInstruction,
    "Use only the data in PROJECT_CONTEXT when stating project facts.",
    "If needed data is missing, say that clearly and ask a short follow-up question.",
    `QUESTION_INTENT: ${intent}`,
    "Keep the answer concise and actionable.",
    "RECENT_CONVERSATION:",
    JSON.stringify(history),
    "PROJECT_CONTEXT:",
    JSON.stringify(context),
    "USER_QUESTION:",
    message,
  ].join("\n");
};
