import type { Branch, GeneralOrder, HeavenlyGeneral, NobleMode, SeasonalState, SixKin, Stem, Wuxing } from "../types";

export const STEM_WUXING: Record<Stem, Wuxing> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

export const BRANCH_WUXING: Record<Branch, Wuxing> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

export const DAY_NIGHT_NOBLE_BRANCH: Record<Stem, Record<NobleMode, Branch>> = {
  甲: { 昼: "未", 夜: "丑" },
  乙: { 昼: "申", 夜: "子" },
  丙: { 昼: "酉", 夜: "亥" },
  丁: { 昼: "亥", 夜: "酉" },
  戊: { 昼: "丑", 夜: "未" },
  己: { 昼: "子", 夜: "申" },
  庚: { 昼: "丑", 夜: "未" },
  辛: { 昼: "寅", 夜: "午" },
  壬: { 昼: "卯", 夜: "巳" },
  癸: { 昼: "巳", 夜: "卯" },
};

export const CLOCKWISE_GENERAL_SET = new Set<Branch>(["亥", "子", "丑", "寅", "卯", "辰"]);

export const GENERAL_ORDER_NAMES: readonly HeavenlyGeneral[] = ["貴人", "蛇", "朱雀", "六合", "勾陳", "青龍", "天空", "白虎", "太常", "玄武", "太陰", "天后"];

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

const SUPPORTS: Record<Wuxing, Wuxing> = {
  木: "水",
  火: "木",
  土: "火",
  金: "土",
  水: "金",
};

export function getSixKin(dayElement: Wuxing, targetElement: Wuxing): SixKin {
  if (dayElement === targetElement) return "兄弟";
  if (GENERATES[dayElement] === targetElement) return "子孫";
  if (OVERCOMES[dayElement] === targetElement) return "妻財";
  if (SUPPORTS[dayElement] === targetElement) return "父母";
  return "官鬼";
}

export function getSeasonalState(seasonElement: Wuxing, targetElement: Wuxing): SeasonalState {
  if (seasonElement === targetElement) return "旺";
  if (GENERATES[seasonElement] === targetElement) return "相";
  if (SUPPORTS[seasonElement] === targetElement) return "休";
  if (OVERCOMES[targetElement] === seasonElement) return "囚";
  return "死";
}

const SAN_HE_GROUPS: Array<{ branches: readonly Branch[]; element: Wuxing }> = [
  { branches: ["申", "子", "辰"], element: "水" },
  { branches: ["亥", "卯", "未"], element: "木" },
  { branches: ["寅", "午", "戌"], element: "火" },
  { branches: ["巳", "酉", "丑"], element: "金" },
];

const ZHI_HE = new Map<string, string>([
  ["子-丑", "支合"],
  ["寅-亥", "支合"],
  ["卯-戌", "支合"],
  ["辰-酉", "支合"],
  ["巳-申", "支合"],
  ["午-未", "支合"],
]);

const CHONG = new Map<string, string>([
  ["子-午", "冲"],
  ["丑-未", "冲"],
  ["寅-申", "冲"],
  ["卯-酉", "冲"],
  ["辰-戌", "冲"],
  ["巳-亥", "冲"],
]);

const HAI = new Map<string, string>([
  ["子-未", "害"],
  ["丑-午", "害"],
  ["寅-巳", "害"],
  ["卯-辰", "害"],
  ["申-亥", "害"],
  ["酉-戌", "害"],
]);

const PO = new Map<string, string>([
  ["子-酉", "破"],
  ["丑-辰", "破"],
  ["寅-亥", "破"],
  ["卯-午", "破"],
  ["巳-申", "破"],
  ["未-戌", "破"],
]);

const XING = new Map<string, string>([
  ["子-卯", "刑"],
  ["寅-巳", "刑"],
  ["巳-申", "刑"],
  ["申-寅", "刑"],
  ["丑-未", "刑"],
  ["未-戌", "刑"],
  ["戌-丑", "刑"],
  ["辰-辰", "自刑"],
  ["午-午", "自刑"],
  ["酉-酉", "自刑"],
  ["亥-亥", "自刑"],
]);

function pairKey(a: Branch, b: Branch) {
  return [a, b].sort().join("-");
}

export function getBranchRelations(a: Branch, b: Branch): string[] {
  const relations = new Set<string>();
  const unordered = pairKey(a, b);
  const direct = `${a}-${b}`;

  if (XING.has(direct)) relations.add(XING.get(direct)!);
  if (a === b && XING.has(`${a}-${b}`)) relations.add(XING.get(`${a}-${b}`)!);
  if (ZHI_HE.has(unordered)) relations.add(ZHI_HE.get(unordered)!);
  if (CHONG.has(unordered)) relations.add(CHONG.get(unordered)!);
  if (HAI.has(unordered)) relations.add(HAI.get(unordered)!);
  if (PO.has(unordered)) relations.add(PO.get(unordered)!);

  SAN_HE_GROUPS.forEach((group) => {
    if (group.branches.includes(a) && group.branches.includes(b) && a !== b) {
      relations.add(`三合(${group.element}局)`);
    }
  });

  return [...relations];
}

export function getGeneralOrderFromNobleEarth(nobleEarth: Branch): GeneralOrder {
  return CLOCKWISE_GENERAL_SET.has(nobleEarth) ? "順" : "逆";
}
