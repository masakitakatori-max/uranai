const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = Number(process.env.AI_FEEDBACK_MAX_TOKENS || "1200");
const DEFAULT_GATE_MODE = process.env.AI_FEEDBACK_MODE || "disabled";
const CHECKOUT_URL = process.env.AI_FEEDBACK_CHECKOUT_URL || "";
const SUPPORTED_MODES = new Set(["liuren", "kingoketsu", "danneki", "taiitsu"]);

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length > 0) {
    return JSON.parse(req.body);
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }

  return raw ? JSON.parse(raw) : {};
}

function normalizeFeedbackShape(parsed, fallbackText) {
  return {
    overview: typeof parsed?.overview === "string" && parsed.overview.trim() ? parsed.overview.trim() : fallbackText,
    keySignals: Array.isArray(parsed?.keySignals) ? parsed.keySignals.filter((value) => typeof value === "string" && value.trim()) : [],
    cautions: Array.isArray(parsed?.cautions) ? parsed.cautions.filter((value) => typeof value === "string" && value.trim()) : [],
    nextActions: Array.isArray(parsed?.nextActions) ? parsed.nextActions.filter((value) => typeof value === "string" && value.trim()) : [],
    followUpQuestions: Array.isArray(parsed?.followUpQuestions)
      ? parsed.followUpQuestions.filter((value) => typeof value === "string" && value.trim())
      : [],
    confidence: typeof parsed?.confidence === "string" && parsed.confidence.trim() ? parsed.confidence.trim() : "中",
    disclaimer:
      typeof parsed?.disclaimer === "string" && parsed.disclaimer.trim()
        ? parsed.disclaimer.trim()
        : "AI は盤面と相談文を補助的に整理する役割です。最終判断は一次情報と現実条件を優先してください。",
  };
}

function extractTextContent(responseJson) {
  if (!Array.isArray(responseJson?.content)) {
    return "";
  }

  return responseJson.content
    .filter((item) => item?.type === "text" && typeof item?.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function tryParseJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const direct = fenced ?? text.match(/\{[\s\S]*\}/)?.[0] ?? text;

  try {
    return JSON.parse(direct);
  } catch {
    return null;
  }
}

function buildSystemPrompt(modeLabel) {
  return [
    "あなたは東洋占術アプリ向けの上級鑑定アシスタントです。",
    `対象の占術は ${modeLabel} です。`,
    "入力された相談文と機械生成の盤面要約だけを根拠に、日本語で現実的な助言を返してください。",
    "盤面にない事実を捏造せず、断定しすぎず、論点整理と次の確認事項に強い返答を行ってください。",
    "医療・法律・投資の最終判断を断定せず、必要に応じて専門家確認を促してください。",
    "必ず JSON だけを返してください。",
    'JSON schema: {"overview":string,"keySignals":string[],"cautions":string[],"nextActions":string[],"followUpQuestions":string[],"confidence":string,"disclaimer":string}',
  ].join("\n");
}

function buildUserPrompt(payload) {
  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights
        .filter((item) => item && typeof item.label === "string" && typeof item.value === "string")
        .map((item) => `- ${item.label}: ${item.value}`)
        .join("\n")
    : "";
  const taiitsuContext =
    payload.mode === "taiitsu" && payload.taiitsuContext
      ? [
          `方位: ${payload.taiitsuContext.direction}`,
          `起局条件: ${payload.taiitsuContext.startCondition}`,
          `補正時刻: ${payload.taiitsuContext.correctedDateTime}`,
          `地点: ${payload.taiitsuContext.locationLabel}`,
          `局序: ${payload.taiitsuContext.cycleIndex + 1}`,
        ].join("\n")
      : "";

  return [
    `占術: ${payload.modeLabel}`,
    `占的: ${payload.topic}`,
    `相談文: ${payload.questionText}`,
    highlights ? `注目ポイント:\n${highlights}` : "",
    taiitsuContext ? `太乙神数 専用条件:\n${taiitsuContext}` : "",
    `盤面要約:\n${payload.chartSummary}`,
    "求める出力方針:",
    "- 相談者が今どこを優先して見るべきかを先に示す",
    "- 機械解釈の追認だけでなく、見落としと反証も挙げる",
    "- 次に現実で確認すべきことを具体化する",
    "- 抽象論で終わらず、行動可能な粒度に落とす",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function validateTaiitsuPayload(payload) {
  if (payload.mode !== "taiitsu") {
    return null;
  }

  const context = payload.taiitsuContext;
  if (!context || typeof context !== "object") {
    return "太乙神数では taiitsuContext が必須です。";
  }

  const requiredFields = ["direction", "startCondition", "correctedDateTime", "locationLabel"];
  const missingField = requiredFields.find((field) => typeof context[field] !== "string" || !context[field].trim());
  if (missingField) {
    return `太乙神数では taiitsuContext.${missingField} が必須です。`;
  }

  if (typeof context.cycleIndex !== "number" || !Number.isFinite(context.cycleIndex)) {
    return "太乙神数では taiitsuContext.cycleIndex が数値である必要があります。";
  }

  return null;
}

async function callAnthropic(payload) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: 0.4,
      system: buildSystemPrompt(payload.modeLabel),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(payload),
        },
      ],
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json?.error?.message || "Claude API の呼び出しに失敗しました。";
    throw new Error(message);
  }

  const text = extractTextContent(json);
  const parsed = tryParseJson(text);
  return normalizeFeedbackShape(parsed, text || "AI から有効な応答を取得できませんでした。");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "POST のみ対応しています。" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return sendJson(res, 503, { ok: false, error: "Anthropic API キーが未設定です。" });
  }

  if (DEFAULT_GATE_MODE === "disabled") {
    return sendJson(res, 403, { ok: false, error: "AI フィードバックは現在オフです。" });
  }

  if (DEFAULT_GATE_MODE === "paid") {
    return sendJson(res, 402, {
      ok: false,
      error: "AI フィードバックは有料プラン向けです。公開版では決済後の権限確認をつないでください。",
      requiresPayment: true,
      checkoutUrl: CHECKOUT_URL,
    });
  }

  try {
    const payload = await readJsonBody(req);

    if (!SUPPORTED_MODES.has(payload?.mode)) {
      return sendJson(res, 400, { ok: false, error: "未対応の占術モードです。" });
    }

    if (!payload?.questionText || typeof payload.questionText !== "string" || payload.questionText.trim().length < 6) {
      return sendJson(res, 400, { ok: false, error: "相談文は6文字以上で入力してください。" });
    }

    if (!payload?.chartSummary || typeof payload.chartSummary !== "string") {
      return sendJson(res, 400, { ok: false, error: "盤面要約が不足しています。" });
    }

    const taiitsuError = validateTaiitsuPayload(payload);
    if (taiitsuError) {
      return sendJson(res, 400, { ok: false, error: taiitsuError });
    }

    const feedback = await callAnthropic({
      mode: payload.mode,
      modeLabel: payload.modeLabel || payload.mode || "占断",
      topic: payload.topic || "総合",
      questionText: payload.questionText.trim(),
      chartSummary: payload.chartSummary,
      highlights: payload.highlights || [],
      taiitsuContext: payload.taiitsuContext,
    });

    return sendJson(res, 200, {
      ok: true,
      model: DEFAULT_MODEL,
      feedback,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI フィードバックの生成に失敗しました。";
    return sendJson(res, 500, { ok: false, error: message });
  }
}
