import type {
  BaziChart,
  BaziContext,
  BaziPillar,
  BaziRelation,
  BirthInput,
  Branch,
  Element,
  HiddenStem,
  InterpretationRequest,
  LuckPeriod,
  PersonId,
  RootEvidence,
  Stem,
  StrengthEvidence,
} from "./shichusuimeiTypes";

export const STEMS: readonly Stem[] = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCHES: readonly Branch[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const ELEMENTS: readonly Element[] = ["木", "火", "土", "金", "水"];

export const HIDDEN_STEMS: Readonly<Record<Branch, readonly Stem[]>> = {
  子: ["癸"],
  丑: ["己", "辛", "癸"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "癸", "乙"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "乙", "丁"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "丁", "辛"],
  亥: ["壬", "甲"],
};

const STAGE_NAMES = ["長生", "沐浴", "冠帯", "臨官", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"] as const;
const LONGSHENG_YANG_BRANCH: Readonly<Record<number, number>> = { 0: 11, 2: 2, 4: 2, 6: 5, 8: 8 };
const VOID_BRANCHES_BY_GROUP: readonly (readonly [number, number])[] = [
  [10, 11], [8, 9], [6, 7], [4, 5], [2, 3], [0, 1],
];
const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
const PILLAR_LABELS = ["年柱", "月柱", "日柱", "時柱"] as const;

const STEM_COMBINATIONS = new Map<string, Element>([
  ["甲己", "土"], ["乙庚", "金"], ["丙辛", "水"], ["丁壬", "木"], ["戊癸", "火"],
]);
const STEM_CLASHES = ["甲庚", "乙辛", "丙壬", "丁癸"] as const;
const BRANCH_COMBINATIONS = new Map<string, Element>([
  ["子丑", "土"], ["寅亥", "木"], ["卯戌", "火"], ["辰酉", "金"], ["巳申", "水"], ["午未", "火"],
]);
const BRANCH_CLASHES = ["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"] as const;
const BRANCH_HARMS = ["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"] as const;
const BRANCH_BREAKS = ["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"] as const;
const THREE_HARMONIES: readonly { branches: readonly Branch[]; element: Element }[] = [
  { branches: ["申", "子", "辰"], element: "水" },
  { branches: ["亥", "卯", "未"], element: "木" },
  { branches: ["寅", "午", "戌"], element: "火" },
  { branches: ["巳", "酉", "丑"], element: "金" },
];
const THREE_MEETINGS: readonly { branches: readonly Branch[]; element: Element }[] = [
  { branches: ["亥", "子", "丑"], element: "水" },
  { branches: ["寅", "卯", "辰"], element: "木" },
  { branches: ["巳", "午", "未"], element: "火" },
  { branches: ["申", "酉", "戌"], element: "金" },
];
const THREE_PUNISHMENTS: readonly (readonly Branch[])[] = [
  ["寅", "巳", "申"],
  ["丑", "未", "戌"],
];
const MUTUAL_PUNISHMENT = ["子", "卯"] as const;
const SELF_PUNISHMENTS: readonly Branch[] = ["辰", "午", "酉", "亥"];

const STORAGE: Partial<Record<Branch, { moisture: "湿土" | "燥土"; element: Element }>> = {
  丑: { moisture: "湿土", element: "金" },
  辰: { moisture: "湿土", element: "水" },
  未: { moisture: "燥土", element: "木" },
  戌: { moisture: "燥土", element: "火" },
};

const CONVENTION = "グレゴリオ暦・民用時、年/月はMeeus低精度太陽視黄経による節切り、日界23:00（晩子時）、大運3日=1年、戊同丙・己同丁。太陽黄経は近似式のため節入り直近では数分程度の差があり得る。";
const VERSION = "shichusuimei-core-1.1.0";

function modulo(value: number, base: number): number {
  return ((value % base) + base) % base;
}

function stemIndex(stem: Stem): number {
  return STEMS.indexOf(stem);
}

function branchIndex(branch: Branch): number {
  return BRANCHES.indexOf(branch);
}

export function elementOf(stem: Stem): Element {
  return ELEMENTS[Math.floor(stemIndex(stem) / 2)]!;
}

export function tenGod(day: Stem, stem: Stem): string {
  const dayIndex = stemIndex(day);
  const otherIndex = stemIndex(stem);
  const dayElement = Math.floor(dayIndex / 2);
  const otherElement = Math.floor(otherIndex / 2);
  const samePolarity = dayIndex % 2 === otherIndex % 2;

  if (otherElement === dayElement) return samePolarity ? "比肩" : "劫財";
  if (otherElement === (dayElement + 1) % 5) return samePolarity ? "食神" : "傷官";
  if (otherElement === (dayElement + 2) % 5) return samePolarity ? "偏財" : "正財";
  if (otherElement === (dayElement + 3) % 5) return samePolarity ? "七殺" : "正官";
  return samePolarity ? "偏印" : "正印";
}

function stageOf(stem: Stem, branch: Branch): string {
  const stemIdx = stemIndex(stem);
  const branchIdx = branchIndex(branch);
  const isYang = stemIdx % 2 === 0;
  const yangPartner = isYang ? stemIdx : stemIdx - 1;
  const yangLongsheng = LONGSHENG_YANG_BRANCH[yangPartner]!;
  const longsheng = isYang ? yangLongsheng : modulo(yangLongsheng + 7, 12);
  const stageIdx = isYang ? modulo(branchIdx - longsheng, 12) : modulo(longsheng - branchIdx, 12);
  return STAGE_NAMES[stageIdx]!;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

function validateInput(input: BirthInput): void {
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    throw new RangeError("year must be an integer from 1900 through 2100");
  }
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    throw new RangeError("month must be an integer from 1 through 12");
  }
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > daysInMonth(input.year, input.month)) {
    throw new RangeError("day must form a real Gregorian date");
  }
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23) {
    throw new RangeError("hour must be an integer from 0 through 23");
  }
  if (!Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
    throw new RangeError("minute must be an integer from 0 through 59");
  }
  if (!Number.isFinite(input.utcOffset) || input.utcOffset < -12 || input.utcOffset > 14) {
    throw new RangeError("utcOffset must be from -12 through +14");
  }
  if (input.sex !== "male" && input.sex !== "female") {
    throw new TypeError("sex must be male or female");
  }
}

function julianDay(input: Pick<BirthInput, "year" | "month" | "day" | "hour" | "minute" | "utcOffset">): number {
  let year = input.year;
  let month = input.month;
  const day = input.day + (input.hour + input.minute / 60 - input.utcOffset) / 24;
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716))
    + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function solarLongitude(jd: number): number {
  const t = (jd - 2451545) / 36525;
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const meanAnomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const anomalyRadians = meanAnomaly * Math.PI / 180;
  const correction = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(anomalyRadians)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * anomalyRadians)
    + 0.000289 * Math.sin(3 * anomalyRadians);
  const omega = 125.04 - 1934.136 * t;
  return modulo(l0 + correction - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180), 360);
}

function angleDifference(a: number, b: number): number {
  return modulo(a - b + 180, 360) - 180;
}

function findTermCrossing(target: number, approximateJd: number, windowDays = 20): number {
  let lower = approximateJd - windowDays;
  let upper = approximateJd + windowDays;
  if (angleDifference(solarLongitude(lower), target) > 0) lower -= windowDays;
  if (angleDifference(solarLongitude(upper), target) < 0) upper += windowDays;
  for (let index = 0; index < 60; index += 1) {
    const middle = (lower + upper) / 2;
    if (angleDifference(solarLongitude(middle), target) > 0) upper = middle;
    else lower = middle;
  }
  return (lower + upper) / 2;
}

function lichunJd(year: number): number {
  const approximate = julianDay({ year, month: 2, day: 4, hour: 12, minute: 0, utcOffset: 0 });
  return findTermCrossing(315, approximate, 10);
}

function daysFromAnchor(year: number, month: number, day: number): number {
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / 86400000);
}

function pillarStorage(branch: Branch): { moisture: "湿土" | "燥土"; element: Element } | null {
  const storage = STORAGE[branch];
  return storage ? { ...storage } : null;
}

function makePillar(id: string, label: string, stem: Stem, branch: Branch, dayMaster: Stem): BaziPillar {
  const hidden: HiddenStem[] = HIDDEN_STEMS[branch].map((hiddenStem, index) => ({
    id: `${id}-h-${hiddenStem}`,
    stem: hiddenStem,
    element: elementOf(hiddenStem),
    tenGod: tenGod(dayMaster, hiddenStem),
    main: index === 0,
  }));
  return {
    id,
    label,
    stem,
    branch,
    ganzhi: `${stem}${branch}`,
    element: elementOf(stem),
    tenGod: id.endsWith("-day") ? "日主" : tenGod(dayMaster, stem),
    stage: stageOf(dayMaster, branch),
    hidden,
    storage: pillarStorage(branch),
  };
}

function pairMatches(a: string, b: string, pairs: readonly string[]): boolean {
  return pairs.includes(`${a}${b}`) || pairs.includes(`${b}${a}`);
}

function mapPair<T>(a: string, b: string, pairs: ReadonlyMap<string, T>): T | undefined {
  return pairs.get(`${a}${b}`) ?? pairs.get(`${b}${a}`);
}

interface RelationFact {
  id: string;
  value: Stem | Branch;
  kind: "stem" | "branch";
  owner: PersonId;
  origin: "natal" | "luck" | "partner";
  pillar: BaziPillar;
}

function visibleFacts(
  pillars: readonly BaziPillar[],
  owner: PersonId,
  origin: RelationFact["origin"] = "natal",
): RelationFact[] {
  return pillars.flatMap((pillar) => [
    { id: `${pillar.id}-s`, value: pillar.stem, kind: "stem" as const, owner, origin, pillar },
    { id: `${pillar.id}-b`, value: pillar.branch, kind: "branch" as const, owner, origin, pillar },
  ]);
}

function relation(
  tag: string,
  kind: string,
  from: RelationFact,
  to: RelationFact,
  scope: BaziRelation["scope"],
  description: string,
  conditional: boolean,
  suffix = "",
): BaziRelation {
  return {
    id: `${scope}-${tag}-${from.id}-${to.id}${suffix}`,
    kind,
    fromId: from.id,
    toId: to.id,
    from: from.value,
    to: to.value,
    scope,
    description,
    conditional,
  };
}

function factLabel(fact: RelationFact, scope: BaziRelation["scope"]): string {
  if (fact.origin === "luck") return `${fact.pillar.label}${fact.value}`;
  if (scope === "partner") return `${fact.owner === "a" ? "本人" : "相手"}${fact.pillar.label}${fact.value}`;
  if (scope === "luck") return `原局${fact.pillar.label}${fact.value}`;
  return `${fact.pillar.label}${fact.value}`;
}

function branchPairRelations(
  from: RelationFact,
  to: RelationFact,
  scope: BaziRelation["scope"],
  dayMasters: Partial<Record<PersonId, Stem>>,
): BaziRelation[] {
  const output: BaziRelation[] = [];
  const combinedElement = mapPair(from.value, to.value, BRANCH_COMBINATIONS);
  if (combinedElement) {
    output.push(relation("branch-combine", "地支六合（合化未判定）", from, to, scope,
      `六合を検出。${combinedElement}への合化は月令・透干・妨害などの成立条件を別途確認する。`, true));
  }
  if (pairMatches(from.value, to.value, BRANCH_CLASHES)) {
    output.push(relation("branch-clash", "地支冲", from, to, scope,
      "冲の配置を検出。作用の強弱と結果は命局全体の条件に依存する。", false));
    if (from.pillar.storage || to.pillar.storage) {
      output.push(relation("storage-clash", "墓庫冲（開庫未判定）", from, to, scope,
        "墓庫への冲を検出したが、透干・会支を含む条件を見ずに開庫成立とは扱わない。", true));
    }
    for (const target of [from, to]) {
      const dayMaster = dayMasters[target.owner];
      if (!dayMaster || target.origin === "luck") continue;
      const roots = target.pillar.hidden.filter((hidden) => hidden.element === elementOf(dayMaster));
      if (roots.length === 0) continue;
      const rootDetails = roots.map((root) =>
        `${root.stem}（${root.stem === dayMaster ? "同干" : "異干"}・${root.main ? "主気" : "余気"}）`).join("・");
      output.push(relation("root-disturbance", "根の動揺（抜根未判定）", from, to, scope,
        `${target.owner.toUpperCase()}（日主${dayMaster}）の${factLabel(target, scope)}に本人所有の根${rootDetails}を検出。冲だけで抜根成立とは扱わない。`,
        true, `-${target.id}`));
    }
  }
  if (pairMatches(from.value, to.value, BRANCH_HARMS)) {
    output.push(relation("branch-harm", "地支害", from, to, scope,
      "害の配置を検出。具体的作用は命局全体の条件に依存する。", false));
  }
  if (pairMatches(from.value, to.value, BRANCH_BREAKS)) {
    output.push(relation("branch-break", "地支破", from, to, scope,
      "破の配置を検出。具体的作用は命局全体の条件に依存する。", false));
  }
  return output;
}

function pairRelations(
  from: RelationFact,
  to: RelationFact,
  scope: BaziRelation["scope"],
  dayMasters: Partial<Record<PersonId, Stem>>,
): BaziRelation[] {
  if (from.kind !== to.kind) return [];
  if (from.kind === "branch") return branchPairRelations(from, to, scope, dayMasters);

  const output: BaziRelation[] = [];
  const combinedElement = mapPair(from.value, to.value, STEM_COMBINATIONS);
  if (combinedElement) {
    output.push(relation("stem-combine", "天干五合（合化未判定）", from, to, scope,
      `天干五合を検出。${combinedElement}への化は月令・通根・妨害などの成立条件を別途確認する。`, true));
  }
  if (pairMatches(from.value, to.value, STEM_CLASHES)) {
    output.push(relation("stem-clash", "天干冲", from, to, scope,
      "天干の対立配置を検出。作用の強弱は通根と周囲の干支に依存する。", false));
  }
  return output;
}

function completeGroupRelations(
  facts: readonly RelationFact[],
  scope: BaziRelation["scope"],
  groups: readonly { branches: readonly Branch[]; element: Element }[],
  tag: string,
  kind: string,
  requiredFactIds?: ReadonlySet<string>,
): BaziRelation[] {
  const branchFacts = facts.filter((fact) => fact.kind === "branch");
  const output: BaziRelation[] = [];
  for (const group of groups) {
    const candidates = group.branches.map((branch) => branchFacts.filter((fact) => fact.value === branch));
    if (candidates.some((items) => items.length === 0)) continue;
    const combinations = candidates.reduce<RelationFact[][]>(
      (sets, items) => sets.flatMap((set) => items.map((item) => [...set, item])),
      [[]],
    );
    for (const present of combinations) {
      if (requiredFactIds) {
        const requiredCount = present.filter((fact) => requiredFactIds.has(fact.id)).length;
        if (requiredCount === 0 || requiredCount === present.length) continue;
      }
      const participantIds = present.map((fact) => fact.id);
      for (let index = 0; index < present.length; index += 1) {
        const from = present[index]!;
        const to = present[(index + 1) % present.length]!;
        output.push({
          ...relation(tag, `${kind}（化局未判定）`, from, to, scope,
            `${group.branches.join("")}の${kind}三支を検出（${present.map((fact) => factLabel(fact, scope)).join("・")}）。${group.element}局への変化は透干・月令・妨害などの成立条件を別途確認する。`,
            true, `-${participantIds.join("_")}`),
          memberIds: participantIds,
        });
      }
    }
  }
  return output;
}

function spansRequiredFacts(facts: readonly RelationFact[], requiredFactIds?: ReadonlySet<string>): boolean {
  if (!requiredFactIds) return true;
  const requiredCount = facts.filter((fact) => requiredFactIds.has(fact.id)).length;
  return requiredCount > 0 && requiredCount < facts.length;
}

function punishmentRelations(
  facts: readonly RelationFact[],
  scope: BaziRelation["scope"],
  requiredFactIds?: ReadonlySet<string>,
): BaziRelation[] {
  const branches = facts.filter((fact) => fact.kind === "branch");
  const output: BaziRelation[] = [];
  for (const group of THREE_PUNISHMENTS) {
    const candidates = group.map((branch) => branches.filter((fact) => fact.value === branch));
    const available = candidates.filter((items) => items.length > 0);
    if (available.length === 3) {
      const combinations = candidates.reduce<RelationFact[][]>(
        (sets, items) => sets.flatMap((set) => items.map((item) => [...set, item])),
        [[]],
      );
      for (const present of combinations.filter((items) => spansRequiredFacts(items, requiredFactIds))) {
        const participantIds = present.map((fact) => fact.id);
        for (let index = 0; index < present.length; index += 1) {
          output.push({
            ...relation("three-punishment", "地支三刑", present[index]!, present[(index + 1) % present.length]!, scope,
              `${group.join("")}の三支が揃った刑を検出（${present.map((fact) => factLabel(fact, scope)).join("・")}）。作用は命局全体の条件に依存する。`,
              false, `-${participantIds.join("_")}`),
            memberIds: participantIds,
          });
        }
      }
    } else if (available.length === 2) {
      for (const from of available[0]!) {
        for (const to of available[1]!) {
          const present = [from, to];
          if (!spansRequiredFacts(present, requiredFactIds)) continue;
          const participantIds = present.map((fact) => fact.id);
          output.push({
            ...relation("punishment-candidate", "地支刑候補（二支）", from, to, scope,
              `${group.join("")}のうち二支のみを検出（${present.map((fact) => factLabel(fact, scope)).join("・")}）。三刑成立とはせず候補として保持する。`,
              true, `-${participantIds.join("_")}`),
            memberIds: participantIds,
          });
        }
      }
    }
  }
  const mutual = MUTUAL_PUNISHMENT.map((branch) => branches.filter((fact) => fact.value === branch));
  for (const from of mutual[0]!) {
    for (const to of mutual[1]!) {
      if (!spansRequiredFacts([from, to], requiredFactIds)) continue;
      output.push(relation("mutual-punishment", "地支相刑", from, to, scope,
        "子卯の相刑を検出。作用は命局全体の条件に依存する。", false));
    }
  }
  for (const branch of SELF_PUNISHMENTS) {
    const matching = branches.filter((fact) => fact.value === branch);
    for (let left = 0; left < matching.length; left += 1) {
      for (let right = left + 1; right < matching.length; right += 1) {
        const pair = [matching[left]!, matching[right]!];
        if (!spansRequiredFacts(pair, requiredFactIds)) continue;
        output.push(relation("self-punishment", "地支自刑", pair[0]!, pair[1]!, scope,
          `${branch}支の重複による自刑を検出（${pair.map((fact) => factLabel(fact, scope)).join("・")}）。作用は命局全体の条件に依存する。`,
          false));
      }
    }
  }
  return output;
}

function withinRelations(chart: Pick<BaziChart, "id" | "pillars" | "dayMaster">): BaziRelation[] {
  const facts = visibleFacts(chart.pillars, chart.id);
  const output: BaziRelation[] = [];
  for (let left = 0; left < facts.length; left += 1) {
    for (let right = left + 1; right < facts.length; right += 1) {
      output.push(...pairRelations(facts[left]!, facts[right]!, "natal", { [chart.id]: chart.dayMaster }));
    }
  }
  output.push(...completeGroupRelations(facts, "natal", THREE_HARMONIES, "three-harmony", "地支三合"));
  output.push(...completeGroupRelations(facts, "natal", THREE_MEETINGS, "three-meeting", "地支三会"));
  output.push(...punishmentRelations(facts, "natal"));
  return output;
}

function crossRelations(
  left: BaziChart,
  rightPillars: readonly BaziPillar[],
  rightOwner: PersonId,
  scope: "luck" | "partner",
  rightDayMaster?: Stem,
): BaziRelation[] {
  const leftFacts = visibleFacts(left.pillars, left.id);
  const rightFacts = visibleFacts(rightPillars, rightOwner, scope);
  const rightFactIds = new Set(rightFacts.map((fact) => fact.id));
  const dayMasters: Partial<Record<PersonId, Stem>> = { [left.id]: left.dayMaster };
  if (rightDayMaster) dayMasters[rightOwner] = rightDayMaster;
  const allFacts = [...leftFacts, ...rightFacts];
  const output: BaziRelation[] = [];
  for (const from of leftFacts) {
    for (const to of rightFacts) output.push(...pairRelations(from, to, scope, dayMasters));
  }
  output.push(...completeGroupRelations(allFacts, scope, THREE_HARMONIES, "three-harmony", "地支三合", rightFactIds));
  output.push(...completeGroupRelations(allFacts, scope, THREE_MEETINGS, "three-meeting", "地支三会", rightFactIds));
  output.push(...punishmentRelations(allFacts, scope, rightFactIds));
  return output.filter((item) => {
    if (scope !== "partner") return true;
    return rightFactIds.has(item.fromId) !== rightFactIds.has(item.toId);
  });
}

/**
 * 通根は対象天干と同じ五行を持つ蔵干とする。陰陽が異なる蔵干も根に含め、
 * RootEvidence.stem に実蔵干、main に主気/余気を残して軽重判断の材料を分離する。
 */
function rootsInPillars(pillars: readonly BaziPillar[], stem: Stem): RootEvidence[] {
  return pillars.flatMap((pillar) => pillar.hidden
    .filter((hidden) => hidden.element === elementOf(stem))
    .map((hidden) => ({
      id: hidden.id,
      pillarId: pillar.id,
      branch: pillar.branch,
      stem: hidden.stem,
      main: hidden.main,
    })));
}

export function rootsForStem(chart: BaziChart, stem: Stem, luck?: LuckPeriod): RootEvidence[] {
  return rootsInPillars(luck ? [...chart.pillars, luck] : chart.pillars, stem);
}

function elementProduces(source: Element, target: Element): boolean {
  return (ELEMENTS.indexOf(source) + 1) % 5 === ELEMENTS.indexOf(target);
}

function visibleStemEffect(god: string): "生扶" | "泄" | "耗" | "克" {
  if (["比肩", "劫財", "偏印", "正印"].includes(god)) return "生扶";
  if (["食神", "傷官"].includes(god)) return "泄";
  if (["偏財", "正財"].includes(god)) return "耗";
  return "克";
}

function strengthEvidence(chart: Pick<BaziChart, "id" | "pillars" | "dayMaster" | "monthBranch">): StrengthEvidence {
  const roots = rootsInPillars(chart.pillars, chart.dayMaster);
  const dayElement = elementOf(chart.dayMaster);
  const monthMainElement = elementOf(HIDDEN_STEMS[chart.monthBranch][0]!);
  const seasonalSupport = monthMainElement === dayElement || elementProduces(monthMainElement, dayElement);
  const mainRoots = roots.filter((root) => root.main);
  const sameStemRoots = roots.filter((root) => root.stem === chart.dayMaster);
  const otherStemRoots = roots.filter((root) => root.stem !== chart.dayMaster);

  const support: string[] = [];
  const drain: string[] = [];
  const effectCounts = { 泄: 0, 耗: 0, 克: 0 };
  for (const pillar of chart.pillars.filter((item) => !item.id.endsWith("-day"))) {
    const god = tenGod(chart.dayMaster, pillar.stem);
    const effect = visibleStemEffect(god);
    const evidence = `${pillar.id}-s:${pillar.stem}${pillar.element}（${god}・${effect}）`;
    if (effect === "生扶") support.push(evidence);
    else {
      drain.push(evidence);
      effectCounts[effect] += 1;
    }
  }

  const clearlyStrong = seasonalSupport
    && mainRoots.length > 0
    && roots.length >= 2
    && support.length >= 2
    && support.length > drain.length;
  const clearlyWeak = !seasonalSupport
    && mainRoots.length === 0
    && roots.length <= 1
    && support.length === 0
    && drain.length >= 2;
  const label: StrengthEvidence["label"] = clearlyStrong ? "身強寄り" : clearlyWeak ? "身弱寄り" : "判定保留";
  const decisionReason = clearlyStrong
    ? "月令・主気通根・複数通根・透干生扶が同じ強方向を示すため、限定規則では身強寄り。"
    : clearlyWeak
      ? "月令非生扶・主気根なし・軽い通根・透干の泄耗克が同じ弱方向を示すため、限定規則では身弱寄り。"
      : "月令・通根の主余気・透干の生扶泄耗克が一方向に揃わないため判定を保留。";

  return {
    label,
    status: "rule-estimate",
    seasonalState: `月令${chart.monthBranch}の本気${HIDDEN_STEMS[chart.monthBranch][0]}（${monthMainElement}）は日主${chart.dayMaster}（${dayElement}）を${seasonalSupport ? "扶助する側" : "直接は扶助しない側"}`,
    roots,
    support,
    drain,
    reasons: [
      `同五行の通根は出生四支の全蔵干から${roots.length}件（同干${sameStemRoots.length}件・異干${otherStemRoots.length}件、主気${mainRoots.length}件・余気${roots.length - mainRoots.length}件）を検出。`,
      seasonalSupport ? "月令本気の五行は日主を扶助する側。" : "月令本気の五行は日主を直接は扶助しない側。",
      `透干（日干を除く）は生扶側${support.length}件、泄耗克側${drain.length}件（泄${effectCounts.泄}・耗${effectCounts.耗}・克${effectCounts.克}）。`,
      decisionReason,
    ],
    caveats: [
      "これは月令本気・同五行通根・透干の生扶泄耗克による限定規則で、最終旺衰の断定ではない。",
      "特殊格・合化は未検討。格局・扶抑・調候・病薬・通関、刑冲による実効性は別工程で確認する。",
      "大運や相手命式は出生時の月令および原局の根を変更しない。",
    ],
    ruleVersion: "shichusuimei-strength-1.2.0",
  };
}

function calendarParts(input: BirthInput): {
  stems: readonly [Stem, Stem, Stem, Stem];
  branches: readonly [Branch, Branch, Branch, Branch];
  dayCycle: number;
  birthJd: number;
  monthNodeIndex: number;
} {
  const birthJd = julianDay(input);
  const longitude = solarLongitude(birthJd);
  const monthNodeIndex = Math.floor(modulo(longitude - 315, 360) / 30);
  const monthBranchIdx = modulo(2 + monthNodeIndex, 12);

  const adjustedYear = birthJd >= lichunJd(input.year) ? input.year : input.year - 1;
  const yearStemIdx = modulo(adjustedYear - 4, 10);
  const yearBranchIdx = modulo(adjustedYear - 4, 12);
  const monthStemBase = modulo(2 + 2 * (yearStemIdx % 5), 10);
  const monthStemIdx = modulo(monthStemBase + monthNodeIndex, 10);

  let effectiveDays = daysFromAnchor(input.year, input.month, input.day);
  if (input.hour >= 23) effectiveDays += 1;
  const dayCycle = modulo(54 + effectiveDays, 60);
  const dayStemIdx = dayCycle % 10;
  const dayBranchIdx = dayCycle % 12;
  const hourBranchIdx = Math.floor((input.hour + 1) / 2) % 12;
  const hourStemIdx = modulo(2 * (dayStemIdx % 5) + hourBranchIdx, 10);

  return {
    stems: [STEMS[yearStemIdx]!, STEMS[monthStemIdx]!, STEMS[dayStemIdx]!, STEMS[hourStemIdx]!],
    branches: [BRANCHES[yearBranchIdx]!, BRANCHES[monthBranchIdx]!, BRANCHES[dayBranchIdx]!, BRANCHES[hourBranchIdx]!],
    dayCycle,
    birthJd,
    monthNodeIndex,
  };
}

function buildWarnings(input: BirthInput, birthJd: number, monthNodeIndex: number): string[] {
  const warnings: string[] = [];
  const thisNode = modulo(315 + 30 * monthNodeIndex, 360);
  const nextNode = modulo(315 + 30 * (monthNodeIndex + 1), 360);
  let previousJd = findTermCrossing(thisNode, birthJd);
  if (previousJd > birthJd) previousJd = findTermCrossing(thisNode, birthJd - 40);
  let nextJd = findTermCrossing(nextNode, birthJd);
  if (nextJd < birthJd) nextJd = findTermCrossing(nextNode, birthJd + 40);
  if (Math.min(birthJd - previousJd, nextJd - birthJd) <= 1 / 24) {
    warnings.push("節入りの前後1時間以内。近似太陽黄経の誤差で月柱または年柱が変わる可能性がある。");
  }
  const minutesOfDay = input.hour * 60 + input.minute;
  if (Math.abs(minutesOfDay - 23 * 60) <= 5) {
    warnings.push("23:00の晩子時による日界付近。出生時刻の誤差で日柱が変わる可能性がある。");
  }
  const hourBranchBoundaries = Array.from({ length: 12 }, (_, index) => (index * 2 + 1) * 60);
  if (hourBranchBoundaries.some((boundary) => Math.abs(minutesOfDay - boundary) <= 5)) {
    warnings.push("二時間ごとの時辰境界付近。出生時刻の誤差で時柱が変わる可能性がある。");
  }
  return warnings;
}

function luckPeriods(
  id: PersonId,
  monthPillar: BaziPillar,
  dayMaster: Stem,
  birthJd: number,
  monthNodeIndex: number,
  forward: boolean,
): LuckPeriod[] {
  const currentNode = modulo(315 + 30 * monthNodeIndex, 360);
  const nextNode = modulo(315 + 30 * (monthNodeIndex + 1), 360);
  let currentNodeJd = findTermCrossing(currentNode, birthJd);
  if (currentNodeJd > birthJd) currentNodeJd = findTermCrossing(currentNode, birthJd - 40);
  let nextNodeJd = findTermCrossing(nextNode, birthJd);
  if (nextNodeJd < birthJd) nextNodeJd = findTermCrossing(nextNode, birthJd + 40);
  const initialAge = (forward ? nextNodeJd - birthJd : birthJd - currentNodeJd) / 3;
  const monthStemIdx = stemIndex(monthPillar.stem);
  const monthBranchIdx = branchIndex(monthPillar.branch);

  return Array.from({ length: 8 }, (_, index) => {
    const direction = forward ? index + 1 : -(index + 1);
    const stem = STEMS[modulo(monthStemIdx + direction, 10)]!;
    const branch = BRANCHES[modulo(monthBranchIdx + direction, 12)]!;
    const startAge = Math.round((initialAge + 10 * index) * 1000) / 1000;
    const pillar = makePillar(`${id}-luck-${index}`, `第${index + 1}大運`, stem, branch, dayMaster);
    return { ...pillar, index, startAge, endAge: Math.round((startAge + 10) * 1000) / 1000 };
  });
}

export function buildBaziChart(input: BirthInput, id: PersonId = "a"): BaziChart {
  validateInput(input);
  if (id !== "a" && id !== "b") throw new TypeError("id must be a or b");
  const copiedInput: BirthInput = { ...input };
  const parts = calendarParts(copiedInput);
  const dayMaster = parts.stems[2];
  const pillars = PILLAR_KEYS.map((key, index) => makePillar(
    `${id}-${key}`,
    PILLAR_LABELS[index]!,
    parts.stems[index]!,
    parts.branches[index]!,
    dayMaster,
  ));
  const yearIsYang = stemIndex(parts.stems[0]) % 2 === 0;
  const forward = yearIsYang === (copiedInput.sex === "male");
  const luck = luckPeriods(id, pillars[1]!, dayMaster, parts.birthJd, parts.monthNodeIndex, forward);
  const monthBranch = parts.branches[1];
  const season: BaziChart["season"] = ["寅", "卯", "辰"].includes(monthBranch) ? "春"
    : ["巳", "午", "未"].includes(monthBranch) ? "夏"
      : ["申", "酉", "戌"].includes(monthBranch) ? "秋" : "冬";
  const voidPair = VOID_BRANCHES_BY_GROUP[Math.floor(parts.dayCycle / 10)]!;
  const strength = strengthEvidence({ id, pillars, dayMaster, monthBranch });
  const relations = withinRelations({ id, pillars, dayMaster });
  return {
    id,
    input: copiedInput,
    dayMaster,
    element: elementOf(dayMaster),
    monthBranch,
    season,
    pillars,
    luck,
    direction: forward ? "順行" : "逆行",
    voidBranches: [BRANCHES[voidPair[0]]!, BRANCHES[voidPair[1]]!],
    strength,
    relations,
    warnings: buildWarnings(copiedInput, parts.birthJd, parts.monthNodeIndex),
    convention: CONVENTION,
    version: VERSION,
  };
}

function chartFactIds(chart: BaziChart, selectedLuck?: LuckPeriod | null): string[] {
  const pillars = selectedLuck ? [...chart.pillars, selectedLuck] : chart.pillars;
  const pillarIds = pillars.flatMap((pillar) => [
    pillar.id,
    `${pillar.id}-s`,
    `${pillar.id}-b`,
    ...pillar.hidden.map((hidden) => hidden.id),
  ]);
  return [...pillarIds, `${chart.id}-strength`];
}

export function buildBaziContext(request: InterpretationRequest): BaziContext {
  if (request.focus === "compatibility" && !request.partner) {
    throw new Error("partner is required for compatibility");
  }
  if (request.luckIndex !== undefined
    && (!Number.isInteger(request.luckIndex) || request.luckIndex < 0 || request.luckIndex > 7)) {
    throw new RangeError("luckIndex must be an integer from 0 through 7");
  }

  const person = buildBaziChart(request.person, "a");
  const partner = request.partner ? buildBaziChart(request.partner, "b") : null;
  const luck = request.luckIndex === undefined ? null : person.luck[request.luckIndex]!;
  const relations = [...person.relations];
  if (luck) relations.push(...crossRelations(person, [luck], "a", "luck"));
  if (partner) {
    relations.push(...partner.relations);
    relations.push(...crossRelations(person, partner.pillars, "b", "partner", partner.dayMaster));
  }
  const factIds = [
    ...chartFactIds(person, luck),
    ...(partner ? chartFactIds(partner) : []),
    ...relations.map((item) => item.id),
  ];
  return { person, partner, luck, relations, factIds: [...new Set(factIds)] };
}
