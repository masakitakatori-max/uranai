import { Solar } from "lunar-typescript";

import { buildConsultationParagraphs, inferTopicFromQuestion } from "./consultation";
import { BRANCHES, STEMS } from "./data/core";
import {
  FOUR_MAJOR_VOID_BY_XUN_LEADER,
  KINGOKETSU_FIXTURES,
  KINGOKETSU_MONTH_GENERAL_BY_MONTH_BRANCH,
  KINGOKETSU_MONTH_GENERAL_TITLES,
  KINGOKETSU_NOBLE_RULES,
  KINGOKETSU_NOBLE_SPIRIT_ORDER,
  KINGOKETSU_NOBLE_SPIRIT_TITLES,
  KINGOKETSU_SOURCE_INDEX,
  SIMPLE_STEM_TO_BRANCH,
  WUZI_DUN_START_STEM_BY_DAY_STEM,
} from "./data/kingoketsu";
import { BRANCH_WUXING, STEM_WUXING, getBranchRelations, getSeasonalState } from "./data/rules";
import { collectSourceReferences, resolveChartCertainty } from "./chartUx";
import { resolveLocationOffset } from "./location";
import { requireSeasonalState } from "./seasonalState";
import type {
  Branch,
  Ganzhi,
  GeneralOrder,
  KingoketsuBasis,
  KingoketsuChart,
  KingoketsuHelperSection,
  KingoketsuInput,
  KingoketsuNarrativeSection,
  KingoketsuPosition,
  KingoketsuRelation,
  KingoketsuPillar,
  KingoketsuTopic,
  NobleChoice,
  RuleTrace,
  SourceReference,
  SeasonalState,
  Stem,
  Wuxing,
  YinYang,
} from "./types";

const GENERATES: Record<Wuxing, Wuxing> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const OVERCOMES: Record<Wuxing, Wuxing> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

const PARENT_OF: Record<Wuxing, Wuxing> = {
  木: "水",
  火: "木",
  土: "火",
  金: "土",
  水: "金",
};

const YIN_YANG_BY_STEM: Record<Stem, YinYang> = {
  甲: "陽",
  乙: "陰",
  丙: "陽",
  丁: "陰",
  戊: "陽",
  己: "陰",
  庚: "陽",
  辛: "陰",
  壬: "陽",
  癸: "陰",
};

const YIN_YANG_BY_BRANCH: Record<Branch, YinYang> = {
  子: "陽",
  丑: "陰",
  寅: "陽",
  卯: "陰",
  辰: "陽",
  巳: "陰",
  午: "陽",
  未: "陰",
  申: "陽",
  酉: "陰",
  戌: "陽",
  亥: "陰",
};

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function toWallClockDate(input: Pick<KingoketsuInput, "year" | "month" | "day" | "hour" | "minute">) {
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

function getEquationOfTimeMinutes(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const yearStart = Date.UTC(year, 0, 0, 0, 0);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / 86_400_000);
  const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365;
  const minutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  return Math.round(minutes);
}

function getPillarGanzhi(date: Date) {
  const parts = getUtcParts(date);
  const lunar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0).getLunar();
  return {
    year: lunar.getYearInGanZhiExact() as Ganzhi,
    month: lunar.getMonthInGanZhiExact() as Ganzhi,
    day: lunar.getDayInGanZhiExact() as Ganzhi,
    hour: lunar.getTimeInGanZhi() as Ganzhi,
    xun: lunar.getDayXunExact(),
    xunKong: lunar.getDayXunKongExact(),
  };
}

function splitGanzhi(ganzhi: Ganzhi): [Stem, Branch] {
  return ganzhi.split("") as [Stem, Branch];
}

function createPillar(label: KingoketsuPillar["label"], ganzhi: Ganzhi): KingoketsuPillar {
  const [stem, branch] = splitGanzhi(ganzhi);
  return { label, ganzhi, stem, branch };
}

function getVoidBranches(xunKong: string): [Branch, Branch] {
  return xunKong.split("") as [Branch, Branch];
}

function getBranchDistance(start: Branch, target: Branch, direction: GeneralOrder) {
  const startIndex = BRANCHES.indexOf(start);
  const targetIndex = BRANCHES.indexOf(target);
  return direction === "順" ? mod(targetIndex - startIndex, BRANCHES.length) : mod(startIndex - targetIndex, BRANCHES.length);
}

function getJiangshen(monthGeneral: Branch, hourBranch: Branch, difen: Branch) {
  const steps = getBranchDistance(hourBranch, difen, "順");
  return BRANCHES[mod(BRANCHES.indexOf(monthGeneral) + steps, BRANCHES.length)];
}

function getNobleSpirit(dayStem: Stem, nobleChoice: NobleChoice, difen: Branch) {
  const config = KINGOKETSU_NOBLE_RULES[dayStem][nobleChoice];
  const steps = getBranchDistance(config.startBranch, difen, config.direction);
  return {
    startBranch: config.startBranch,
    direction: config.direction,
    branch: KINGOKETSU_NOBLE_SPIRIT_ORDER[steps],
    title: KINGOKETSU_NOBLE_SPIRIT_TITLES[steps],
  };
}

function getWuziDunStem(dayStem: Stem, branch: Branch) {
  const startStem = WUZI_DUN_START_STEM_BY_DAY_STEM[dayStem];
  return STEMS[mod(STEMS.indexOf(startStem) + BRANCHES.indexOf(branch), STEMS.length)];
}

function getStemToBranch(stem: Stem) {
  return SIMPLE_STEM_TO_BRANCH[stem];
}

function resolveUseYao(renyuanStem: Stem, guishenBranch: Branch, jiangshenBranch: Branch, difen: Branch) {
  const pattern = [YIN_YANG_BY_STEM[renyuanStem], YIN_YANG_BY_BRANCH[guishenBranch], YIN_YANG_BY_BRANCH[jiangshenBranch], YIN_YANG_BY_BRANCH[difen]];
  const yangCount = pattern.filter((value) => value === "陽").length;

  if (yangCount === 4) {
    return { key: "貴神" as const, reason: "四陽なので用爻は貴神。" };
  }
  if (yangCount === 0) {
    return { key: "将神" as const, reason: "四陰なので用爻は将神。" };
  }
  if (yangCount === 2) {
    return { key: "将神" as const, reason: "二陽二陰なので用爻は将神。" };
  }

  const targetPolarity: YinYang = yangCount === 1 ? "陽" : "陰";
  if (YIN_YANG_BY_BRANCH[guishenBranch] === targetPolarity) {
    return { key: "貴神" as const, reason: `${yangCount === 1 ? "一陽三陰" : "三陽一陰"}で唯一の${targetPolarity}が貴神にあるため。` };
  }
  return { key: "将神" as const, reason: `${yangCount === 1 ? "一陽三陰" : "三陽一陰"}で唯一の${targetPolarity}が将神にあるため。` };
}

function determineElementStates(elements: readonly Wuxing[]) {
  const counts = new Map<Wuxing, number>();
  elements.forEach((element) => {
    counts.set(element, (counts.get(element) ?? 0) + 1);
  });
  const present = [...counts.keys()];
  const stateMap = new Map<Wuxing, SeasonalState>();

  if (!present.length) {
    throw new Error("Unable to determine seasonal states from an empty element set.");
  }

  if (present.length === 1) {
    stateMap.set(present[0], "旺");
    return stateMap;
  }

  if (present.length === 2) {
    const [first, second] = present;
    if (GENERATES[first] === second) {
      stateMap.set(first, "旺");
      stateMap.set(second, "相");
      return stateMap;
    }
    if (GENERATES[second] === first) {
      stateMap.set(second, "旺");
      stateMap.set(first, "相");
      return stateMap;
    }
    if (OVERCOMES[first] === second) {
      if ((counts.get(first) ?? 0) === 1 && (counts.get(second) ?? 0) >= 3) {
        stateMap.set(second, "旺");
        stateMap.set(first, "囚");
        return stateMap;
      }
      stateMap.set(first, "旺");
      stateMap.set(second, "死");
      return stateMap;
    }
    if (OVERCOMES[second] === first) {
      if ((counts.get(second) ?? 0) === 1 && (counts.get(first) ?? 0) >= 3) {
        stateMap.set(first, "旺");
        stateMap.set(second, "囚");
        return stateMap;
      }
      stateMap.set(second, "旺");
      stateMap.set(first, "死");
      return stateMap;
    }
  }

  const candidates = present.filter((element) => !present.some((other) => OVERCOMES[other] === element));
  const ranked = candidates
    .map((element) => {
      let score = counts.get(element) ?? 0;
      if (present.includes(GENERATES[element])) score += 2;
      if (present.some((other) => OVERCOMES[element] === other)) score += 1;
      return { element, score };
    })
    .sort((left, right) => right.score - left.score);
  const dominant = ranked[0]?.element;
  if (!dominant) {
    throw new Error("Unable to determine the dominant element.");
  }

  stateMap.set(dominant, "旺");
  present.forEach((element) => {
    if (element === dominant) return;
    if (element === GENERATES[dominant]) {
      stateMap.set(element, "相");
      return;
    }
    if (element === PARENT_OF[dominant]) {
      stateMap.set(element, "休");
      return;
    }
    if (element === OVERCOMES[dominant]) {
      stateMap.set(element, "死");
      return;
    }
    if (OVERCOMES[element] === dominant) {
      stateMap.set(element, "囚");
      return;
    }
    stateMap.set(element, "囚");
  });

  return stateMap;
}

function getRelationBadges(primary: Branch | null, secondary: Branch | null) {
  if (!primary || !secondary) return [] as string[];
  const relations = new Set<string>();
  if (primary === secondary) relations.add("比");
  getBranchRelations(primary, secondary).forEach((relation) => relations.add(relation));
  return [...relations];
}

function buildHelperSections(basis: KingoketsuBasis, positions: readonly KingoketsuPosition[]): KingoketsuHelperSection[] {
  const useYao = positions.find((item) => item.key === basis.useYao)!;
  const monthState = getSeasonalState(BRANCH_WUXING[basis.monthPillar.branch], useYao.wuxing);
  const sections: KingoketsuHelperSection[] = [
    {
      title: "補正",
      value: `${basis.correctedDateTime} (補正 ${basis.totalCorrectionMinutes >= 0 ? "+" : ""}${basis.totalCorrectionMinutes}分)`,
      note: `地点 ${basis.locationLabel} / 地方時差 ${basis.locationOffsetMinutes >= 0 ? "+" : ""}${basis.locationOffsetMinutes}分 / 均時差 ${
        basis.equationOfTimeMinutes >= 0 ? "+" : ""
      }${basis.equationOfTimeMinutes}分 / DST -${basis.dstMinutes}分`,
    },
    {
      title: "月将",
      value: `${basis.monthGeneral} ${basis.monthGeneralTitle}`,
      note: `月支 ${basis.monthPillar.branch} の支合で決定`,
    },
    {
      title: "貴神起点",
      value: `${basis.nobleChoice} / ${basis.nobleStartBranch} から${basis.nobleDirection === "順" ? "順行" : "逆行"}`,
      note: `日干 ${basis.dayPillar.stem} を基準に貴神順序で地分まで数える`,
    },
    {
      title: "用爻",
      value: `${basis.useYao} ${useYao.displayValue} / ${useYao.state}`,
      note: basis.useYaoReason,
    },
    {
      title: "月建補助",
      value: `月建 ${basis.monthPillar.branch} から見ると用爻は ${monthState}`,
      note: `日支 ${basis.dayPillar.branch} と時支 ${basis.hourPillar.branch} も補助判断に使う`,
    },
    {
      title: "空亡",
      value: `${basis.voidBranches[0]} ${basis.voidBranches[1]} / 四大空亡 ${basis.fourMajorVoid}`,
      note: "用爻空亡は半減または空転として扱う",
    },
  ];

  if (useYao.branch && useYao.branch === basis.yearPillar.branch) {
    sections.push({
      title: "太歳入",
      value: `${basis.yearPillar.branch} が用爻と同支`,
      note: "太歳が入ると地位や追い風を得やすい",
    });
  }
  if (useYao.branch && useYao.branch === basis.hourPillar.branch) {
    sections.push({
      title: "時を得る",
      value: `${basis.hourPillar.branch} が用爻と同支`,
      note: "空亡があっても効果が消えやすく、実行の好機になる",
    });
  }

  return sections;
}

function buildRelationSummary(positions: readonly KingoketsuPosition[], basis: KingoketsuBasis): KingoketsuRelation[] {
  const guishen = positions.find((item) => item.key === "貴神")!;
  const jiangshen = positions.find((item) => item.key === "将神")!;
  const difen = positions.find((item) => item.key === "地分")!;
  const renyuan = positions.find((item) => item.key === "人元")!;

  return [
    {
      key: "guishen-jiangshen",
      label: "貴神と将神",
      badges: getRelationBadges(guishen.branch, jiangshen.branch),
    },
    {
      key: "jiangshen-difen",
      label: "将神と地分",
      badges: getRelationBadges(jiangshen.branch, difen.branch),
    },
    {
      key: "guishen-difen",
      label: "貴神と地分",
      badges: getRelationBadges(guishen.branch, difen.branch),
    },
    {
      key: "renyuan-guishen",
      label: "人元と貴神",
      badges: getRelationBadges(renyuan.convertedBranch, guishen.branch),
    },
    {
      key: "useyao-day",
      label: "用爻と日支",
      badges: getRelationBadges(positions.find((item) => item.key === basis.useYao)?.branch ?? null, basis.dayPillar.branch),
    },
  ].map((item) => ({
    ...item,
    badges: item.badges.length ? item.badges : ["特記なし"],
  }));
}

function buildKingoketsuSourceReferences(): SourceReference[] {
  return [
    {
      id: "kingoketsu:source:chapter-summary",
      label: "Chapter summary",
      imageId: KINGOKETSU_SOURCE_INDEX.chapterSummary,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:pillars",
      label: "Pillars",
      imageId: KINGOKETSU_SOURCE_INDEX.pillars,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:difen-and-month-general",
      label: "Difen / month general",
      imageId: KINGOKETSU_SOURCE_INDEX.difenAndMonthGeneral,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:noble-and-wuzi",
      label: "Noble / Wuzi",
      imageId: KINGOKETSU_SOURCE_INDEX.nobleAndWuzi,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:stem-conversion",
      label: "Stem conversion",
      imageId: KINGOKETSU_SOURCE_INDEX.stemConversion,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:use-yao-and-inner-states",
      label: "Use yao / inner states",
      imageId: KINGOKETSU_SOURCE_INDEX.useYaoAndInnerStates,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:pillar-support-and-void",
      label: "Pillar support / void",
      imageId: KINGOKETSU_SOURCE_INDEX.pillarSupportAndVoid,
      chapter: "knowledge",
    },
    {
      id: "kingoketsu:source:relations",
      label: "Relations",
      imageId: KINGOKETSU_SOURCE_INDEX.relations,
      chapter: "knowledge",
    },
  ];
}

function getKingoketsuSourceReference(id: string, label: string, detail: string, chapter: string, imageId: string): SourceReference {
  return { id, label, detail, chapter, imageId };
}

function buildKingoketsuTraces(params: {
  basis: KingoketsuBasis;
  yearPillar: KingoketsuPillar;
  monthPillar: KingoketsuPillar;
  dayPillar: KingoketsuPillar;
  hourPillar: KingoketsuPillar;
  monthGeneral: Branch;
  jiangshenBranch: Branch;
  difen: Branch;
  nobleChoice: NobleChoice;
  nobleSpirit: ReturnType<typeof getNobleSpirit>;
  renyuanStem: Stem;
  guishenStem: Stem;
  jiangshenStem: Stem;
  useYao: ReturnType<typeof resolveUseYao>;
}): RuleTrace[] {
  const { basis, yearPillar, monthPillar, dayPillar, hourPillar, monthGeneral, jiangshenBranch, difen, nobleChoice, nobleSpirit, renyuanStem, guishenStem, jiangshenStem, useYao } = params;

  return [
    {
      ruleId: "kingoketsu.pillars",
      step: "four pillars",
      value: `${yearPillar.ganzhi} / ${monthPillar.ganzhi} / ${dayPillar.ganzhi} / ${hourPillar.ganzhi}`,
      source: KINGOKETSU_SOURCE_INDEX.pillars,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:pillars",
        "Pillars",
        `${basis.wallClockDateTime} -> ${basis.correctedDateTime}`,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.pillars,
      ),
      reason: "Four pillars are calculated from the wall clock and corrected date.",
      certainty: "confirmed",
    },
    {
      ruleId: "kingoketsu.month-general",
      step: "month general",
      value: `${monthPillar.branch} -> ${monthGeneral}`,
      source: KINGOKETSU_SOURCE_INDEX.difenAndMonthGeneral,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:difen-and-month-general",
        "Difen / month general",
        `${monthPillar.branch} -> ${monthGeneral}`,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.difenAndMonthGeneral,
      ),
      reason: "The month general is resolved from the month branch.",
      certainty: "confirmed",
    },
    {
      ruleId: "kingoketsu.jiangshen",
      step: "jiangshen",
      value: `${monthGeneral} + ${hourPillar.branch} + ${difen} -> ${jiangshenBranch}`,
      source: KINGOKETSU_SOURCE_INDEX.difenAndMonthGeneral,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:difen-and-month-general",
        "Difen / month general",
        `${monthGeneral} / ${hourPillar.branch} / ${difen}`,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.difenAndMonthGeneral,
      ),
      reason: "Jiangshen is derived from the month general, hour branch, and difen.",
      certainty: "confirmed",
    },
    {
      ruleId: "kingoketsu.noble",
      step: "noble spirit",
      value: `${nobleChoice} / ${nobleSpirit.startBranch} -> ${nobleSpirit.branch}`,
      source: KINGOKETSU_SOURCE_INDEX.nobleAndWuzi,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:noble-and-wuzi",
        "Noble / Wuzi",
        `${nobleChoice} / ${nobleSpirit.startBranch} -> ${nobleSpirit.branch}`,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.nobleAndWuzi,
      ),
      reason: "The noble spirit follows the selected noble rule and branch distance.",
      certainty: "confirmed",
    },
    {
      ruleId: "kingoketsu.wuzi",
      step: "wuzi dun",
      value: `renyuan ${renyuanStem} / guishen ${guishenStem} / jiangshen ${jiangshenStem}`,
      source: KINGOKETSU_SOURCE_INDEX.nobleAndWuzi,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:stem-conversion",
        "Stem conversion",
        `renyuan ${renyuanStem} / guishen ${guishenStem} / jiangshen ${jiangshenStem}`,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.stemConversion,
      ),
      reason: "Wuzi Dun converts the stems for the three active positions.",
      certainty: "confirmed",
    },
    {
      ruleId: "kingoketsu.use-yao",
      step: "use yao",
      value: `${useYao.key} (${basis.useYaoReason})`,
      source: KINGOKETSU_SOURCE_INDEX.useYaoAndInnerStates,
      sourceRef: getKingoketsuSourceReference(
        "kingoketsu:source:use-yao-and-inner-states",
        "Use yao / inner states",
        basis.useYaoReason,
        "knowledge",
        KINGOKETSU_SOURCE_INDEX.useYaoAndInnerStates,
      ),
      reason: basis.useYaoReason,
      certainty: "confirmed",
    },
  ];
}
function formatSignedMinutes(value: number) {
  return `${value >= 0 ? "+" : ""}${value}分`;
}

function isPositionVoid(position: KingoketsuPosition, basis: KingoketsuBasis) {
  return Boolean(position.branch && basis.voidBranches.includes(position.branch));
}

function describeState(state: SeasonalState) {
  switch (state) {
    case "旺":
      return "主軸が強く、自発的に動いた分だけ結果へつながりやすい状態です。";
    case "相":
      return "外からの後押しを受けやすく、流れに乗ることで形になりやすい状態です。";
    case "休":
      return "勢いは弱めで、調整や準備を挟んでから動くほうが無理が出にくい状態です。";
    case "囚":
      return "制約が強く、相手や環境に縛られやすい状態です。";
    case "死":
      return "そのまま押すよりも、打ち切りや仕切り直しを考えたほうがよい状態です。";
  }
}

function describeRelation(label: string, badges: readonly string[]) {
  if (badges.includes("特記なし")) {
    return `${label}は特段の強い結び付きや衝突がなく、単独判断が主になります。`;
  }

  const positive = badges.filter((badge) => badge === "比" || badge === "支合" || badge.startsWith("三合("));
  const negative = badges.filter((badge) => ["冲", "刑", "自刑", "害", "破"].includes(badge));

  if (positive.length && negative.length) {
    return `${label}は ${badges.join("・")} で、結び付きと摩擦が同居しています。`;
  }
  if (positive.length) {
    return `${label}は ${badges.join("・")} で、連動しやすい組み合わせです。`;
  }
  if (negative.length) {
    return `${label}は ${badges.join("・")} で、食い違いと消耗が出やすい組み合わせです。`;
  }
  return `${label}は ${badges.join("・")} で、独特の癖を持つ組み合わせです。`;
}

function getStateWeight(state: SeasonalState) {
  return { 旺: 4, 相: 3, 休: 2, 囚: 1, 死: 0 }[state];
}

function getWeatherSignal(element: Wuxing) {
  switch (element) {
    case "木":
      return "風が立ちやすく、雲の流れが速い空模様";
    case "火":
      return "晴れ間や日差しが前に出やすい空模様";
    case "土":
      return "曇りや停滞感が出やすい空模様";
    case "金":
      return "乾いた風や雷鳴など急変を含みやすい空模様";
    case "水":
      return "雨、湿気、冷えが表に出やすい空模様";
  }
}

function buildExplanationSections(
  input: KingoketsuInput,
  basis: KingoketsuBasis,
  positions: readonly KingoketsuPosition[],
  relationSummary: readonly KingoketsuRelation[],
): KingoketsuNarrativeSection[] {
  const renyuan = positions.find((item) => item.key === "人元")!;
  const guishen = positions.find((item) => item.key === "貴神")!;
  const jiangshen = positions.find((item) => item.key === "将神")!;
  const difen = positions.find((item) => item.key === "地分")!;
  const useYao = positions.find((item) => item.key === basis.useYao)!;
  const useYaoVoid = isPositionVoid(useYao, basis);
  const guishenToJiangshen = relationSummary.find((item) => item.key === "guishen-jiangshen")!;
  const jiangshenToDifen = relationSummary.find((item) => item.key === "jiangshen-difen")!;
  const pattern = positions.map((position) => `${position.key}${position.yinYang}`).join(" / ");

  return [
    {
      key: "foundation",
      title: "作盤の根拠",
      paragraphs: [
        `入力日時 ${basis.wallClockDateTime} を ${basis.locationLabel} で扱い、地方時差 ${formatSignedMinutes(basis.locationOffsetMinutes)}・均時差 ${formatSignedMinutes(
          basis.equationOfTimeMinutes,
        )}・DST -${basis.dstMinutes}分を反映して真太陽時 ${basis.correctedDateTime} を採っています。`,
        `四柱は 年 ${basis.yearPillar.ganzhi} / 月 ${basis.monthPillar.ganzhi} / 日 ${basis.dayPillar.ganzhi} / 時 ${basis.hourPillar.ganzhi}。年は立春、月は節入り、日は子時切替の基準で確定しています。`,
      ],
    },
    {
      key: "positions",
      title: "課内四位の決定",
      paragraphs: [
        `月支 ${basis.monthPillar.branch} の支合から月将は ${basis.monthGeneral} ${basis.monthGeneralTitle}。これを時支 ${basis.hourPillar.branch} に置き、地分 ${input.difen} まで順行して将神 ${jiangshen.displayValue} を定めています。`,
        `${basis.nobleChoice} は日干 ${basis.dayPillar.stem} を基準に ${basis.nobleStartBranch} 起点の${basis.nobleDirection === "順" ? "順行" : "逆行"}で数え、地分 ${difen.displayValue} に当たる貴神は ${guishen.displayValue} ${guishen.title}。五子元遁で人元 ${renyuan.displayValue}、神干 ${guishen.stem}、将干 ${jiangshen.stem} を付しています。`,
      ],
    },
    {
      key: "judgment-core",
      title: "判断の芯",
      paragraphs: [
        `陰陽配列は ${pattern}。${basis.useYaoReason} よって用爻は ${basis.useYao} ${useYao.displayValue} です。`,
        `用爻の五行は ${useYao.wuxing}、課内状態は ${useYao.state} で、${describeState(useYao.state)} ${
          useYaoVoid
            ? `ただし ${basis.voidBranches[0]}${basis.voidBranches[1]} の空亡に掛かるため、見込み違い・遅延・空転を差し引いて読みます。`
            : "空亡には掛からないため、盤の勢いをそのまま採りやすい形です。"
        } ${describeRelation("貴神と将神", guishenToJiangshen.badges)} ${describeRelation("将神と地分", jiangshenToDifen.badges)}`,
      ],
    },
  ];
}

function buildInterpretationSections(
  input: KingoketsuInput,
  resolvedTopic: KingoketsuTopic,
  basis: KingoketsuBasis,
  positions: readonly KingoketsuPosition[],
  relationSummary: readonly KingoketsuRelation[],
): KingoketsuNarrativeSection[] {
  const renyuan = positions.find((item) => item.key === "人元")!;
  const jiangshen = positions.find((item) => item.key === "将神")!;
  const difen = positions.find((item) => item.key === "地分")!;
  const useYao = positions.find((item) => item.key === basis.useYao)!;
  const useYaoVoid = isPositionVoid(useYao, basis);
  const guishenToJiangshen = relationSummary.find((item) => item.key === "guishen-jiangshen")!;
  const jiangshenToDifen = relationSummary.find((item) => item.key === "jiangshen-difen")!;
  const guishenToDifen = relationSummary.find((item) => item.key === "guishen-difen")!;
  const weakPositions = positions
    .filter((position) => getStateWeight(position.state) <= 1)
    .map((position) => `${position.key}(${position.state})`);

  const sections: KingoketsuNarrativeSection[] = [
    {
      key: "machine-scope",
      title: "機械解釈の前提",
      paragraphs: [
        `以下は占的 ${resolvedTopic} に合わせた基礎の機械解釈です。用爻 ${basis.useYao} を主軸に、貴神を外部条件、将神を事の動き、地分を足元、人元を最終判断の芯として読んでいます。`,
        `${useYao.displayValue} は ${useYao.state}。${describeState(useYao.state)} ${useYaoVoid ? "ただし用爻が空亡に掛かるため、実現までに空転や遅れを見込みます。" : "用爻は空亡していないため、盤面の勢いをそのまま採りやすい形です。"}`,
      ],
    },
  ];

  const consultationParagraphs = buildConsultationParagraphs(input.questionText, resolvedTopic);
  if (consultationParagraphs.length) {
    sections.push({
      key: "topic-consultation",
      title: "相談文への寄せ方",
      paragraphs: consultationParagraphs,
    });
  }

  switch (resolvedTopic) {
    case "総合":
      sections.push({
        key: "topic-general",
        title: "総合の見立て",
        paragraphs: [
          `${describeRelation("貴神と将神", guishenToJiangshen.badges)} ${describeRelation("将神と地分", jiangshenToDifen.badges)}`,
          `今回の勝敗線は ${basis.useYao} に出ています。${basis.useYao === "貴神" ? "他者・制度・援助をどう取り込むか" : "実務の運び、順序、手数をどう整えるか"}が結果を左右しやすい課です。`,
        ],
      });
      break;
    case "仕事":
      sections.push({
        key: "topic-work",
        title: "仕事の見立て",
        paragraphs: [
          `仕事では貴神を上位者・制度・顧客、将神を成果物と進捗、地分を自席と実務導線として読みます。${describeRelation("貴神と将神", guishenToJiangshen.badges)}`,
          `${basis.useYao === "貴神" ? "承認、決裁、相手都合" : "現場手順、段取り、納期管理"}が主因になりやすい盤です。${jiangshen.state === "旺" || jiangshen.state === "相" ? "成果物は前へ出しやすく、短期で形になりやすいです。" : "成果物側は一度詰まりやすいので、工程の切り分けと再優先付けが先です。"}`,
        ],
      });
      break;
    case "金運":
      sections.push({
        key: "topic-money",
        title: "金運の見立て",
        paragraphs: [
          `金運では将神を入金と収益、地分を財布の出入り、貴神を相場と取引条件として読みます。${describeRelation("将神と地分", jiangshenToDifen.badges)}`,
          `将神 ${jiangshen.displayValue} は ${jiangshen.state}。${jiangshen.state === "旺" || jiangshen.state === "相" ? "入ってくるお金を掴みやすい局面です。" : jiangshen.state === "休" ? "守りを固めつつ条件待ちをすると崩れにくい局面です。" : "出費や値崩れの管理を優先し、無理な拡張は避けたほうがよい局面です。"} ${useYaoVoid ? "見込み収入は一度遅延を見ておくと読みを外しにくくなります。" : "金額交渉は正面から進めやすい形です。"}`,
        ],
      });
      break;
    case "恋愛":
      sections.push({
        key: "topic-love",
        title: "恋愛の見立て",
        paragraphs: [
          `恋愛では地分を自分の足元、将神を相手の出方、貴神を仲介や場の空気として読みます。${describeRelation("将神と地分", jiangshenToDifen.badges)} ${describeRelation("貴神と地分", guishenToDifen.badges)}`,
          `${basis.useYao === "貴神" ? "二人の間そのものより、第三者やタイミング、雰囲気作りが鍵です。" : "相手の現実行動と連絡頻度、会う段取りが鍵です。"} ${useYaoVoid ? "気配はあっても形になりにくいので、早読みを避けて確認を重ねたほうが安定します。" : "動くなら今の流れに合わせて具体化しやすい盤です。"}`,
        ],
      });
      break;
    case "結婚":
      sections.push({
        key: "topic-marriage",
        title: "結婚の見立て",
        paragraphs: [
          `結婚では貴神を家格・承認・周囲の了解、将神を相手の現実行動、地分を生活基盤として読みます。${describeRelation("貴神と将神", guishenToJiangshen.badges)} ${describeRelation("将神と地分", jiangshenToDifen.badges)}`,
          `${basis.useYao === "貴神" ? "話を前に進めるには、家族や制度面の了承を先に整えるのが筋です。" : "生活設計、住居、金銭分担など具体条件を詰めることが先です。"} ${useYao.state === "旺" || useYao.state === "相" ? "条件を表に出しても崩れにくい状態です。" : "理想論だけで押すと崩れやすく、実務整理が先に要ります。"}`,
        ],
      });
      break;
    case "健康":
      sections.push({
        key: "topic-health",
        title: "健康の見立て",
        paragraphs: [
          "健康では人元を頭部・意識、貴神を胸隔・呼吸、将神を腹部・代謝、地分を下肢・生活動線として読みます。",
          weakPositions.length
            ? `弱い部位は ${weakPositions.join(" / ")} に出ています。症状を読むというより、そこに負荷が集まりやすいと見て休養、検査、生活リズムの補正を優先します。`
            : "四位の状態は大きく崩れておらず、急な悪化よりも日々の消耗管理を優先する盤です。",
        ],
      });
      break;
    case "失せ物":
      sections.push({
        key: "topic-lost",
        title: "失せ物の見立て",
        paragraphs: [
          `失せ物では将神を物の移動、地分を落ち着き先、貴神を人手や管理側として読みます。${describeRelation("将神と地分", jiangshenToDifen.badges)}`,
          `${jiangshenToDifen.badges.some((badge) => badge === "支合" || badge === "比" || badge.startsWith("三合(")) ? "物はまだ生活圏から大きく離れていない読みです。" : "物は一度別の場所や他人の手を経ている読みが強めです。"} ${useYaoVoid ? "空亡が掛かるので、見つかるまで一拍遅れるか、見えても手元に戻るまで時間が掛かりやすいです。" : "回収の段取りは立てやすい形です。"}`,
        ],
      });
      break;
    case "天気":
      sections.push({
        key: "topic-weather",
        title: "天気の見立て",
        paragraphs: [
          `天気では用爻の五行を主信号として読みます。今回は ${useYao.wuxing} なので、${getWeatherSignal(useYao.wuxing)} が中心です。`,
          `${useYao.state === "旺" || useYao.state === "相" ? "気象の傾向ははっきり出やすいです。" : "気象の出方は弱めで、途中で様子が変わりやすいです。"} ${useYaoVoid ? "空亡が掛かるので、降ると思っても外れる、晴れると思っても持ち切らない、という揺れを見込みます。" : "盤の示す傾向を素直に採りやすい局面です。"}`,
        ],
      });
      break;
  }

  sections.push({
    key: "topic-closing",
    title: "補助判断",
    paragraphs: [
      `${describeRelation("貴神と地分", guishenToDifen.badges)} ${describeRelation("人元と貴神", relationSummary.find((item) => item.key === "renyuan-guishen")!.badges)}`,
      `人元 ${renyuan.displayValue} は最終判断の芯、地分 ${difen.displayValue} は実際の足場です。強い読みが出ても、最後は地分側で受け止められるかどうかを確認すると盤の読み違いが減ります。`,
    ],
  });

  return sections;
}

export function getKingoketsuNobleConfig(dayStem: Stem, nobleChoice: NobleChoice) {
  return KINGOKETSU_NOBLE_RULES[dayStem][nobleChoice];
}

export function getKingoketsuWuziDunStem(dayStem: Stem, branch: Branch) {
  return getWuziDunStem(dayStem, branch);
}

export function getKingoketsuFourMajorVoid(xun: string) {
  const value = FOUR_MAJOR_VOID_BY_XUN_LEADER[xun];
  if (!value) {
    throw new Error(`Unknown xun leader: ${xun}`);
  }
  return value;
}

export function buildKingoketsuChart(input: KingoketsuInput): KingoketsuChart {
  const location = resolveLocationOffset(input.locationId);
  const wallClock = toWallClockDate(input);
  const wallClockParts = getUtcParts(wallClock);
  const equationOfTimeMinutes = getEquationOfTimeMinutes(wallClockParts.year, wallClockParts.month, wallClockParts.day);
  const totalCorrectionMinutes = location.offsetMinutes + equationOfTimeMinutes - input.dstMinutes;
  const correctedDate = addMinutes(wallClock, totalCorrectionMinutes);

  const wallClockPillars = getPillarGanzhi(wallClock);
  const correctedPillars = getPillarGanzhi(correctedDate);
  const yearPillar = createPillar("年", wallClockPillars.year);
  const monthPillar = createPillar("月", wallClockPillars.month);
  const dayPillar = createPillar("日", correctedPillars.day);
  const hourPillar = createPillar("時", correctedPillars.hour);
  const voidBranches = getVoidBranches(correctedPillars.xunKong);
  const fourMajorVoid = getKingoketsuFourMajorVoid(correctedPillars.xun);
  const monthGeneral = KINGOKETSU_MONTH_GENERAL_BY_MONTH_BRANCH[monthPillar.branch];
  const monthGeneralTitle = KINGOKETSU_MONTH_GENERAL_TITLES[monthGeneral];
  const nobleSpirit = getNobleSpirit(dayPillar.stem, input.nobleChoice, input.difen);
  const jiangshenBranch = getJiangshen(monthGeneral, hourPillar.branch, input.difen);
  const renyuanStem = getWuziDunStem(dayPillar.stem, input.difen);
  const guishenStem = getWuziDunStem(dayPillar.stem, nobleSpirit.branch);
  const jiangshenStem = getWuziDunStem(dayPillar.stem, jiangshenBranch);
  const useYao = resolveUseYao(renyuanStem, nobleSpirit.branch, jiangshenBranch, input.difen);

  const elements = [STEM_WUXING[renyuanStem], BRANCH_WUXING[nobleSpirit.branch], BRANCH_WUXING[jiangshenBranch], BRANCH_WUXING[input.difen]] as const;
  const states = determineElementStates(elements);

  const positions: KingoketsuPosition[] = [
    {
      key: "人元",
      stem: renyuanStem,
      branch: null,
      displayValue: renyuanStem,
      wuxing: STEM_WUXING[renyuanStem],
      yinYang: YIN_YANG_BY_STEM[renyuanStem],
      state: requireSeasonalState(states, STEM_WUXING[renyuanStem], "renyuan"),
      title: "ゴール",
      titleTone: "neutral",
      convertedBranch: getStemToBranch(renyuanStem),
      isUseYao: false,
    },
    {
      key: "貴神",
      stem: guishenStem,
      branch: nobleSpirit.branch,
      displayValue: `${guishenStem}${nobleSpirit.branch}`,
      wuxing: BRANCH_WUXING[nobleSpirit.branch],
      yinYang: YIN_YANG_BY_BRANCH[nobleSpirit.branch],
      state: requireSeasonalState(states, BRANCH_WUXING[nobleSpirit.branch], "guishen"),
      title: nobleSpirit.title,
      titleTone: ["貴人", "六合", "青龍", "太常", "太陰", "天后"].includes(nobleSpirit.title) ? "good" : "alert",
      convertedBranch: getStemToBranch(guishenStem),
      isUseYao: useYao.key === "貴神",
    },
    {
      key: "将神",
      stem: jiangshenStem,
      branch: jiangshenBranch,
      displayValue: `${jiangshenStem}${jiangshenBranch}`,
      wuxing: BRANCH_WUXING[jiangshenBranch],
      yinYang: YIN_YANG_BY_BRANCH[jiangshenBranch],
      state: requireSeasonalState(states, BRANCH_WUXING[jiangshenBranch], "jiangshen"),
      title: KINGOKETSU_MONTH_GENERAL_TITLES[jiangshenBranch],
      titleTone: ["神后", "勝光", "小吉"].includes(KINGOKETSU_MONTH_GENERAL_TITLES[jiangshenBranch]) ? "good" : "neutral",
      convertedBranch: getStemToBranch(jiangshenStem),
      isUseYao: useYao.key === "将神",
    },
    {
      key: "地分",
      stem: null,
      branch: input.difen,
      displayValue: input.difen,
      wuxing: BRANCH_WUXING[input.difen],
      yinYang: YIN_YANG_BY_BRANCH[input.difen],
      state: requireSeasonalState(states, BRANCH_WUXING[input.difen], "difen"),
      title: "スタート",
      titleTone: "neutral",
      convertedBranch: null,
      isUseYao: false,
    },
  ];

  const basis: KingoketsuBasis = {
    wallClockDateTime: formatUtcDateTime(wallClock),
    correctedDateTime: formatUtcDateTime(correctedDate),
    locationLabel: location.label,
    locationOffsetMinutes: location.offsetMinutes,
    equationOfTimeMinutes,
    dstMinutes: input.dstMinutes,
    totalCorrectionMinutes,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    voidBranches,
    fourMajorVoid,
    monthGeneral,
    monthGeneralTitle,
    nobleStartBranch: nobleSpirit.startBranch,
    nobleDirection: nobleSpirit.direction,
    nobleChoice: input.nobleChoice,
    useYao: useYao.key,
    useYaoReason: useYao.reason,
  };

  const traces = buildKingoketsuTraces({
    basis,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    monthGeneral,
    jiangshenBranch,
    difen: input.difen,
    nobleChoice: input.nobleChoice,
    nobleSpirit,
    renyuanStem,
    guishenStem,
    jiangshenStem,
    useYao,
  });
  const sourceReferences = collectSourceReferences(traces, buildKingoketsuSourceReferences());
  const certainty = resolveChartCertainty(traces);

  const messages: string[] = [];
  if (positions.some((item) => item.stem === "戊" || item.stem === "己")) {
    messages.push("戊・己の十二支変換は入門書の主例に合わせた簡易変換で表示しています。判定の主軸は原枝と五行を優先してください。");
  }
  if (basis.useYao === "将神" && voidBranches.includes(jiangshenBranch)) {
    messages.push("用爻が空亡に掛かっています。得られる効果は半減、または空転として扱います。");
  }
  if (basis.useYao === "貴神" && voidBranches.includes(nobleSpirit.branch)) {
    messages.push("用爻が空亡に掛かっています。外部支援は来ても形になりにくい課です。");
  }

  const relationSummary = buildRelationSummary(positions, basis);
  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);
  const explanationSections = buildExplanationSections(input, basis, positions, relationSummary);
  const interpretationSections = buildInterpretationSections(input, resolvedTopic, basis, positions, relationSummary);

  return {
    topic: resolvedTopic,
    resolvedTopic,
    questionText: input.questionText,
    basis,
    positions,
    relationSummary,
    helperSections: buildHelperSections(basis, positions),
    sourceReferences,
    explanationSections,
    interpretationSections,
    traces,
    certainty,
    messages,
  };
}

export { KINGOKETSU_FIXTURES };

