import { Solar } from "lunar-typescript";

import { buildConsultationParagraphs, inferTopicFromQuestion } from "./consultation";
import { collectSourceReferences, resolveChartCertainty } from "./chartUx";
import { BRANCHES, GANZHI_CYCLE } from "./data/core";
import { resolveLocationOffset } from "./location";
import { findTaiitsuKnowledgeEntries, getTaiitsuKnowledgeIndex, summarizeTaiitsuKnowledgeEntry } from "./taiitsuKnowledge";
import type {
  Branch,
  ChartCertainty,
  DivinationTopic,
  Ganzhi,
  NarrativeSection,
  RuleTrace,
  SourceReference,
  Stem,
  TaiitsuBasis,
  TaiitsuChart,
  TaiitsuInput,
  TaiitsuKnowledgeEntry,
  TaiitsuSignal,
  TaiitsuStartCondition,
} from "./types";

const START_CONDITION_LABELS: Record<TaiitsuStartCondition, string> = {
  time: "時刻起局",
  direction: "方位起局",
  "time-and-direction": "時刻・方位併用",
};

const START_CONDITION_OFFSETS: Record<TaiitsuStartCondition, number> = {
  time: 0,
  direction: 24,
  "time-and-direction": 48,
};

const TAIITSU_PALACE_LABELS = ["一宮", "二宮", "三宮", "四宮", "五宮", "六宮", "七宮", "八宮", "九宮", "十宮", "十一宮", "十二宮"] as const;

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function toWallClockDate(input: Pick<TaiitsuInput, "year" | "month" | "day" | "hour" | "minute">) {
  return new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute));
}

function addMinutes(date: Date, offsetMinutes: number) {
  return new Date(date.getTime() + offsetMinutes * 60_000);
}

function getUtcParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function formatUtcDateTime(date: Date) {
  const parts = getUtcParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function getGanzhiParts(date: Date) {
  const parts = getUtcParts(date);
  const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0).getLunar();
  const dayGanzhi = lunar.getDayInGanZhiExact() as Ganzhi;
  const hourGanzhi = lunar.getTimeInGanZhi() as Ganzhi;
  const [dayStem, dayBranch] = dayGanzhi.split("") as [Stem, Branch];
  const hourBranch = hourGanzhi.charAt(1) as Branch;
  return { dayGanzhi, dayStem, dayBranch, hourBranch };
}

function resolveDirectionAnchor(input: TaiitsuInput, hourBranch: Branch) {
  const directionIndex = BRANCHES.indexOf(input.direction);
  const hourIndex = BRANCHES.indexOf(hourBranch);

  if (input.startCondition === "direction") {
    return input.direction;
  }

  if (input.startCondition === "time-and-direction") {
    return BRANCHES[mod(directionIndex + hourIndex, BRANCHES.length)];
  }

  return hourBranch;
}

function getTaiitsuSourceReference(entry: TaiitsuKnowledgeEntry): SourceReference {
  return {
    id: `taiitsu:${entry.entryId}`,
    label: entry.sectionTitle,
    detail: `PDF p.${entry.pageStart}${entry.pageEnd !== entry.pageStart ? `-${entry.pageEnd}` : ""} / ${summarizeTaiitsuKnowledgeEntry(entry, 86)}`,
    chapter: entry.chapterTitle,
  };
}

function buildCycleGrid(anchor: Branch, cycleIndex: number) {
  const anchorIndex = BRANCHES.indexOf(anchor);
  return TAIITSU_PALACE_LABELS.map((label, index) => {
    const branch = BRANCHES[mod(anchorIndex + index + cycleIndex, BRANCHES.length)];
    return {
      index: index + 1,
      label,
      branch,
      source: `cycle-${cycleIndex + 1}`,
    };
  });
}

function buildSignals(params: {
  input: TaiitsuInput;
  basis: TaiitsuBasis;
  matchedEntries: readonly TaiitsuKnowledgeEntry[];
  resolvedTopic: DivinationTopic;
}): TaiitsuSignal[] {
  const { input, basis, matchedEntries, resolvedTopic } = params;
  const primaryEntry = matchedEntries[0];

  return [
    {
      key: "start-condition",
      title: "起局条件",
      value: START_CONDITION_LABELS[input.startCondition],
      isPrimary: true,
    },
    {
      key: "direction",
      title: "方位",
      value: `${input.direction}方 / 起点 ${basis.directionAnchor}`,
      isPrimary: true,
    },
    {
      key: "cycle-index",
      title: "七十二局序",
      value: `${basis.cycleIndex + 1}局`,
      isPrimary: true,
    },
    {
      key: "day-hour",
      title: "日辰・時支",
      value: `${basis.dayGanzhi} / ${basis.hourBranch}`,
      isPrimary: false,
    },
    {
      key: "topic",
      title: "占的",
      value: resolvedTopic,
      isPrimary: false,
    },
    {
      key: "knowledge",
      title: "高精度根拠",
      value: primaryEntry ? `${primaryEntry.chapterTitle} p.${primaryEntry.pageStart}` : "PDF根拠未照合",
      isPrimary: false,
    },
  ];
}

function buildTaiitsuTraces(basis: TaiitsuBasis, matchedEntries: readonly TaiitsuKnowledgeEntry[]): RuleTrace[] {
  const primaryRef = matchedEntries[0] ? getTaiitsuSourceReference(matchedEntries[0]) : {
    id: "taiitsu:knowledge-index",
    label: "太乙神数構造化インデックス",
    detail: "PDFから生成したページ単位インデックス",
    chapter: "knowledge",
  };

  return [
    {
      ruleId: "taiitsu.corrected-datetime",
      step: "地方時差補正",
      value: basis.correctedDateTime,
      source: "location-offset",
      sourceRef: {
        id: `taiitsu:time:${basis.locationLabel}`,
        label: "地方時差補正",
        detail: `${basis.locationLabel} / ${basis.locationOffsetMinutes >= 0 ? "+" : ""}${basis.locationOffsetMinutes}分`,
        chapter: "basis",
      },
      reason: "入力日時に地点別の地方時差を加算して基準時刻を固定しています。",
      certainty: "confirmed",
    },
    {
      ruleId: "taiitsu.day-hour",
      step: "日干支・時支",
      value: `${basis.dayGanzhi} / ${basis.hourBranch}`,
      source: "lunar-typescript",
      sourceRef: primaryRef,
      reason: "補正後の日時から日干支と時支を確定しています。",
      certainty: "confirmed",
    },
    {
      ruleId: "taiitsu.direction-anchor",
      step: "方位起点",
      value: basis.directionAnchor,
      source: "taiitsu-input",
      sourceRef: primaryRef,
      reason: "起局条件に応じて時支・方位・併用条件から盤の起点を定めています。",
      certainty: "derived",
      approximation: "PDF構造化情報を参照する中間表現として固定",
    },
    {
      ruleId: "taiitsu.cycle-index",
      step: "七十二局序",
      value: `${basis.cycleIndex + 1}`,
      source: "taiitsu-derived-cycle",
      sourceRef: primaryRef,
      reason: "日干支、時支、方位、起局条件を同一入力で再現可能な局序に正規化しています。",
      certainty: "derived",
      approximation: "詳細術式の逐条実装前の安定インデックス",
    },
  ];
}

function buildExplanationSections(
  input: TaiitsuInput,
  basis: TaiitsuBasis,
  matchedEntries: readonly TaiitsuKnowledgeEntry[],
): NarrativeSection[] {
  const sourceLines = matchedEntries.slice(0, 4).map((entry) => `${entry.chapterTitle} / ${entry.sectionTitle} / p.${entry.pageStart}`);

  return [
    {
      key: "taiitsu-foundation",
      title: "作盤の根拠",
      paragraphs: [
        `入力時刻 ${basis.wallClockDateTime} を ${basis.locationLabel} の地方時差 ${basis.locationOffsetMinutes >= 0 ? "+" : ""}${basis.locationOffsetMinutes}分で補正し、基準時刻 ${basis.correctedDateTime} としています。`,
        `日干支は ${basis.dayGanzhi}、時支は ${basis.hourBranch}。起局条件は ${START_CONDITION_LABELS[input.startCondition]}、方位は ${input.direction}、盤の起点は ${basis.directionAnchor} です。`,
      ],
    },
    {
      key: "taiitsu-knowledge",
      title: "PDF根拠参照",
      paragraphs: [
        sourceLines.length
          ? `今回の中間判定は、構造化済みPDFインデックスから ${sourceLines.join(" / ")} を優先根拠として参照しています。`
          : "PDF構造化インデックスに一致する根拠候補が少ないため、入力条件と基本時刻情報を中心に表示しています。",
        `生成済み知識基盤は ${getTaiitsuKnowledgeIndex().audit.pagesScanned} ページ、${getTaiitsuKnowledgeIndex().audit.entriesCount} エントリです。`,
      ],
    },
    {
      key: "taiitsu-cycle",
      title: "局序と盤面",
      paragraphs: [
        `七十二局序は ${basis.cycleIndex + 1} 局として正規化しました。これは同一入力から同一JSONを再現するための安定キーで、今後の逐条ルール実装時も検証単位として使います。`,
      ],
    },
  ];
}

function buildInterpretationSections(input: TaiitsuInput, resolvedTopic: DivinationTopic, basis: TaiitsuBasis): NarrativeSection[] {
  const sections: NarrativeSection[] = [];
  const consultationParagraphs = buildConsultationParagraphs(input.questionText, resolvedTopic);

  if (consultationParagraphs.length) {
    sections.push({
      key: "taiitsu-consultation",
      title: "相談文への寄せ方",
      paragraphs: consultationParagraphs,
    });
  }

  sections.push({
    key: "taiitsu-topic",
    title: `${resolvedTopic}の見立て`,
    paragraphs: [
      `太乙神数では時・方位・局序を分けて確認します。今回は ${basis.directionAnchor} を起点に、${basis.cycleIndex + 1} 局の盤面として、方位 ${basis.direction} と日辰 ${basis.dayGanzhi} の重なりを主信号に置きます。`,
      "現段階ではPDF根拠をページ単位で照合し、計算過程を trace に保存しています。詳細な格局・星曜判断は、この中間表現へ逐条ルールを追加して精度を上げる前提です。",
    ],
  });

  return sections;
}

export function buildTaiitsuChart(input: TaiitsuInput): TaiitsuChart {
  const location = resolveLocationOffset(input.locationId);
  const wallClockDate = toWallClockDate(input);
  const correctedDate = addMinutes(wallClockDate, location.offsetMinutes);
  const parts = getUtcParts(correctedDate);
  const ganzhiParts = getGanzhiParts(correctedDate);
  const directionAnchor = resolveDirectionAnchor(input, ganzhiParts.hourBranch);
  const dayCycleIndex = GANZHI_CYCLE.indexOf(ganzhiParts.dayGanzhi);
  const cycleIndex = mod(dayCycleIndex + parts.hour + BRANCHES.indexOf(input.direction) + START_CONDITION_OFFSETS[input.startCondition], 72);
  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);

  const basis: TaiitsuBasis = {
    wallClockDateTime: formatUtcDateTime(wallClockDate),
    correctedDateTime: formatUtcDateTime(correctedDate),
    locationLabel: location.label,
    locationOffsetMinutes: location.offsetMinutes,
    direction: input.direction,
    startCondition: input.startCondition,
    dayGanzhi: ganzhiParts.dayGanzhi,
    dayStem: ganzhiParts.dayStem,
    dayBranch: ganzhiParts.dayBranch,
    hourBranch: ganzhiParts.hourBranch,
    directionAnchor,
    cycleIndex,
  };

  const matchedEntries = findTaiitsuKnowledgeEntries([
    "太乙",
    "測局",
    "求め方",
    "方位",
    "局",
    START_CONDITION_LABELS[input.startCondition],
    input.direction,
    resolvedTopic,
  ]);
  const signals = buildSignals({ input, basis, matchedEntries, resolvedTopic });
  const traces = buildTaiitsuTraces(basis, matchedEntries);
  const sourceReferences = collectSourceReferences(traces, matchedEntries.map(getTaiitsuSourceReference));
  const certainty: ChartCertainty = resolveChartCertainty(traces, "derived");
  const audit = getTaiitsuKnowledgeIndex().audit;
  const messages = [
    `PDF知識基盤: ${audit.pagesScanned}ページ / ${audit.entriesCount}エントリ / 欠落ページ ${audit.missingPageCount}`,
    `照合率: ${audit.textCoverageRatio ?? "未計算"} / 空本文 ${audit.emptyBodyCount} / ID重複 ${audit.duplicateEntryIdCount}`,
  ];

  return {
    topic: resolvedTopic,
    resolvedTopic,
    questionText: input.questionText,
    basis,
    signals,
    cycleGrid: buildCycleGrid(directionAnchor, cycleIndex),
    traces,
    sourceReferences,
    certainty,
    explanationSections: buildExplanationSections(input, basis, matchedEntries),
    interpretationSections: buildInterpretationSections(input, resolvedTopic, basis),
    summary: {
      headline: `${resolvedTopic} / ${START_CONDITION_LABELS[input.startCondition]} / ${cycleIndex + 1}局`,
      coreSignals: signals.filter((signal) => signal.isPrimary),
    },
    messages,
  };
}

