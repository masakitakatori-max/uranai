import type { AppMode, DannekiChart, KingoketsuChart, LiurenChart } from "./types";

export type AiFeedbackGateMode = "disabled" | "preview" | "paid";

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

type AnyChart = LiurenChart | KingoketsuChart | DannekiChart;

function normalizeGateMode(value: string | undefined): AiFeedbackGateMode {
  if (value === "preview" || value === "paid") {
    return value;
  }

  return "disabled";
}

export function getAiFeedbackClientConfig() {
  return {
    gateMode: normalizeGateMode(import.meta.env.VITE_AI_FEEDBACK_MODE),
    checkoutUrl: import.meta.env.VITE_AI_CHECKOUT_URL?.trim() ?? "",
  };
}

function truncateParagraphs(paragraphs: string[], limit = 2) {
  return paragraphs.slice(0, limit).join(" ");
}

function lineLabel(position: number) {
  return ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"][position - 1] ?? `${position}爻`;
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
      `機械解説: ${chart.explanationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
      `機械解釈: ${chart.interpretationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
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
      `機械解説: ${chart.explanationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
      `機械解釈: ${chart.interpretationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
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
      `機械解説: ${chart.explanationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
      `機械解釈: ${chart.interpretationSections.map((section) => `${section.title}: ${truncateParagraphs(section.paragraphs)}`).join(" | ")}`,
    ].join("\n"),
  };
}

export function buildAiChartContext(mode: AppMode, chart: AnyChart): AiChartContext {
  if (mode === "liuren") {
    return buildLiurenContext(chart as LiurenChart);
  }

  if (mode === "kingoketsu") {
    return buildKingoketsuContext(chart as KingoketsuChart);
  }

  return buildDannekiContext(chart as DannekiChart);
}

export async function requestAiFeedback(context: AiChartContext) {
  const response = await fetch("/api/ai-feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      mode: context.mode,
      modeLabel: context.modeLabel,
      topic: context.topic,
      questionText: context.questionText,
      chartSummary: context.summary,
      highlights: context.highlights,
    }),
  });

  const payload = (await response.json()) as AiFeedbackSuccess | AiFeedbackError;

  if (!response.ok || payload.ok === false) {
    throw payload;
  }

  return payload;
}
