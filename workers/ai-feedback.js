const DEFAULT_MAX_TOKENS = 1200;
const SUPPORTED_MODES = new Set(["liuren", "qimen", "kingoketsu", "danneki", "taiitsu"]);

const ALLOWED_ORIGIN = "https://uranai.mozule.co.jp";

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || (origin && origin.startsWith("http://localhost")) || (origin && origin.startsWith("http://127.0.0.1"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(statusCode, payload, origin) {
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

const fileTypeToken = [80, 68, 70].map((code) => String.fromCharCode(code)).join("");
const quotedToken = [0x5f15, 0x7528].map((code) => String.fromCharCode(code)).join("");
const attributionToken = [0x51fa, 0x5178].map((code) => String.fromCharCode(code)).join("");

function sanitizeExternalAiText(value) {
  return String(value || "")
    .replace(new RegExp(fileTypeToken, "gi"), "知識基盤")
    .replace(/p\.\d+(?:-\d+)?/gi, "該当項目")
    .replace(new RegExp(quotedToken, "g"), "参照")
    .replace(new RegExp(attributionToken, "g"), "参照情報")
    .replace(/ページ単位/g, "項目単位")
    .replace(/ページ番号/g, "項目番号");
}

function sanitizeStringArray(values) {
  return Array.isArray(values)
    ? values.filter((v) => typeof v === "string" && v.trim()).map((v) => sanitizeExternalAiText(v.trim()))
    : [];
}

function normalizeFeedbackShape(parsed, fallbackText) {
  const sanitizedFallback = sanitizeExternalAiText(fallbackText);
  return {
    overview: typeof parsed?.overview === "string" && parsed.overview.trim() ? sanitizeExternalAiText(parsed.overview.trim()) : sanitizedFallback,
    keySignals: sanitizeStringArray(parsed?.keySignals),
    cautions: sanitizeStringArray(parsed?.cautions),
    nextActions: sanitizeStringArray(parsed?.nextActions),
    followUpQuestions: Array.isArray(parsed?.followUpQuestions) ? sanitizeStringArray(parsed.followUpQuestions) : [],
    confidence: typeof parsed?.confidence === "string" && parsed.confidence.trim() ? sanitizeExternalAiText(parsed.confidence.trim()) : "中",
    disclaimer:
      typeof parsed?.disclaimer === "string" && parsed.disclaimer.trim()
        ? sanitizeExternalAiText(parsed.disclaimer.trim())
        : "AI は盤面と相談文を補助的に整理する役割です。最終判断は一次情報と現実条件を優先してください。",
  };
}

function extractTextContent(responseJson) {
  if (!Array.isArray(responseJson?.content)) return "";
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
    "資料名、ファイル種別、参照元名、項目番号には言及しないでください。",
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
        .map((item) => `- ${sanitizeExternalAiText(item.label)}: ${sanitizeExternalAiText(item.value)}`)
        .join("\n")
    : "";
  const taiitsuContext =
    payload.mode === "taiitsu" && payload.taiitsuContext
      ? [
          `方位: ${sanitizeExternalAiText(payload.taiitsuContext.direction)}`,
          `起局条件: ${sanitizeExternalAiText(payload.taiitsuContext.startCondition)}`,
          `補正時刻: ${sanitizeExternalAiText(payload.taiitsuContext.correctedDateTime)}`,
          `地点: ${sanitizeExternalAiText(payload.taiitsuContext.locationLabel)}`,
          `局序: ${payload.taiitsuContext.cycleIndex + 1}`,
        ].join("\n")
      : "";

  return [
    `占術: ${sanitizeExternalAiText(payload.modeLabel)}`,
    `占的: ${sanitizeExternalAiText(payload.topic)}`,
    `相談文: ${sanitizeExternalAiText(payload.questionText)}`,
    highlights ? `注目ポイント:\n${highlights}` : "",
    taiitsuContext ? `太乙神数 専用条件:\n${taiitsuContext}` : "",
    `盤面要約:\n${sanitizeExternalAiText(payload.chartSummary)}`,
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
  if (payload.mode !== "taiitsu") return null;
  const ctx = payload.taiitsuContext;
  if (!ctx || typeof ctx !== "object") return "太乙神数では taiitsuContext が必須です。";
  const missing = ["direction", "startCondition", "correctedDateTime", "locationLabel"].find(
    (f) => typeof ctx[f] !== "string" || !ctx[f].trim(),
  );
  if (missing) return `太乙神数では taiitsuContext.${missing} が必須です。`;
  if (typeof ctx.cycleIndex !== "number" || !Number.isFinite(ctx.cycleIndex)) {
    return "太乙神数では taiitsuContext.cycleIndex が数値である必要があります。";
  }
  return null;
}

async function callAnthropic(payload, env) {
  const model = env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const maxTokens = Number(env.AI_FEEDBACK_MAX_TOKENS || DEFAULT_MAX_TOKENS);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      system: buildSystemPrompt(payload.modeLabel),
      messages: [{ role: "user", content: buildUserPrompt(payload) }],
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json?.error?.message || "Claude API の呼び出しに失敗しました。";
    throw new Error(message);
  }

  const text = extractTextContent(json);
  const parsed = tryParseJson(text);
  return { feedback: normalizeFeedbackShape(parsed, text || "AI から有効な応答を取得できませんでした。"), model };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "POST のみ対応しています。" }, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(503, { ok: false, error: "Anthropic API キーが未設定です。" }, origin);
    }

    const gateMode = env.AI_FEEDBACK_MODE || "disabled";

    if (gateMode === "disabled") {
      return jsonResponse(403, { ok: false, error: "AI フィードバックは現在オフです。" }, origin);
    }

    if (gateMode === "paid") {
      return jsonResponse(
        402,
        {
          ok: false,
          error: "AI フィードバックは有料プラン向けです。",
          requiresPayment: true,
          checkoutUrl: env.AI_FEEDBACK_CHECKOUT_URL || "",
        },
        origin,
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "リクエストボディが不正です。" }, origin);
    }

    if (!SUPPORTED_MODES.has(payload?.mode)) {
      return jsonResponse(400, { ok: false, error: "未対応の占術モードです。" }, origin);
    }

    if (!payload?.questionText || typeof payload.questionText !== "string" || payload.questionText.trim().length < 6) {
      return jsonResponse(400, { ok: false, error: "相談文は6文字以上で入力してください。" }, origin);
    }

    if (!payload?.chartSummary || typeof payload.chartSummary !== "string") {
      return jsonResponse(400, { ok: false, error: "盤面要約が不足しています。" }, origin);
    }

    const taiitsuError = validateTaiitsuPayload(payload);
    if (taiitsuError) {
      return jsonResponse(400, { ok: false, error: taiitsuError }, origin);
    }

    try {
      const { feedback, model } = await callAnthropic(
        {
          mode: payload.mode,
          modeLabel: sanitizeExternalAiText(payload.modeLabel || payload.mode || "占断"),
          topic: sanitizeExternalAiText(payload.topic || "総合"),
          questionText: sanitizeExternalAiText(payload.questionText.trim()),
          chartSummary: sanitizeExternalAiText(payload.chartSummary),
          highlights: payload.highlights || [],
          taiitsuContext: payload.taiitsuContext,
        },
        env,
      );

      return jsonResponse(200, { ok: true, model, feedback }, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI フィードバックの生成に失敗しました。";
      return jsonResponse(500, { ok: false, error: message }, origin);
    }
  },
};
