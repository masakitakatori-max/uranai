import { Solar } from "lunar-typescript";

import { buildConsultationParagraphs, inferTopicFromQuestion } from "./consultation";
import { GANZHI_CYCLE, LOCATION_OFFSETS, VOID_BRANCHES_BY_XUN } from "./data/core";
import { STEM_WUXING } from "./data/rules";
import { resolveChartCertainty } from "./chartUx";
import { resolveLocationOffset } from "./location";
import { createRelationshipGraph, createStructureEdge, createWuxingRelationEdges } from "./relationships";
import {
  QIMEN_BOARD_LABELS,
  QIMEN_DAY_JU_FIXTURES,
  QIMEN_DOOR_BY_HOME_PALACE,
  QIMEN_EARTH_STEM_ORDER,
  QIMEN_EIGHT_PALACE_ORDER,
  QIMEN_FLYING_ORDER,
  QIMEN_GOD_ORDER,
  QIMEN_PALACES,
  QIMEN_SOURCE_REFERENCES,
  QIMEN_STAR_BY_HOME_PALACE,
  QIMEN_STEM_NUMBERS,
  QIMEN_SUPPORTED_YEAR_RANGE,
  QIMEN_THREE_WONDERS,
  QIMEN_TIME_JU_BY_SOLAR_TERM,
  QIMEN_TIME_JU_FIXTURES,
  QIMEN_XUN_LEADER_BY_XUN_INDEX,
} from "./qimen/constants";
import type {
  Branch,
  ChartCertainty,
  Ganzhi,
  NarrativeSection,
  QimenBoard,
  QimenBoardBasis,
  QimenBoardKind,
  QimenChart,
  QimenDirection,
  QimenDirectionJudgment,
  QimenDoor,
  QimenGod,
  QimenInput,
  QimenJudgmentLabel,
  QimenPalace,
  QimenPalaceName,
  QimenPillar,
  QimenStar,
  QimenTopic,
  RelationshipGraph,
  RelationshipNode,
  RuleTrace,
  SourceReference,
  Stem,
  Wuxing,
  YinYang,
} from "./types";

export { LOCATION_OFFSETS };
export { QIMEN_SUPPORTED_YEAR_RANGE } from "./qimen/constants";

type JuResolution = {
  yinYang: YinYang;
  juNumber: number;
  source: string;
  certainty: ChartCertainty;
  approximation?: string;
};

const SOURCE_BY_ID = new Map(QIMEN_SOURCE_REFERENCES.map((source) => [source.id, source]));
const EIGHT_PALACE_SET = new Set<QimenPalaceName>(QIMEN_EIGHT_PALACE_ORDER);

const QIMEN_DOOR_ELEMENT: Record<QimenDoor, Wuxing> = {
  休門: "水",
  生門: "土",
  傷門: "木",
  杜門: "木",
  景門: "火",
  死門: "土",
  驚門: "金",
  開門: "金",
};

const QIMEN_STAR_ELEMENT: Record<QimenStar, Wuxing> = {
  天蓬星: "水",
  天任星: "土",
  天冲星: "木",
  天輔星: "木",
  天英星: "火",
  天芮星: "土",
  天柱星: "金",
  天心星: "金",
  天禽星: "土",
};

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function toWallClockDate(input: Pick<QimenInput, "year" | "month" | "day" | "hour" | "minute">) {
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

function formatDateKey(date: Date) {
  const parts = getUtcParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatUtcDateTime(date: Date) {
  const parts = getUtcParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function getLunar(date: Date) {
  const parts = getUtcParts(date);
  return Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0).getLunar();
}

function getPillarGanzhi(date: Date) {
  const lunar = getLunar(date);
  return {
    year: lunar.getYearInGanZhiExact() as Ganzhi,
    month: lunar.getMonthInGanZhiExact() as Ganzhi,
    day: lunar.getDayInGanZhiExact() as Ganzhi,
    hour: lunar.getTimeInGanZhi() as Ganzhi,
    dayXunKong: lunar.getDayXunKongExact(),
    prevQiName: lunar.getPrevQi(false).getName(),
  };
}

function splitGanzhi(ganzhi: Ganzhi): [Stem, Branch] {
  return ganzhi.split("") as [Stem, Branch];
}

function createPillar(label: QimenPillar["label"], ganzhi: Ganzhi): QimenPillar {
  const [stem, branch] = splitGanzhi(ganzhi);
  return { label, ganzhi, stem, branch };
}

function getSourceReference(id: string) {
  const source = SOURCE_BY_ID.get(id);
  if (!source) {
    throw new Error(`Unknown qimen source: ${id}`);
  }
  return source;
}

function getXunIndex(ganzhi: Ganzhi) {
  const cycleIndex = GANZHI_CYCLE.indexOf(ganzhi);
  if (cycleIndex < 0) {
    throw new Error(`Unknown ganzhi: ${ganzhi}`);
  }
  return Math.floor(cycleIndex / 10);
}

function getXunLeader(ganzhi: Ganzhi) {
  return QIMEN_XUN_LEADER_BY_XUN_INDEX[getXunIndex(ganzhi)];
}

function getVoidBranches(ganzhi: Ganzhi): [Branch, Branch] {
  return [...VOID_BRANCHES_BY_XUN[getXunIndex(ganzhi)]] as [Branch, Branch];
}

function getDateYinYang(date: Date): YinYang {
  const parts = getUtcParts(date);
  const monthDay = parts.month * 100 + parts.day;
  return monthDay >= 621 && monthDay < 1222 ? "陰" : "陽";
}

function getThreeYuanIndex(ganzhi: Ganzhi) {
  const cycleIndex = GANZHI_CYCLE.indexOf(ganzhi);
  return Math.floor(mod(cycleIndex, 15) / 5) as 0 | 1 | 2;
}

function resolveYearJu(date: Date): JuResolution {
  const parts = getUtcParts(date);
  const inBookRange = parts.year >= QIMEN_SUPPORTED_YEAR_RANGE.start && parts.year <= QIMEN_SUPPORTED_YEAR_RANGE.end;
  return {
    yinYang: "陰",
    juNumber: 7,
    source: "IMG_0148.JPG-IMG_0149.JPG",
    certainty: inBookRange ? "confirmed" : "derived",
    approximation: inBookRange ? undefined : "本文の検証範囲外ですが、1984-2043年は年盤陰7局という本文記述に従っています。",
  };
}

function resolveMonthJu(date: Date): JuResolution {
  const parts = getUtcParts(date);
  const blockIndex = Math.floor((parts.year - QIMEN_SUPPORTED_YEAR_RANGE.start) / 5);
  const juNumber = [1, 4, 7, 1][mod(blockIndex, 4)] ?? 1;
  const inBookRange = parts.year >= QIMEN_SUPPORTED_YEAR_RANGE.start && parts.year <= QIMEN_SUPPORTED_YEAR_RANGE.end;
  return {
    yinYang: "陰",
    juNumber,
    source: "IMG_0149.JPG",
    certainty: inBookRange ? "derived" : "unresolved",
    approximation: "月盤は本文の2015年9月=乙酉陰1局と5年ごとの変化記述からブロック化しています。月盤表のOCR崩れが残るため、confirmedにはしていません。",
  };
}

function resolveDayJu(date: Date, dayPillar: QimenPillar): JuResolution {
  const dateKey = formatDateKey(date);
  const fixture = QIMEN_DAY_JU_FIXTURES[dateKey];

  if (fixture && fixture.ganzhi === dayPillar.ganzhi) {
    return {
      yinYang: fixture.yinYang,
      juNumber: fixture.juNumber,
      source: fixture.source,
      certainty: "confirmed",
    };
  }

  return {
    yinYang: getDateYinYang(date),
    juNumber: mod(GANZHI_CYCLE.indexOf(dayPillar.ganzhi), 9) + 1,
    source: "IMG_0149.JPG-IMG_0150.JPG",
    certainty: "derived",
    approximation: "日盤局数表はOCR崩れが大きいため、本文fixture以外は干支循環からの仮配置です。局数表で再校正してください。",
  };
}

function resolveTimeJu(date: Date, hourPillar: QimenPillar, dayPillar: QimenPillar, prevQiName: string): JuResolution {
  const fixture = QIMEN_TIME_JU_FIXTURES[`${formatDateKey(date)}:${hourPillar.branch}`];

  if (fixture && fixture.ganzhi === hourPillar.ganzhi) {
    return {
      yinYang: fixture.yinYang,
      juNumber: fixture.juNumber,
      source: fixture.source,
      certainty: "confirmed",
    };
  }

  const termRule = QIMEN_TIME_JU_BY_SOLAR_TERM[prevQiName];
  if (!termRule) {
    return {
      yinYang: getDateYinYang(date),
      juNumber: mod(GANZHI_CYCLE.indexOf(hourPillar.ganzhi), 9) + 1,
      source: "IMG_0150.JPG-IMG_0151.JPG",
      certainty: "unresolved",
      approximation: `節気 ${prevQiName} の局数表を特定できません。時干支から暫定局数を表示しています。`,
    };
  }

  return {
    yinYang: termRule.yinYang,
    juNumber: termRule.juNumbers[getThreeYuanIndex(dayPillar.ganzhi)],
    source: "IMG_0150.JPG-IMG_0151.JPG",
    certainty: "derived",
    approximation: `時盤は節気 ${prevQiName} と時盤三元による暫定算出です。本文fixture以外は局数表で再校正してください。`,
  };
}

function countPalace(start: QimenPalaceName, steps: number, yinYang: YinYang) {
  const direction = yinYang === "陽" ? 1 : -1;
  const startIndex = QIMEN_FLYING_ORDER.indexOf(start);
  return QIMEN_FLYING_ORDER[mod(startIndex + direction * (steps - 1), QIMEN_FLYING_ORDER.length)];
}

function toEffectiveEightPalace(palace: QimenPalaceName) {
  return palace === "中" ? "坤" : (palace as Exclude<QimenPalaceName, "中">);
}

function buildEarthStemMap(yinYang: YinYang, juNumber: number) {
  const direction = yinYang === "陽" ? 1 : -1;
  const startPalace = QIMEN_PALACES.find((palace) => palace.number === juNumber)?.palace ?? "坎";
  const startIndex = QIMEN_FLYING_ORDER.indexOf(startPalace);
  const earthStems = {} as Record<QimenPalaceName, Stem>;

  QIMEN_EARTH_STEM_ORDER.forEach((stem, index) => {
    const palace = QIMEN_FLYING_ORDER[mod(startIndex + direction * index, QIMEN_FLYING_ORDER.length)];
    earthStems[palace] = stem;
  });

  return earthStems;
}

function findPalaceByStem(stems: Record<QimenPalaceName, Stem>, stem: Stem) {
  const targetStem = stem === "甲" ? "戊" : stem;
  const palace = QIMEN_FLYING_ORDER.find((candidate) => stems[candidate] === targetStem);
  return palace ?? "坎";
}

function buildHeavenStemMap(earthStems: Record<QimenPalaceName, Stem>, xunLeader: Stem, pillarStem: Stem) {
  const sourcePalace = findPalaceByStem(earthStems, xunLeader);
  const targetPalace = findPalaceByStem(earthStems, pillarStem);
  const sourceIndex = QIMEN_FLYING_ORDER.indexOf(toEffectiveEightPalace(sourcePalace));
  const targetIndex = QIMEN_FLYING_ORDER.indexOf(toEffectiveEightPalace(targetPalace));
  const heavenStems = {} as Record<QimenPalaceName, Stem>;

  QIMEN_FLYING_ORDER.forEach((_, index) => {
    const source = QIMEN_FLYING_ORDER[mod(sourceIndex + index, QIMEN_FLYING_ORDER.length)];
    const target = QIMEN_FLYING_ORDER[mod(targetIndex + index, QIMEN_FLYING_ORDER.length)];
    heavenStems[target] = earthStems[source];
  });

  return heavenStems;
}

function distributeEightItems<T>(
  homePalace: Exclude<QimenPalaceName, "中">,
  targetPalace: Exclude<QimenPalaceName, "中">,
  itemsByHomePalace: Record<Exclude<QimenPalaceName, "中">, T>,
  yinYang: YinYang,
) {
  const result = {} as Record<Exclude<QimenPalaceName, "中">, T>;
  const direction = yinYang === "陽" ? 1 : -1;
  const homeIndex = QIMEN_EIGHT_PALACE_ORDER.indexOf(homePalace);
  const targetIndex = QIMEN_EIGHT_PALACE_ORDER.indexOf(targetPalace);

  QIMEN_EIGHT_PALACE_ORDER.forEach((_, index) => {
    const palace = QIMEN_EIGHT_PALACE_ORDER[mod(targetIndex + direction * index, QIMEN_EIGHT_PALACE_ORDER.length)];
    const itemHome = QIMEN_EIGHT_PALACE_ORDER[mod(homeIndex + index, QIMEN_EIGHT_PALACE_ORDER.length)];
    result[palace] = itemsByHomePalace[itemHome];
  });

  return result;
}

function buildDoorMap(earthStems: Record<QimenPalaceName, Stem>, basis: Pick<QimenBoardBasis, "pillar" | "yinYang" | "xunLeader">) {
  const xunPalace = toEffectiveEightPalace(findPalaceByStem(earthStems, basis.xunLeader));
  const target = toEffectiveEightPalace(countPalace(xunPalace, QIMEN_STEM_NUMBERS[basis.pillar.stem], basis.yinYang));
  return {
    directOfficer: QIMEN_DOOR_BY_HOME_PALACE[xunPalace],
    doors: distributeEightItems(xunPalace, target, QIMEN_DOOR_BY_HOME_PALACE, basis.yinYang),
  };
}

function buildStarMap(earthStems: Record<QimenPalaceName, Stem>, basis: Pick<QimenBoardBasis, "pillar" | "yinYang" | "xunLeader">) {
  const xunPalace = findPalaceByStem(earthStems, basis.xunLeader);
  const xunEffectivePalace = toEffectiveEightPalace(xunPalace);
  const target = toEffectiveEightPalace(findPalaceByStem(earthStems, basis.pillar.stem));
  const starsByEightHome = QIMEN_EIGHT_PALACE_ORDER.reduce(
    (result, palace) => ({
      ...result,
      [palace]: QIMEN_STAR_BY_HOME_PALACE[palace],
    }),
    {} as Record<Exclude<QimenPalaceName, "中">, QimenStar>,
  );

  return {
    directStar: QIMEN_STAR_BY_HOME_PALACE[xunPalace],
    stars: distributeEightItems(xunEffectivePalace, target, starsByEightHome, basis.yinYang),
  };
}

function buildGodMap(earthStems: Record<QimenPalaceName, Stem>, pillarStem: Stem, yinYang: YinYang) {
  const target = toEffectiveEightPalace(findPalaceByStem(earthStems, pillarStem));
  const direction = yinYang === "陽" ? 1 : -1;
  const targetIndex = QIMEN_EIGHT_PALACE_ORDER.indexOf(target);
  const gods = {} as Record<Exclude<QimenPalaceName, "中">, QimenGod>;

  QIMEN_GOD_ORDER.forEach((god, index) => {
    const palace = QIMEN_EIGHT_PALACE_ORDER[mod(targetIndex + direction * index, QIMEN_EIGHT_PALACE_ORDER.length)];
    gods[palace] = god;
  });

  return gods;
}

function buildPalaces(basis: QimenBoardBasis): QimenPalace[] {
  const earthStems = buildEarthStemMap(basis.yinYang, basis.juNumber);
  const heavenStems = buildHeavenStemMap(earthStems, basis.xunLeader, basis.pillar.stem);
  const doorResult = buildDoorMap(earthStems, basis);
  const starResult = buildStarMap(earthStems, basis);
  const gods = buildGodMap(earthStems, basis.pillar.stem, basis.yinYang);
  const xunLeaderPalace = findPalaceByStem(earthStems, basis.xunLeader);
  const hourStemPalace = findPalaceByStem(earthStems, basis.pillar.stem);

  basis.directOfficer = doorResult.directOfficer;
  basis.directStar = starResult.directStar;

  return QIMEN_PALACES.map((home) => {
    const isEightPalace = EIGHT_PALACE_SET.has(home.palace);
    const palace = home.palace;
    const notes: string[] = [];

    if (palace === "中") {
      notes.push("活盤式では中宮要素は坤寄せの例外処理を確認します。");
    }
    if (palace === xunLeaderPalace) {
      notes.push(`旬首 ${basis.xunLeader}`);
    }
    if (palace === hourStemPalace) {
      notes.push(`${basis.label}干 ${basis.pillar.stem} の宮`);
    }

    return {
      palace,
      palaceNumber: home.number,
      direction: home.direction,
      element: home.element,
      branches: [...home.branches],
      earthStem: earthStems[palace],
      heavenStem: heavenStems[palace],
      door: isEightPalace ? doorResult.doors[palace as Exclude<QimenPalaceName, "中">] : null,
      star: palace === "中" ? "天禽星" : starResult.stars[palace as Exclude<QimenPalaceName, "中">],
      god: isEightPalace ? gods[palace as Exclude<QimenPalaceName, "中">] : null,
      isXunLeaderSeat: palace === xunLeaderPalace,
      isHourStemSeat: palace === hourStemPalace,
      isVoid: home.branches.some((branch) => basis.voidBranches.includes(branch)),
      notes,
      gridRow: home.row,
      gridColumn: home.column,
    };
  });
}

function createBoard(kind: QimenBoardKind, pillar: QimenPillar, ju: JuResolution): QimenBoard {
  const basis: QimenBoardBasis = {
    kind,
    label: QIMEN_BOARD_LABELS[kind],
    pillar,
    yinYang: ju.yinYang,
    juNumber: ju.juNumber,
    xunLeader: getXunLeader(pillar.ganzhi),
    voidBranches: getVoidBranches(pillar.ganzhi),
    directOfficer: null,
    directStar: "天禽星",
    source: ju.source,
    certainty: ju.certainty,
  };

  return {
    kind,
    label: QIMEN_BOARD_LABELS[kind],
    basis,
    palaces: buildPalaces(basis),
  };
}

function getDoorScore(door: QimenDoor | null) {
  if (door === "休門" || door === "生門" || door === "開門") return 30;
  if (door === "景門") return 15;
  if (!door) return 0;
  return -10;
}

function getStarScore(star: QimenStar) {
  if (star === "天冲星" || star === "天輔星" || star === "天禽星" || star === "天心星" || star === "天任星") return 12;
  if (star === "天英星" || star === "天柱星") return -6;
  return -15;
}

function getGodScore(god: QimenGod | null) {
  if (!god) return 0;
  if (god === "直符" || god === "太陰" || god === "六合" || god === "九地" || god === "九天") return 12;
  return -8;
}

function classifyScore(score: number): { label: QimenJudgmentLabel; tone: QimenDirectionJudgment["tone"] } {
  if (score >= 60) return { label: "大吉", tone: "good" };
  if (score >= 35) return { label: "吉", tone: "good" };
  if (score >= 15) return { label: "平", tone: "neutral" };
  if (score >= 0) return { label: "注意", tone: "warning" };
  return { label: "凶", tone: "alert" };
}

function describePalacePatterns(palace: QimenPalace) {
  const patterns: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (palace.door === "休門" || palace.door === "生門" || palace.door === "開門") {
    patterns.push(`三吉門 ${palace.door}`);
  }
  if (palace.door === "景門") {
    patterns.push("景門 中吉");
  }
  if ((QIMEN_THREE_WONDERS as readonly Stem[]).includes(palace.heavenStem)) {
    patterns.push(`天盤三奇 ${palace.heavenStem}`);
    score += 8;
  }
  if ((QIMEN_THREE_WONDERS as readonly Stem[]).includes(palace.earthStem)) {
    patterns.push(`地盤三奇 ${palace.earthStem}`);
    score += 8;
  }
  if (palace.heavenStem === "丙" && palace.earthStem === "戊") {
    patterns.push("丙戊 大吉格候補");
    score += 18;
  }
  if (palace.heavenStem === "丙" && palace.earthStem === "庚") {
    warnings.push("丙庚 凶格候補");
    score -= 20;
  }
  if (palace.isVoid) {
    warnings.push("空亡方位");
    score -= 10;
  }

  return { patterns, warnings, score };
}

function createDirectionJudgments(board: QimenBoard) {
  const directionSource = getSourceReference("qimen:source:direction-score");

  return board.palaces
    .filter((palace) => palace.direction !== "中宮")
    .map((palace) => {
      const patternResult = describePalacePatterns(palace);
      const score = getDoorScore(palace.door) + getStarScore(palace.star) + getGodScore(palace.god) + patternResult.score;
      const classification = classifyScore(score);
      const reasons = [
        `八門 ${palace.door ?? "中宮"}: ${getDoorScore(palace.door)}点`,
        `九星 ${palace.star}: ${getStarScore(palace.star)}点`,
        `八神 ${palace.god ?? "中宮"}: ${getGodScore(palace.god)}点`,
        `天地盤 ${palace.heavenStem}${palace.earthStem}: ${patternResult.score}点`,
      ];

      return {
        direction: palace.direction as QimenDirection,
        palace: palace.palace,
        boardKind: board.kind,
        boardLabel: board.label,
        score,
        label: classification.label,
        tone: classification.tone,
        patterns: patternResult.patterns.length ? patternResult.patterns : ["特記格局なし"],
        reasons,
        warnings: patternResult.warnings,
        sourceReferences: [directionSource],
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildQimenRelationships(primaryBoard: QimenBoard, selected: QimenDirectionJudgment): RelationshipGraph {
  const palace = primaryBoard.palaces.find((item) => item.palace === selected.palace) ?? primaryBoard.palaces[0];
  if (!palace) {
    return createRelationshipGraph({
      title: "奇門遁甲の選択方位関係",
      summary: ["選択方位の宮を特定できませんでした。"],
      nodes: [],
      edges: [],
    });
  }
  const palaceNode: RelationshipNode = {
    id: "qimen-palace",
    label: `${palace.direction} ${palace.palace}宮`,
    value: String(palace.palaceNumber),
    element: palace.element,
    branch: palace.branches[0],
    role: "宮",
    tags: [palace.isVoid ? "空亡" : "", palace.isXunLeaderSeat ? "旬首" : "", palace.isHourStemSeat ? "盤干" : ""].filter(Boolean),
    isPrimary: true,
  };
  const starNode: RelationshipNode = {
    id: "qimen-star",
    label: "九星",
    value: palace.star,
    element: QIMEN_STAR_ELEMENT[palace.star],
    role: "星",
  };
  const doorNode: RelationshipNode | null = palace.door
    ? {
        id: "qimen-door",
        label: "八門",
        value: palace.door,
        element: QIMEN_DOOR_ELEMENT[palace.door],
        role: "門",
      }
    : null;
  const heavenStemNode: RelationshipNode = {
    id: "qimen-heaven-stem",
    label: "天盤干",
    value: palace.heavenStem,
    element: STEM_WUXING[palace.heavenStem],
    stem: palace.heavenStem,
    role: "天",
  };
  const earthStemNode: RelationshipNode = {
    id: "qimen-earth-stem",
    label: "地盤干",
    value: palace.earthStem,
    element: STEM_WUXING[palace.earthStem],
    stem: palace.earthStem,
    role: "地",
  };
  const nodes = [palaceNode, starNode, ...(doorNode ? [doorNode] : []), heavenStemNode, earthStemNode];

  return createRelationshipGraph({
    title: "奇門遁甲の選択方位関係",
    summary: [
      `${selected.direction}方位は ${palace.palace}宮で、宮五行は ${palace.element} です。`,
      `九星 ${palace.star}、八門 ${palace.door ?? "中宮なし"}、天盤干 ${palace.heavenStem}、地盤干 ${palace.earthStem} の五行関係を表示します。`,
    ],
    nodes,
    edges: [
      createStructureEdge(palaceNode, starNode, "宮と星", "選択宮に入った九星です。"),
      ...(doorNode ? [createStructureEdge(palaceNode, doorNode, "宮と門", "選択宮に入った八門です。")] : []),
      createStructureEdge(heavenStemNode, earthStemNode, "天地盤", "天盤干と地盤干の五行関係です。"),
      ...createWuxingRelationEdges(nodes, "qimen-wuxing"),
    ],
  });
}

function buildTraces(params: {
  wallClockDateTime: string;
  correctedDateTime: string;
  boards: readonly QimenBoard[];
  juResolutions: Record<QimenBoardKind, JuResolution>;
  prevQiName: string;
}): RuleTrace[] {
  const sourceFourBoards = getSourceReference("qimen:source:four-boards");
  const sourceJu = getSourceReference("qimen:source:ju-and-pillars");
  const sourceEarthHeaven = getSourceReference("qimen:source:earth-heaven");
  const sourceDoorStarGod = getSourceReference("qimen:source:door-star-god");
  const boardValues = params.boards.map((board) => `${board.label}:${board.basis.pillar.ganzhi}${board.basis.yinYang}${board.basis.juNumber}局`).join(" / ");

  return [
    {
      ruleId: "qimen.four-boards",
      step: "four board setup",
      value: boardValues,
      source: sourceFourBoards.imageId ?? sourceFourBoards.id,
      sourceRef: sourceFourBoards,
      reason: "本文では年盤・月盤・日盤・時盤の4種類を基本盤として扱うため、同一入力から四盤を生成します。",
      certainty: "confirmed",
    },
    {
      ruleId: "qimen.pillars-and-ju",
      step: "pillars and ju",
      value: `${params.wallClockDateTime} -> ${params.correctedDateTime} / 節気 ${params.prevQiName}`,
      source: sourceJu.imageId ?? sourceJu.id,
      sourceRef: sourceJu,
      reason: "干支は暦ライブラリ、局数は本文fixtureと節気三元表から解決します。",
      certainty: resolveChartCertainty(Object.values(params.juResolutions).map((resolution) => ({ certainty: resolution.certainty }))),
      approximation: Object.values(params.juResolutions)
        .map((resolution) => resolution.approximation)
        .filter(Boolean)
        .join(" / "),
    },
    {
      ruleId: "qimen.earth-heaven-stems",
      step: "earth and heaven stems",
      value: params.boards.map((board) => `${board.label}:旬首${board.basis.xunLeader}`).join(" / "),
      source: sourceEarthHeaven.imageId ?? sourceEarthHeaven.id,
      sourceRef: sourceEarthHeaven,
      reason: "局数位置に戊を置き、陽局は順行、陰局は逆行で地盤干を配置し、旬首を盤干の上へ移して天盤干を作ります。",
      certainty: "derived",
    },
    {
      ruleId: "qimen.doors-stars-gods",
      step: "door star god",
      value: params.boards.map((board) => `${board.label}:直使${board.basis.directOfficer ?? "未定"} / 直符${board.basis.directStar}`).join(" / "),
      source: sourceDoorStarGod.imageId ?? sourceDoorStarGod.id,
      sourceRef: sourceDoorStarGod,
      reason: "地盤旬首の宮から直使・九星直符を取り、盤干の宮へ移して八門・九星・八神を配布します。",
      certainty: "derived",
    },
  ];
}

function buildExplanationSections(chart: Pick<QimenChart, "basis" | "primaryBoard" | "directionJudgments">): NarrativeSection[] {
  const bestDirections = chart.directionJudgments.slice(0, 3).map((judgment) => `${judgment.direction}${judgment.label}`).join(" / ");
  return [
    {
      key: "qimen-board-setup",
      title: "四盤の作盤方針",
      paragraphs: [
        `自然時補正後の日時 ${chart.basis.correctedDateTime} を基準に、年盤・月盤・日盤・時盤を同時に作成しています。`,
        `方位判断の主盤は ${chart.primaryBoard.label} です。年/月/日は背景の時勢、日盤は当日の場、時盤は実行タイミングとして参照します。`,
      ],
    },
    {
      key: "qimen-direction-core",
      title: "方位判断",
      paragraphs: [
        `八門を主軸に、九星、八神、三奇六儀、空亡を加点・減点しています。現在の上位候補は ${bestDirections} です。`,
        "OCRが崩れている局数表と格局表は推測で確定扱いにせず、本文fixture以外の局数は derived として表示します。",
      ],
    },
  ];
}

function buildInterpretationSections(input: QimenInput, resolvedTopic: QimenTopic, selected: QimenDirectionJudgment): NarrativeSection[] {
  return [
    {
      key: "qimen-selected-direction",
      title: `${selected.direction}方位の読み`,
      paragraphs: [
        `${selected.direction}は ${selected.palace}宮で、時盤スコアは ${selected.score} 点、判定は ${selected.label} です。${selected.patterns.join(" / ")} を主な根拠として見ます。`,
        selected.warnings.length
          ? `注意点は ${selected.warnings.join(" / ")} です。吉門が入っていても凶格や空亡が重なる場合は、出発時刻や滞在時間を詰めてください。`
          : "強い警告は出ていません。ただし方位使用では目的・距離・滞在時間を盤の吉凶とあわせて確認してください。",
      ],
    },
    {
      key: "qimen-topic",
      title: `占的 ${resolvedTopic}`,
      paragraphs: buildConsultationParagraphs(input.questionText, resolvedTopic).slice(0, 2),
    },
  ];
}

export function buildQimenChart(input: QimenInput): QimenChart {
  const location = resolveLocationOffset(input.locationId);
  const wallClock = toWallClockDate(input);
  const correctedDate = addMinutes(wallClock, location.offsetMinutes);
  const wallClockPillars = getPillarGanzhi(wallClock);
  const correctedPillars = getPillarGanzhi(correctedDate);
  const yearPillar = createPillar("年", wallClockPillars.year);
  const monthPillar = createPillar("月", wallClockPillars.month);
  const dayPillar = createPillar("日", correctedPillars.day);
  const hourPillar = createPillar("時", correctedPillars.hour);
  const juResolutions: Record<QimenBoardKind, JuResolution> = {
    year: resolveYearJu(wallClock),
    month: resolveMonthJu(wallClock),
    day: resolveDayJu(correctedDate, dayPillar),
    time: resolveTimeJu(correctedDate, hourPillar, dayPillar, correctedPillars.prevQiName),
  };
  const boards = [
    createBoard("year", yearPillar, juResolutions.year),
    createBoard("month", monthPillar, juResolutions.month),
    createBoard("day", dayPillar, juResolutions.day),
    createBoard("time", hourPillar, juResolutions.time),
  ];
  const primaryBoard = boards.find((board) => board.kind === "time") ?? boards[0];
  const directionJudgments = createDirectionJudgments(primaryBoard);
  const selectedDirectionJudgment =
    directionJudgments.find((judgment) => judgment.direction === input.targetDirection) ?? directionJudgments[0];
  const traces = buildTraces({
    wallClockDateTime: formatUtcDateTime(wallClock),
    correctedDateTime: formatUtcDateTime(correctedDate),
    boards,
    juResolutions,
    prevQiName: correctedPillars.prevQiName,
  });
  const sourceReferences: SourceReference[] = [...QIMEN_SOURCE_REFERENCES];
  const messages = Object.values(juResolutions)
    .map((resolution) => resolution.approximation)
    .filter((message): message is string => Boolean(message));
  const unsupportedYear =
    input.year < QIMEN_SUPPORTED_YEAR_RANGE.start || input.year > QIMEN_SUPPORTED_YEAR_RANGE.end
      ? `書籍表の安全対応年は ${QIMEN_SUPPORTED_YEAR_RANGE.start}-${QIMEN_SUPPORTED_YEAR_RANGE.end} 年です。現在の年は検証範囲外です。`
      : null;
  if (unsupportedYear) {
    messages.unshift(unsupportedYear);
  }

  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);
  const basis = {
    wallClockDateTime: formatUtcDateTime(wallClock),
    correctedDateTime: formatUtcDateTime(correctedDate),
    locationLabel: location.label,
    locationOffsetMinutes: location.offsetMinutes,
    supportRange: `${QIMEN_SUPPORTED_YEAR_RANGE.start}-${QIMEN_SUPPORTED_YEAR_RANGE.end}`,
    selectedDirection: input.targetDirection,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
  };
  const explanationSections = buildExplanationSections({ basis, primaryBoard, directionJudgments });
  const interpretationSections = buildInterpretationSections(input, resolvedTopic, selectedDirectionJudgment);
  const relations = buildQimenRelationships(primaryBoard, selectedDirectionJudgment);

  return {
    topic: input.topic,
    resolvedTopic,
    questionText: input.questionText,
    basis,
    boards,
    primaryBoard,
    directionJudgments,
    selectedDirectionJudgment,
    traces,
    sourceReferences,
    certainty: resolveChartCertainty(traces, "derived"),
    explanationSections,
    interpretationSections,
    relations,
    messages,
  };
}
