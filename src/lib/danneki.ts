import { Solar } from "lunar-typescript";

import { buildConsultationParagraphs, inferTopicFromQuestion, summarizeQuestion } from "./consultation";
import { collectSourceReferences, resolveChartCertainty } from "./chartUx";
import {
  DANNEKI_BOOK_CASES,
  type DannekiBookCase,
} from "./data/dannekiBookKnowledge";
import {
  TRIGRAM_ELEMENT,
  TRIGRAM_LINES,
  WORLD_RESPONSE_BY_VARIANT,
  getLineNajia,
  lookupPalace,
  type PalaceVariant,
} from "./data/dannekiNajia";
import { BRANCH_WUXING, STEM_WUXING, getBranchRelations, getSeasonalState, getSixKin } from "./data/rules";
import { resolveLocationOffset } from "./location";
import type {
  Branch,
  ChartCertainty,
  DannekiBasis,
  DannekiChart,
  DannekiInput,
  DannekiLine,
  DannekiSixSpirit,
  DannekiTopic,
  DannekiTrigram,
  DannekiUseDeity,
  DannekiUseGodRole,
  Ganzhi,
  NarrativeSection,
  RuleTrace,
  SeasonalState,
  SixKin,
  SourceReference,
  Stem,
  TrigramKey,
  Wuxing,
  YinYang,
} from "./types";

const TRIGRAM_ORDER: readonly TrigramKey[] = ["乾", "兌", "離", "震", "巽", "坎", "艮", "坤"];
const LINE_LABELS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

const TRIGRAMS: Record<TrigramKey, DannekiTrigram> = {
  乾: { key: "乾", symbol: "☰", image: "天", element: "金", keywords: ["主導", "剛健", "上昇"], lines: ["陽", "陽", "陽"] },
  兌: { key: "兌", symbol: "☱", image: "沢", element: "金", keywords: ["対話", "悦び", "開放"], lines: ["陽", "陽", "陰"] },
  離: { key: "離", symbol: "☲", image: "火", element: "火", keywords: ["可視化", "判断", "熱"], lines: ["陽", "陰", "陽"] },
  震: { key: "震", symbol: "☳", image: "雷", element: "木", keywords: ["始動", "刺激", "急変"], lines: ["陽", "陰", "陰"] },
  巽: { key: "巽", symbol: "☴", image: "風", element: "木", keywords: ["浸透", "調整", "交渉"], lines: ["陰", "陽", "陽"] },
  坎: { key: "坎", symbol: "☵", image: "水", element: "水", keywords: ["不安", "深掘り", "往復"], lines: ["陰", "陽", "陰"] },
  艮: { key: "艮", symbol: "☶", image: "山", element: "土", keywords: ["停止", "境界", "蓄積"], lines: ["陰", "陰", "陽"] },
  坤: { key: "坤", symbol: "☷", image: "地", element: "土", keywords: ["受容", "土台", "継続"], lines: ["陰", "陰", "陰"] },
};

const USE_DEITY_BY_TOPIC: Record<DannekiTopic, DannekiUseDeity> = {
  総合: "世応",
  仕事: "官鬼",
  金運: "妻財",
  恋愛: "世応",
  結婚: "世応",
  健康: "官鬼",
  失せ物: "父母",
  天気: "子孫",
};

const TOPIC_ACTION_TEXT: Record<DannekiTopic, string> = {
  総合: "全体の流れを見る課として、足元の整備と外圧への応答を分けて考えるのが先です。",
  仕事: "仕事では決裁者・責任・納期を分けて整理すると、卦の示すボトルネックが見えやすくなります。",
  金運: "金運では入ってくる話より、抜けていく穴を塞げるかが先決です。",
  恋愛: "恋愛では感情の強さより、相手が具体的に動く余地を確かめるのが重要です。",
  結婚: "結婚では関係の熱量より、生活設計をどこまで現実化できるかを重視します。",
  健康: "健康では気合いで押すより、悪化条件を一つずつ外す読み方が向いています。",
  失せ物: "失せ物では動線を戻る順番と、人手を借りる場面の切り分けが有効です。",
  天気: "天気では一点読みより、崩れる時間帯と持ち直す時間帯を分けて扱います。",
};

// 六神順序 by 日干
const SIX_SPIRIT_ORDER: Record<Stem, [DannekiSixSpirit, DannekiSixSpirit, DannekiSixSpirit, DannekiSixSpirit, DannekiSixSpirit, DannekiSixSpirit]> = {
  甲: ["青龍", "朱雀", "勾陳", "螣蛇", "白虎", "玄武"],
  乙: ["青龍", "朱雀", "勾陳", "螣蛇", "白虎", "玄武"],
  丙: ["朱雀", "勾陳", "螣蛇", "白虎", "玄武", "青龍"],
  丁: ["朱雀", "勾陳", "螣蛇", "白虎", "玄武", "青龍"],
  戊: ["勾陳", "螣蛇", "白虎", "玄武", "青龍", "朱雀"],
  己: ["螣蛇", "白虎", "玄武", "青龍", "朱雀", "勾陳"],
  庚: ["白虎", "玄武", "青龍", "朱雀", "勾陳", "螣蛇"],
  辛: ["白虎", "玄武", "青龍", "朱雀", "勾陳", "螣蛇"],
  壬: ["玄武", "青龍", "朱雀", "勾陳", "螣蛇", "白虎"],
  癸: ["玄武", "青龍", "朱雀", "勾陳", "螣蛇", "白虎"],
};

// useGod (用神) → (原神, 忌神, 仇神)
const USE_GOD_ROLE_TABLE: Record<SixKin, { 原神: SixKin; 忌神: SixKin; 仇神: SixKin }> = {
  父母: { 原神: "官鬼", 忌神: "妻財", 仇神: "子孫" },
  兄弟: { 原神: "父母", 忌神: "官鬼", 仇神: "妻財" },
  子孫: { 原神: "兄弟", 忌神: "父母", 仇神: "官鬼" },
  妻財: { 原神: "子孫", 忌神: "兄弟", 仇神: "父母" },
  官鬼: { 原神: "妻財", 忌神: "子孫", 仇神: "兄弟" },
};

const DANNEKI_SOURCE_REF: SourceReference = {
  id: "danneki-rules",
  label: "断易立卦規則",
  detail: "京房納甲法 + 増删卜易",
  chapter: "rules",
};

function toWallClockDate(input: Pick<DannekiInput, "year" | "month" | "day" | "hour" | "minute">) {
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

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSeed(input: DannekiInput, correctedDate: Date, resolvedTopic: DannekiTopic, offsetMinutes: number) {
  const parts = getUtcParts(correctedDate);
  const timeSeed = Number(`${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}${String(parts.hour).padStart(2, "0")}${String(parts.minute).padStart(2, "0")}`);
  return hashString(`${resolvedTopic}|${input.questionText}|${timeSeed}|${offsetMinutes}`) >>> 0;
}

function findTrigramByLines(lines: readonly YinYang[]) {
  const key = lines.join("");
  const match = TRIGRAM_ORDER.find((trigramKey) => TRIGRAM_LINES[trigramKey].join("") === key);
  return TRIGRAMS[match ?? "乾"];
}

function flipLine(value: YinYang): YinYang {
  return value === "陽" ? "陰" : "陽";
}

function lineLabel(position: number) {
  return LINE_LABELS[position - 1] ?? `${position}爻`;
}

function buildLineNote(position: number, relation: SixKin, isMoving: boolean) {
  const lead = `${lineLabel(position)}は${relation}`;
  if (isMoving) return `${lead}として動き、論点が表面化しやすい箇所です。`;
  if (position <= 2) return `${lead}として足元と初動に現れます。`;
  if (position <= 4) return `${lead}として判断と交渉の中核に現れます。`;
  return `${lead}として外部条件と結論側に現れます。`;
}

function valueToYinYang(value: 6 | 7 | 8 | 9): YinYang {
  return value === 7 || value === 9 ? "陽" : "陰";
}

function valueIsMoving(value: 6 | 7 | 8 | 9) {
  return value === 6 || value === 9;
}

function deriveAutoLineValues(seed: number, questionLength: number): Array<6 | 7 | 8 | 9> {
  // 時刻+質問のシードから 6/7/8/9 を6本生成 (近似 = 時刻法)
  // 動爻数: 質問文の長さで 1〜3 本
  const movingCount = questionLength > 40 ? 3 : questionLength > 0 ? 2 : 1;
  let cursor = seed || 1;
  const movingPositions = new Set<number>();
  while (movingPositions.size < movingCount) {
    cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0;
    movingPositions.add((cursor % 6) + 1);
  }
  const values: Array<6 | 7 | 8 | 9> = [];
  for (let position = 1; position <= 6; position += 1) {
    cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0;
    const isYang = (cursor & 1) === 1;
    const isMoving = movingPositions.has(position);
    if (isMoving) {
      values.push(isYang ? 9 : 6);
    } else {
      values.push(isYang ? 7 : 8);
    }
  }
  return values;
}

function getMonthBranchFromLunar(date: Date): Branch {
  const parts = getUtcParts(date);
  const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0).getLunar();
  const monthGanzhi = lunar.getMonthInGanZhiExact();
  return monthGanzhi.charAt(1) as Branch;
}

function getDayGanzhiAndVoid(date: Date): { dayGanzhi: Ganzhi; voidBranches: [Branch, Branch] } {
  const parts = getUtcParts(date);
  const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0).getLunar();
  const dayGanzhi = lunar.getDayInGanZhiExact() as Ganzhi;
  const xunKong = lunar.getDayXunKongExact();
  const voidBranches = xunKong.split("") as [Branch, Branch];
  return { dayGanzhi, voidBranches };
}

const CHONG_PAIR: Record<Branch, Branch> = {
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
};

function isMonthBroken(lineBranch: Branch, monthBranch: Branch) {
  return CHONG_PAIR[monthBranch] === lineBranch;
}

function getDayRelationsFor(lineBranch: Branch, dayBranch: Branch): { relations: string[]; isDayChong: boolean; isDayHe: boolean } {
  const relations = getBranchRelations(lineBranch, dayBranch);
  return {
    relations,
    isDayChong: relations.includes("冲"),
    isDayHe: relations.some((value) => value.includes("合")),
  };
}

function chooseUseGodLine(lines: readonly DannekiLine[], useDeity: DannekiUseDeity, worldLine: 1 | 2 | 3 | 4 | 5 | 6): { line: 1 | 2 | 3 | 4 | 5 | 6 | null; reason: string } {
  if (useDeity === "世応") {
    return { line: worldLine, reason: "世応用神では世爻を相談者の用神として採用。" };
  }
  const candidates = lines.filter((line) => line.relation === useDeity);
  if (!candidates.length) {
    return { line: null, reason: `用神「${useDeity}」が本卦に現れず、伏神を要追跡。` };
  }
  // 優先順: 月破でない > 空亡でない > 動爻 > 上の爻
  const ranked = [...candidates].sort((left, right) => {
    const score = (line: DannekiLine) =>
      (line.isMonthBroken ? 0 : 8) +
      (line.isVoid ? 0 : 4) +
      (line.isMoving ? 2 : 0) +
      line.position * 0.1;
    return score(right) - score(left);
  });
  const top = ranked[0];
  const reason = top.isMonthBroken
    ? `用神候補が月破に該当するが、最も整った位置 ${lineLabel(top.position)} を採用。`
    : `用神候補のうち、月破・空亡を避け強度の高い ${lineLabel(top.position)} を採用。`;
  return { line: top.position, reason };
}

function assignUseGodRoles(lines: DannekiLine[], useDeity: DannekiUseDeity, useGodLine: 1 | 2 | 3 | 4 | 5 | 6 | null) {
  if (useDeity === "世応" || !USE_GOD_ROLE_TABLE[useDeity as SixKin]) {
    if (useGodLine !== null) {
      const target = lines.find((line) => line.position === useGodLine);
      if (target) target.useGodRole = "用神";
    }
    return;
  }
  const roles = USE_GOD_ROLE_TABLE[useDeity as SixKin];
  for (const line of lines) {
    if (line.position === useGodLine) {
      line.useGodRole = "用神";
    } else if (line.relation === roles.原神) {
      line.useGodRole = "原神";
    } else if (line.relation === roles.忌神) {
      line.useGodRole = "忌神";
    } else if (line.relation === roles.仇神) {
      line.useGodRole = "仇神";
    }
  }
}

function tokenizeQuestion(question: string) {
  return question.replace(/\s+/g, "");
}

function findBookCase(question: string): DannekiBookCase | null {
  const normalized = tokenizeQuestion(question);
  if (!normalized) return null;
  let best: { case: DannekiBookCase; score: number } | null = null;
  for (const bookCase of DANNEKI_BOOK_CASES) {
    let score = 0;
    for (const token of bookCase.matchTokens) {
      if (normalized.includes(token.text)) {
        score += token.weight;
      }
    }
    if (score >= bookCase.matchThreshold) {
      if (!best || score > best.score) {
        best = { case: bookCase, score };
      }
    }
  }
  return best?.case ?? null;
}

function describeElementRelation(outer: Wuxing, inner: Wuxing) {
  const GENERATES: Record<Wuxing, Wuxing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const OVERCOMES: Record<Wuxing, Wuxing> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };
  if (outer === inner) return "内外の五行は同気で、流れを揃えやすい配置です。";
  if (GENERATES[inner] === outer) return "内卦が外卦を生じるため、内側の努力が外へ効きやすい配置です。";
  if (GENERATES[outer] === inner) return "外卦が内卦を生じるため、外部条件から押し上げが入りやすい配置です。";
  if (OVERCOMES[inner] === outer) return "内卦が外卦を剋するため、こちらの打ち手で局面を動かしやすい反面、押し過ぎると摩耗します。";
  return "外卦が内卦を剋するため、相手条件や環境圧を先に整えないと自力が削られやすい配置です。";
}

function formatLineSet(values: number[]) {
  return values.map((value) => lineLabel(value)).join(" / ");
}

function buildExplanationSections(
  input: DannekiInput,
  resolvedTopic: DannekiTopic,
  basis: DannekiBasis,
  lines: readonly DannekiLine[],
): NarrativeSection[] {
  const focusLines =
    basis.useDeity === "世応"
      ? lines.filter((line) => line.position === basis.worldLine || line.position === basis.responseLine)
      : lines.filter((line) => line.relation === basis.useDeity);

  return [
    {
      key: "danneki-foundation",
      title: "立卦の前提",
      paragraphs: [
        `入力日時を ${basis.locationLabel} の地方時差 ${basis.offsetMinutes >= 0 ? "+" : ""}${basis.offsetMinutes}分で補正し、基準時刻 ${basis.correctedDateTime} を採っています。日辰は ${basis.dayGanzhi}、月建は ${basis.monthBranch}、空亡は ${basis.voidBranches.join("・")} です。`,
        input.questionText.trim()
          ? `相談文は「${summarizeQuestion(input.questionText)}」です。自由入力からは「${resolvedTopic}」の問いとして読むのが最も自然でした。`
          : `相談文が空欄のため、選択された占的「${resolvedTopic}」をそのまま読み筋の中心に置いています。`,
      ],
    },
    {
      key: "danneki-structure",
      title: "卦象の骨格",
      paragraphs: [
        `本卦は 上卦 ${basis.upperTrigram.key}${basis.upperTrigram.symbol} / 下卦 ${basis.lowerTrigram.key}${basis.lowerTrigram.symbol}。宮は ${basis.palace ?? "未確定"} (${basis.palace ? TRIGRAM_ELEMENT[basis.palace] : "—"})、世爻は ${basis.worldLine ? lineLabel(basis.worldLine) : "未確定"}、応爻は ${basis.responseLine ? lineLabel(basis.responseLine) : "未確定"} です。`,
        `之卦は 上卦 ${basis.changedUpperTrigram.key}${basis.changedUpperTrigram.symbol} / 下卦 ${basis.changedLowerTrigram.key}${basis.changedLowerTrigram.symbol}。動いたのは ${formatLineSet(basis.movingLines)} です。`,
        describeElementRelation(basis.upperTrigram.element, basis.lowerTrigram.element),
      ],
    },
    {
      key: "danneki-use-deity",
      title: "用神候補",
      paragraphs: [
        basis.useDeity === "世応"
          ? `この相談は関係性の読みを優先し、世爻 ${basis.worldLine ? lineLabel(basis.worldLine) : "—"} を相談者の足場、応爻 ${basis.responseLine ? lineLabel(basis.responseLine) : "—"} を相手・外部条件の受け皿として扱います。`
          : `今回の用神候補は ${basis.useDeity} です。決定線は ${basis.useGodLine ? lineLabel(basis.useGodLine) : "未確定"}（${basis.useGodReason}）。該当するのは ${focusLines.length ? focusLines.map((line) => `${lineLabel(line.position)}`).join(" / ") : "明瞭な一点に偏らず、複数線へ分散しています。"}。`,
      ],
    },
  ];
}

function buildInterpretationSections(
  input: DannekiInput,
  resolvedTopic: DannekiTopic,
  basis: DannekiBasis,
  lines: readonly DannekiLine[],
  bookCase: DannekiBookCase | null,
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];
  const consultationParagraphs = buildConsultationParagraphs(input.questionText, resolvedTopic);
  const movingCore = lines.filter((line) => line.isMoving);
  const focusLines =
    basis.useDeity === "世応"
      ? lines.filter((line) => line.position === basis.worldLine || line.position === basis.responseLine)
      : lines.filter((line) => line.relation === basis.useDeity);

  if (consultationParagraphs.length) {
    sections.push({
      key: "danneki-consultation",
      title: "相談文への寄せ方",
      paragraphs: consultationParagraphs,
    });
  }

  sections.push({
    key: "danneki-topic",
    title: `${resolvedTopic}の見立て`,
    paragraphs: [
      `${TOPIC_ACTION_TEXT[resolvedTopic]} 本卦の下卦 ${basis.lowerTrigram.key} は「${basis.lowerTrigram.keywords.join("・")}」、上卦 ${basis.upperTrigram.key} は「${basis.upperTrigram.keywords.join("・")}」を帯びています。`,
      focusLines.length
        ? `${basis.useDeity === "世応" ? "関係線" : `用神 ${basis.useDeity}`} は ${focusLines.map((line) => `${lineLabel(line.position)}(${line.relation})`).join(" / ")} に現れています。足元よりも上段に寄るほど、相手都合や外部条件の比率が高い読みです。`
        : "用神が一か所に固まらないため、答えは一発で決めるより段階的に詰めるほうが外しにくい盤です。",
    ],
  });

  sections.push({
    key: "danneki-moving",
    title: "動爻の示唆",
    paragraphs: [
      movingCore.length
        ? `動いたのは ${movingCore.map((line) => `${lineLabel(line.position)}(${line.relation})`).join(" / ")} です。ここが現状維持では済まない変化点で、話が動くならこの層からです。`
        : "動爻が弱いため、局面は急変よりもじわじわ動く読みです。",
      `之卦の ${basis.changedLowerTrigram.key}/${basis.changedUpperTrigram.key} への遷移は、「${basis.changedLowerTrigram.keywords[0]}」から「${basis.changedUpperTrigram.keywords[0]}」へ重心が移ることを示します。`,
    ],
  });

  sections.push({
    key: "danneki-closing",
    title: "行動の要点",
    paragraphs: [
      basis.useDeity === "世応"
        ? "関係が主題の課なので、相手を読みにいく前に、自分が何を確認したいのかを一文で固定すると判断がぶれにくくなります。"
        : `まず ${basis.useDeity} に当たる線の強弱を確認し、その線を補う行動を先に置くと盤の示唆と噛み合いやすくなります。`,
      movingCore.some((line) => line.position >= 4)
        ? "上段の動きが強いので、結論を急ぐより相手側の反応待ちや外部条件の更新を挟むほうが得策です。"
        : "下段の動きが中心なので、まずは自分の準備・連絡・足元の整備から手を付けるのが筋です。",
    ],
  });

  if (bookCase) {
    sections.push({
      key: "danneki-book-case",
      title: `近い書籍例: ${bookCase.title}`,
      paragraphs: [
        `相談文「${summarizeQuestion(input.questionText)}」は書籍の「${bookCase.title}」(${bookCase.questionType}) と同質の問いです。出典: ${bookCase.sourceImage}。`,
        bookCase.coreLesson,
      ],
    });
  }

  return sections;
}

export function buildDannekiChart(input: DannekiInput): DannekiChart {
  const location = resolveLocationOffset(input.locationId);
  const correctedDate = addMinutes(toWallClockDate(input), location.offsetMinutes);
  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);
  const seed = buildSeed(input, correctedDate, resolvedTopic, location.offsetMinutes);

  // 立卦: manual (コイン法相当) または auto (時刻法近似)
  let lineValues: Array<6 | 7 | 8 | 9>;
  if (input.lineInputMode === "manual") {
    if (!input.manualLineValues || input.manualLineValues.length !== 6) {
      throw new Error("manualLineValues must contain exactly 6 entries when lineInputMode=manual");
    }
    lineValues = [...input.manualLineValues];
  } else {
    lineValues = deriveAutoLineValues(seed, input.questionText.trim().length);
  }

  const originalLines = lineValues.map(valueToYinYang);
  const movingLines: number[] = [];
  lineValues.forEach((value, index) => {
    if (valueIsMoving(value)) movingLines.push(index + 1);
  });
  const changedLines = originalLines.map((line, index) => (movingLines.includes(index + 1) ? flipLine(line) : line));

  const lowerTrigram = findTrigramByLines(originalLines.slice(0, 3));
  const upperTrigram = findTrigramByLines(originalLines.slice(3, 6));
  const changedLowerTrigram = findTrigramByLines(changedLines.slice(0, 3));
  const changedUpperTrigram = findTrigramByLines(changedLines.slice(3, 6));

  // 宮・世応
  const palaceEntry = lookupPalace(upperTrigram.key, lowerTrigram.key);
  const palace = palaceEntry.palace;
  const palaceVariant: PalaceVariant = palaceEntry.variant;
  const palaceElement = TRIGRAM_ELEMENT[palace];
  const { world, response } = WORLD_RESPONSE_BY_VARIANT[palaceVariant];

  // 日辰・月建・空亡
  const { dayGanzhi, voidBranches } = getDayGanzhiAndVoid(correctedDate);
  const dayStem = dayGanzhi.charAt(0) as Stem;
  const dayBranch = dayGanzhi.charAt(1) as Branch;
  const dayElement = STEM_WUXING[dayStem];
  const monthBranch = getMonthBranchFromLunar(correctedDate);
  const monthElement = BRANCH_WUXING[monthBranch];

  const useDeity = USE_DEITY_BY_TOPIC[resolvedTopic];
  const sixSpiritOrder = SIX_SPIRIT_ORDER[dayStem];

  const lines: DannekiLine[] = lineValues.map((value, index) => {
    const position = (index + 1) as DannekiLine["position"];
    const najia = getLineNajia(upperTrigram.key, lowerTrigram.key, position);
    const lineElement = BRANCH_WUXING[najia.branch];
    const relation = getSixKin(palaceElement, lineElement);
    const seasonalState: SeasonalState = getSeasonalState(monthElement, lineElement);
    const dayRel = getDayRelationsFor(najia.branch, dayBranch);
    const monthBroken = isMonthBroken(najia.branch, monthBranch);
    const isVoid = voidBranches.includes(najia.branch);
    const isMoving = movingLines.includes(position);
    const role: DannekiLine["role"] = position === world ? "世" : position === response ? "応" : "";

    return {
      position,
      value,
      stem: najia.stem,
      branch: najia.branch,
      sixSpirit: sixSpiritOrder[index],
      original: originalLines[index],
      changed: changedLines[index],
      isMoving,
      relation,
      element: lineElement,
      seasonalState,
      dayRelations: dayRel.relations,
      isVoid,
      isDayChong: dayRel.isDayChong,
      isDayHe: dayRel.isDayHe,
      isMonthBroken: monthBroken,
      useGodRole: "" as DannekiUseGodRole,
      role,
      note: buildLineNote(position, relation, isMoving),
    };
  });

  const useGodSelection = chooseUseGodLine(lines, useDeity, world);
  assignUseGodRoles(lines, useDeity, useGodSelection.line);

  const traces: RuleTrace[] = [
    {
      ruleId: "danneki.day-ganzhi",
      step: "日辰算出",
      value: dayGanzhi,
      source: "lunar-typescript",
      sourceRef: DANNEKI_SOURCE_REF,
      reason: "Solar.fromYmdHms().getLunar().getDayInGanZhiExact() で立節基準の日干支を取得。",
      certainty: "confirmed",
    },
    {
      ruleId: "danneki.month-branch",
      step: "月建算出",
      value: monthBranch,
      source: "lunar-typescript",
      sourceRef: DANNEKI_SOURCE_REF,
      reason: "節入り基準の月干支から月支を抽出。",
      certainty: "confirmed",
    },
    {
      ruleId: "danneki.palace",
      step: "宮判定",
      value: `${palace}宮 (${palaceVariant})`,
      source: "京房八宮卦序",
      sourceRef: DANNEKI_SOURCE_REF,
      reason: `本卦 上${upperTrigram.key}/下${lowerTrigram.key} を八宮表で索引。`,
      certainty: "confirmed",
    },
    {
      ruleId: "danneki.use-god",
      step: "用神決定",
      value: useGodSelection.line ? lineLabel(useGodSelection.line) : "未確定",
      source: "断易立卦規則",
      sourceRef: DANNEKI_SOURCE_REF,
      reason: useGodSelection.reason,
      certainty: useGodSelection.line ? "confirmed" : "unresolved",
    },
    {
      ruleId: "danneki.line-mode",
      step: "立卦法",
      value: input.lineInputMode === "manual" ? "コイン法 (manual)" : "時刻法近似 (auto)",
      source: input.lineInputMode === "manual" ? "増删卜易" : "梅花心易由来 近似",
      sourceRef: DANNEKI_SOURCE_REF,
      reason: input.lineInputMode === "manual" ? "ユーザ入力の6/7/8/9をそのまま採用。" : "時刻と相談文のハッシュから6本を導出した近似手法。",
      certainty: input.lineInputMode === "manual" ? "confirmed" : "derived",
    },
  ];

  const basis: DannekiBasis = {
    correctedDateTime: formatUtcDateTime(correctedDate),
    locationLabel: location.label,
    offsetMinutes: location.offsetMinutes,
    dayGanzhi,
    dayStem,
    dayBranch,
    dayElement,
    monthBranch,
    monthElement,
    voidBranches,
    palace,
    palaceOrder: TRIGRAM_ORDER.indexOf(palace),
    worldLine: world,
    responseLine: response,
    useGodLine: useGodSelection.line,
    useGodReason: useGodSelection.reason,
    upperTrigram,
    lowerTrigram,
    changedUpperTrigram,
    changedLowerTrigram,
    movingLines,
    derivedSeed: seed,
    useDeity,
  };

  const bookCase = findBookCase(input.questionText);
  const explanationSections = buildExplanationSections(input, resolvedTopic, basis, lines);
  const interpretationSections = buildInterpretationSections(input, resolvedTopic, basis, lines, bookCase);

  const sourceReferences = collectSourceReferences(traces, [DANNEKI_SOURCE_REF]);
  const certainty: ChartCertainty = resolveChartCertainty(traces, "derived");

  return {
    topic: resolvedTopic,
    resolvedTopic,
    questionText: input.questionText,
    basis,
    lines,
    traces,
    sourceReferences,
    certainty,
    explanationSections,
    interpretationSections,
    messages: [
      input.lineInputMode === "manual"
        ? "コイン法 (6/7/8/9) 入力を本卦・之卦・動爻の根拠として採用しました。"
        : "時刻法近似による立卦のため、確度は derived です。可能ならコイン法での再立卦を推奨します。",
      basis.useDeity === "世応"
        ? `世応用神: 世爻 ${basis.worldLine ? lineLabel(basis.worldLine) : "—"} / 応爻 ${basis.responseLine ? lineLabel(basis.responseLine) : "—"}。`
        : `用神候補は ${basis.useDeity}、決定線は ${basis.useGodLine ? lineLabel(basis.useGodLine) : "未確定"}。`,
    ],
  };
}
