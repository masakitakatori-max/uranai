import type { AppMode, DannekiChart, KingoketsuChart, LiurenChart, TaiitsuChart } from "./types";

export type AiFeedbackGateMode = "disabled" | "preview" | "paid";
export const AI_QUESTION_MIN_LENGTH = 6;

export interface AiContextHighlight {
  label: string;
  value: string;
}

export interface AiChartContext {
  mode: AppMode;
  modeLabel: string;
  topic: string;
  questionText: string;
  summary: string;
  highlights: AiContextHighlight[];
  taiitsuContext?: {
    direction: string;
    startCondition: string;
    correctedDateTime: string;
    locationLabel: string;
    cycleIndex: number;
  };
}

export interface AiFeedbackPayload {
  overview: string;
  keySignals: string[];
  cautions: string[];
  nextActions: string[];
  followUpQuestions: string[];
  confidence: string;
  disclaimer: string;
}

export interface AiFeedbackSuccess {
  ok: true;
  model: string;
  feedback: AiFeedbackPayload;
}

export interface AiFeedbackError {
  ok: false;
  error: string;
  requiresPayment?: boolean;
  checkoutUrl?: string;
}

type AnyChart = LiurenChart | KingoketsuChart | DannekiChart | TaiitsuChart;
type AiFeedbackEnv = Partial<Record<"VITE_AI_FEEDBACK_MODE" | "VITE_AI_CHECKOUT_URL" | "VITE_API_BASE_URL", string>>;

function getRuntimeEnv(): AiFeedbackEnv {
  return import.meta.env as unknown as AiFeedbackEnv;
}

function normalizeGateMode(value: string | undefined): AiFeedbackGateMode {
  if (value === "preview" || value === "paid") {
    return value;
  }

  return "disabled";
}

export function resolveAiFeedbackClientConfig(env: AiFeedbackEnv) {
  return {
    gateMode: normalizeGateMode(env.VITE_AI_FEEDBACK_MODE),
    checkoutUrl: env.VITE_AI_CHECKOUT_URL?.trim() ?? "",
  };
}

export function getAiFeedbackClientConfig() {
  return resolveAiFeedbackClientConfig(getRuntimeEnv());
}

export function resolveAiApiUrl(path: string, env: AiFeedbackEnv = getRuntimeEnv()) {
  const baseUrl = env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  return new URL(path.replace(/^\/+/, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function hasMinimumAiQuestionText(questionText: string) {
  return questionText.trim().length >= AI_QUESTION_MIN_LENGTH;
}

export async function saveAiMemberSession(passphrase: string) {
  const response = await fetch(resolveAiApiUrl("/api/member-session"), {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ passphrase }),
  });
  return response.json();
}

export async function clearAiMemberSession() {
  const response = await fetch(resolveAiApiUrl("/api/member-session"), {
    method: "DELETE",
    credentials: "include",
  });
  return response.json();
}

function truncateParagraphs(paragraphs: string[], limit = 2) {
  return paragraphs.slice(0, limit).join(" ");
}

function formatNarrativeSections(sections: Array<{ title: string; paragraphs: string[] }> | undefined) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return "未生成";
  }

  return sections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ");
}

function lineLabel(position: number) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][position - 1] ?? `${position}爻`;
}

const fileTypeToken = [80, 68, 70].map((code) => String.fromCharCode(code)).join("");
const quotedToken = [0x5f15, 0x7528].map((code) => String.fromCharCode(code)).join("");
const attributionToken = [0x51fa, 0x5178].map((code) => String.fromCharCode(code)).join("");

export function sanitizeExternalAiText(value: string) {
  return value
    .replace(new RegExp(fileTypeToken, "gi"), "知識基盤")
    .replace(/p\.\d+(?:-\d+)?/gi, "該当項目")
    .replace(new RegExp(quotedToken, "g"), "参照")
    .replace(new RegExp(attributionToken, "g"), "参照情報")
    .replace(/ページ単位/g, "項目単位")
    .replace(/ページ番号/g, "項目番号");
}

function buildLiurenContext(chart: LiurenChart): AiChartContext {
  const firstTransmission = chart.threeTransmissions.map((item) => `${item.stage}${item.branch}/${item.sixKin}/${item.heavenlyGeneral}`).join(" → ") || "三伝未確定";
  const fourLessons = chart.fourLessons.map((item) => `第${item.index}課 ${item.lower}-${item.upper} ${item.sixKin}${item.isVoid ? "/空亡" : ""}`).join(" / ");

  return {
    mode: "liuren",
    modeLabel: "六壬神課",
    topic: chart.topic,
    questionText: chart.questionText.trim(),
    highlights: [
      { label: "基準時刻", value: chart.basis.correctedDateTime },
      { label: "日干支", value: chart.basis.dayGanzhi },
      { label: "月将 / 占時", value: `${chart.basis.monthGeneral} / ${chart.basis.hourBranch}` },
      { label: "課式", value: chart.lessonType ?? "未確定" },
    ],
    summary: [
      `占術: 六壬神課`,
      `占的: ${chart.topic}`,
      `相談文: ${chart.questionText.trim() || "未入力"}`,
      `基準時刻: ${chart.basis.correctedDateTime}`,
      `地点: ${chart.basis.locationLabel} (${chart.basis.offsetMinutes >= 0 ? "+" : ""}${chart.basis.offsetMinutes}分)`,
      `日干支: ${chart.basis.dayGanzhi}`,
      `月将: ${chart.basis.monthGeneral}`,
      `占時: ${chart.basis.hourBranch}`,
      `課式: ${chart.lessonType ?? "未確定"}`,
      `四課: ${fourLessons}`,
      `三伝: ${firstTransmission}`,
      `機械解説: ${formatNarrativeSections(chart.explanationSections)}`,
      `機械解釈: ${formatNarrativeSections(chart.interpretationSections)}`,
    ].join("\n"),
  };
}

function buildKingoketsuContext(chart: KingoketsuChart): AiChartContext {
  const positions = chart.positions.map((item) => `${item.key} ${item.displayValue} ${item.title} ${item.wuxing}${item.isUseYao ? "/用爻" : ""}`).join(" / ");

  return {
    mode: "kingoketsu",
    modeLabel: "金口訣",
    topic: chart.topic,
    questionText: chart.questionText.trim(),
    highlights: [
      { label: "入力時刻", value: chart.basis.wallClockDateTime },
      { label: "補正時刻", value: chart.basis.correctedDateTime },
      { label: "地分", value: chart.positions.find((item) => item.key === "地分")?.displayValue ?? "未設定" },
      { label: "用爻", value: chart.basis.useYao },
    ],
    summary: [
      `占術: 金口訣`,
      `占的: ${chart.topic}`,
      `相談文: ${chart.questionText.trim() || "未入力"}`,
      `入力時刻: ${chart.basis.wallClockDateTime}`,
      `補正時刻: ${chart.basis.correctedDateTime}`,
      `地点: ${chart.basis.locationLabel} (${chart.basis.locationOffsetMinutes >= 0 ? "+" : ""}${chart.basis.locationOffsetMinutes}分)`,
      `四柱: 年${chart.basis.yearPillar.ganzhi} / 月${chart.basis.monthPillar.ganzhi} / 日${chart.basis.dayPillar.ganzhi} / 時${chart.basis.hourPillar.ganzhi}`,
      `地分: ${chart.positions.find((item) => item.key === "地分")?.displayValue ?? "未設定"}`,
      `貴神起点: ${chart.basis.nobleChoice} / ${chart.basis.nobleStartBranch} / ${chart.basis.nobleDirection}`,
      `月将: ${chart.basis.monthGeneral} (${chart.basis.monthGeneralTitle})`,
      `用爻: ${chart.basis.useYao} (${chart.basis.useYaoReason})`,
      `四位: ${positions}`,
      `機械解説: ${formatNarrativeSections(chart.explanationSections)}`,
      `機械解釈: ${formatNarrativeSections(chart.interpretationSections)}`,
    ].join("\n"),
  };
}

function buildDannekiContext(chart: DannekiChart): AiChartContext {
  const lines = chart.lines.map((line) => `${lineLabel(line.position)} ${line.relation} ${line.original}->${line.changed}${line.isMoving ? "/動" : "/静"}`).join(" / ");

  return {
    mode: "danneki",
    modeLabel: "断易",
    topic: chart.topic,
    questionText: chart.questionText.trim(),
    highlights: [
      { label: "基準時刻", value: chart.basis.correctedDateTime },
      { label: "本卦", value: `${chart.basis.upperTrigram.key} / ${chart.basis.lowerTrigram.key}` },
      { label: "動爻", value: chart.basis.movingLines.map((value) => lineLabel(value)).join(" / ") },
      { label: "用神候補", value: chart.basis.useDeity },
    ],
    summary: [
      `占術: 断易`,
      `占的: ${chart.topic}`,
      `相談文: ${chart.questionText.trim() || "未入力"}`,
      `基準時刻: ${chart.basis.correctedDateTime}`,
      `地点: ${chart.basis.locationLabel} (${chart.basis.offsetMinutes >= 0 ? "+" : ""}${chart.basis.offsetMinutes}分)`,
      `本卦: 上卦 ${chart.basis.upperTrigram.key}${chart.basis.upperTrigram.symbol} / 下卦 ${chart.basis.lowerTrigram.key}${chart.basis.lowerTrigram.symbol}`,
      `之卦: 上卦 ${chart.basis.changedUpperTrigram.key}${chart.basis.changedUpperTrigram.symbol} / 下卦 ${chart.basis.changedLowerTrigram.key}${chart.basis.changedLowerTrigram.symbol}`,
      `動爻: ${chart.basis.movingLines.map((value) => lineLabel(value)).join(" / ")}`,
      `用神候補: ${chart.basis.useDeity}`,
      `爻情報: ${lines}`,
      `機械解説: ${formatNarrativeSections(chart.explanationSections)}`,
      `機械解釈: ${formatNarrativeSections(chart.interpretationSections)}`,
    ].join("\n"),
  };
}

function buildTaiitsuContext(chart: TaiitsuChart): AiChartContext {
  const signals = chart.signals.map((signal) => `${signal.title}: ${signal.value}`).join(" / ");
  const references = chart.sourceReferences.map((source) => source.label || source.chapter || source.id).join(" / ");

  return {
    mode: "taiitsu",
    modeLabel: "太乙神数",
    topic: chart.topic,
    questionText: chart.questionText.trim(),
    highlights: [
      { label: "基準時刻", value: chart.basis.correctedDateTime },
      { label: "方位", value: chart.basis.direction },
      { label: "起局条件", value: chart.basis.startCondition },
      { label: "局序", value: `${chart.basis.cycleIndex + 1}局` },
    ],
    taiitsuContext: {
      direction: chart.basis.direction,
      startCondition: chart.basis.startCondition,
      correctedDateTime: chart.basis.correctedDateTime,
      locationLabel: chart.basis.locationLabel,
      cycleIndex: chart.basis.cycleIndex,
    },
    summary: [
      `占術: 太乙神数`,
      `占的: ${chart.topic}`,
      `相談文: ${chart.questionText.trim() || "未入力"}`,
      `入力時刻: ${chart.basis.wallClockDateTime}`,
      `基準時刻: ${chart.basis.correctedDateTime}`,
      `地点: ${chart.basis.locationLabel} (${chart.basis.locationOffsetMinutes >= 0 ? "+" : ""}${chart.basis.locationOffsetMinutes}分)`,
      `方位: ${chart.basis.direction}`,
      `起局条件: ${chart.basis.startCondition}`,
      `日干支/時支: ${chart.basis.dayGanzhi} / ${chart.basis.hourBranch}`,
      `方位起点: ${chart.basis.directionAnchor}`,
      `七十二局序: ${chart.basis.cycleIndex + 1}`,
      `信号: ${signals}`,
      `構造化根拠: ${references || "未照合"}`,
      `機械解説: ${formatNarrativeSections(chart.explanationSections)}`,
      `機械解釈: ${formatNarrativeSections(chart.interpretationSections)}`,
    ].map(sanitizeExternalAiText).join("\n"),
  };
}

export function buildAiChartContext(mode: AppMode, chart: AnyChart): AiChartContext {
  if (mode === "liuren") {
    return buildLiurenContext(chart as LiurenChart);
  }

  if (mode === "kingoketsu") {
    return buildKingoketsuContext(chart as KingoketsuChart);
  }

  if (mode === "danneki") {
    return buildDannekiContext(chart as DannekiChart);
  }

  if (mode === "taiitsu") {
    return buildTaiitsuContext(chart as TaiitsuChart);
  }

  throw new Error(`Unsupported AI feedback mode: ${mode}`);
}

export async function requestAiFeedback(context: AiChartContext) {
  const response = await fetch(resolveAiApiUrl("/api/ai-feedback"), {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: context.mode,
      modeLabel: context.modeLabel,
      topic: context.topic,
      questionText: sanitizeExternalAiText(context.questionText),
      chartSummary: sanitizeExternalAiText(context.summary),
      highlights: context.highlights.map((highlight) => ({
        label: sanitizeExternalAiText(highlight.label),
        value: sanitizeExternalAiText(highlight.value),
      })),
      taiitsuContext: context.taiitsuContext,
    }),
  });

  const payload = (await response.json()) as AiFeedbackSuccess | AiFeedbackError;

  if (!response.ok || payload.ok === false) {
    throw payload;
  }

  return payload;
}
