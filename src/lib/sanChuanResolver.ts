import { BRANCHES, EARTH_RING_SEQUENCE, STEM_JI_GONG } from "./data/core";
import { BRANCH_WUXING, STEM_WUXING } from "./data/rules";
import { SAN_CHUAN_LOOKUP } from "./data/sanChuanLookup";
import type { Branch, Ganzhi, LessonType, SanChuanRow, Stem, Wuxing } from "./types";

interface DerivedLessonContext {
  index: 1 | 2 | 3 | 4;
  lower: Stem | Branch;
  upper: Branch;
  lowerElement: Wuxing;
  upperElement: Wuxing;
  isLowerOvercomesUpper: boolean;
  isUpperOvercomesLower: boolean;
}

type DerivedTriple = Pick<SanChuanRow, "initial" | "middle" | "final">;

export interface SanChuanResolution {
  row: SanChuanRow | null;
  source: "lookup" | "derived" | "unresolved";
  trace: string[];
}

const BRANCH_INDEX = Object.fromEntries(BRANCHES.map((branch, index) => [branch, index])) as Record<Branch, number>;
const EARTH_RING_INDEX = Object.fromEntries(EARTH_RING_SEQUENCE.map((branch, index) => [branch, index])) as Record<Branch, number>;

const OVERCOMES: Record<Wuxing, Wuxing> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

const PUNISHMENT_TARGET: Partial<Record<Branch, Branch>> = {
  子: "卯",
  丑: "未",
  寅: "巳",
  巳: "申",
  申: "寅",
  未: "戌",
  戌: "丑",
  辰: "辰",
  午: "午",
  酉: "酉",
  亥: "亥",
};

const OPPOSITE_BRANCH: Record<Branch, Branch> = {
  子: "午",
  丑: "未",
  寅: "申",
  卯: "酉",
  辰: "戌",
  巳: "亥",
  午: "子",
  未: "丑",
  申: "寅",
  酉: "卯",
  戌: "辰",
  亥: "巳",
};

const TRAVEL_HORSE_BY_BRANCH: Record<Branch, Branch> = {
  子: "寅",
  辰: "寅",
  申: "寅",
  卯: "巳",
  未: "巳",
  亥: "巳",
  寅: "申",
  午: "申",
  戌: "申",
  丑: "亥",
  巳: "亥",
  酉: "亥",
};

const MENG_BRANCHES = new Set<Branch>(["寅", "巳", "申", "亥"]);
const ZHONG_BRANCHES = new Set<Branch>(["子", "卯", "午", "酉"]);

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function normalizeBranch(value: Branch | "戊") {
  return (value === "戊" ? "戌" : value) as Branch;
}

function normalizeLookupRow(dayGanzhi: Ganzhi, firstUpper: Branch) {
  const row = SAN_CHUAN_LOOKUP[dayGanzhi]?.[firstUpper];
  if (!row) return null;

  return {
    initial: normalizeBranch(row.initial as Branch | "戊"),
    middle: normalizeBranch(row.middle as Branch | "戊"),
    final: normalizeBranch(row.final as Branch | "戊"),
    lessonType: row.lessonType,
  } satisfies SanChuanRow;
}

function getYinYangIndex(branch: Branch) {
  return BRANCH_INDEX[branch] % 2 === 0 ? "陽" : "陰";
}

function getStemYinYang(stem: Stem) {
  return ["甲", "丙", "戊", "庚", "壬"].includes(stem) ? "陽" : "陰";
}

function getLowerElement(lower: Stem | Branch) {
  return (STEM_WUXING[lower as Stem] ?? BRANCH_WUXING[lower as Branch]) as Wuxing;
}

function buildVirtualHeavenPlate(dayStem: Stem, firstUpper: Branch) {
  const offset = mod(BRANCH_INDEX[firstUpper] - EARTH_RING_INDEX[STEM_JI_GONG[dayStem]], BRANCHES.length);
  return EARTH_RING_SEQUENCE.reduce(
    (result, earthBranch, index) => {
      result[earthBranch] = BRANCHES[mod(index + offset, BRANCHES.length)];
      return result;
    },
    {} as Record<Branch, Branch>,
  );
}

function buildDerivedLessons(dayStem: Stem, dayBranch: Branch, firstUpper: Branch) {
  const heavenPlate = buildVirtualHeavenPlate(dayStem, firstUpper);
  const upperOne = heavenPlate[STEM_JI_GONG[dayStem]];
  const upperTwo = heavenPlate[upperOne];
  const upperThree = heavenPlate[dayBranch];
  const upperFour = heavenPlate[upperThree];

  const sequence: Array<{ lower: Stem | Branch; upper: Branch }> = [
    { lower: dayStem, upper: upperOne },
    { lower: upperOne, upper: upperTwo },
    { lower: dayBranch, upper: upperThree },
    { lower: upperThree, upper: upperFour },
  ];

  return {
    heavenPlate,
    lessons: sequence.map((item, index) => {
      const lowerElement = getLowerElement(item.lower);
      const upperElement = BRANCH_WUXING[item.upper];

      return {
        index: (index + 1) as DerivedLessonContext["index"],
        lower: item.lower,
        upper: item.upper,
        lowerElement,
        upperElement,
        isLowerOvercomesUpper: OVERCOMES[lowerElement] === upperElement,
        isUpperOvercomesLower: OVERCOMES[upperElement] === lowerElement,
      };
    }),
  };
}

function dedupeByUpper(lessons: readonly DerivedLessonContext[]) {
  const seen = new Set<Branch>();
  return lessons.filter((lesson) => {
    if (seen.has(lesson.upper)) return false;
    seen.add(lesson.upper);
    return true;
  });
}

function getSheHaiBucket(branch: Branch) {
  if (MENG_BRANCHES.has(branch)) return 0;
  if (ZHONG_BRANCHES.has(branch)) return 1;
  return 2;
}

function chooseByParityAndSheHai(dayStem: Stem, lessons: readonly DerivedLessonContext[]) {
  const targetParity = getStemYinYang(dayStem);
  const parityMatched = lessons.filter((lesson) => getYinYangIndex(lesson.upper) === targetParity);
  if (parityMatched.length === 1) {
    return { lesson: parityMatched[0], usedParity: true };
  }

  const pool = parityMatched.length ? parityMatched : lessons;
  const ranked = [...pool].sort((a, b) => {
    const bucketDiff = getSheHaiBucket(a.upper) - getSheHaiBucket(b.upper);
    if (bucketDiff !== 0) return bucketDiff;

    return getStemYinYang(dayStem) === "陽" ? a.index - b.index : b.index - a.index;
  });

  return { lesson: ranked[0], usedParity: false };
}

function resolveDirectKe(dayStem: Stem, lessons: readonly DerivedLessonContext[]) {
  const lowerCandidates = dedupeByUpper(lessons.filter((lesson) => lesson.isLowerOvercomesUpper));
  if (lowerCandidates.length === 1) {
    return { lessonType: "重審" as LessonType, lesson: lowerCandidates[0], trace: ["四課に下賊上が1つだけあるため重審"] };
  }
  if (lowerCandidates.length > 1) {
    const selected = chooseByParityAndSheHai(dayStem, lowerCandidates);
    return {
      lessonType: selected.usedParity ? ("知一" as LessonType) : ("渉害" as LessonType),
      lesson: selected.lesson,
      trace: [
        `四課に下賊上が${lowerCandidates.length}件あるため知一/渉害を判定`,
        selected.usedParity ? "日干の陰陽に比する神を採用" : "比神が定まらないため渉害の順位で採用",
      ],
    };
  }

  const upperCandidates = dedupeByUpper(lessons.filter((lesson) => lesson.isUpperOvercomesLower));
  if (upperCandidates.length === 1) {
    return { lessonType: "元首" as LessonType, lesson: upperCandidates[0], trace: ["四課に上克下が1つだけあるため元首"] };
  }
  if (upperCandidates.length > 1) {
    const selected = chooseByParityAndSheHai(dayStem, upperCandidates);
    return {
      lessonType: selected.usedParity ? ("知一" as LessonType) : ("渉害" as LessonType),
      lesson: selected.lesson,
      trace: [
        `四課に上克下が${upperCandidates.length}件あるため知一/渉害を判定`,
        selected.usedParity ? "日干の陰陽に比する神を採用" : "比神が定まらないため渉害の順位で採用",
      ],
    };
  }

  return null;
}

function resolveRemoteKe(dayStem: Stem, dayElement: Wuxing, lessons: readonly DerivedLessonContext[]) {
  const lessonsByUpper = dedupeByUpper(lessons);
  const remoteUpper = lessonsByUpper.filter((lesson) => OVERCOMES[lesson.upperElement] === dayElement);
  const remoteLower = lessonsByUpper.filter((lesson) => OVERCOMES[dayElement] === lesson.upperElement);
  const pool = remoteUpper.length ? remoteUpper : remoteLower;

  if (!pool.length) return null;

  const selected = chooseByParityAndSheHai(dayStem, pool);
  return {
    lessonType: "遥剋" as LessonType,
    lesson: selected.lesson,
    trace: [
      remoteUpper.length ? "無克時は神遥克日を優先" : "神遥克日がないため日遥克神を採用",
      selected.usedParity ? "日干の陰陽に比する神を採用" : "比神が定まらないため課順で採用",
    ],
  };
}

function getPunishmentTarget(branch: Branch) {
  return PUNISHMENT_TARGET[branch] ?? branch;
}

function deriveFuyinRow(dayStem: Stem, dayBranch: Branch, firstUpper: Branch, keResolution: ReturnType<typeof resolveDirectKe>): DerivedTriple {
  const initial = keResolution?.lesson.upper ?? (getStemYinYang(dayStem) === "陽" ? firstUpper : dayBranch);

  if (dayStem === "癸") {
    return { initial, middle: "戌", final: "未" };
  }

  if (dayStem === "壬") {
    if (dayBranch === "辰" || dayBranch === "午") {
      return { initial, middle: "巳", final: "申" };
    }
    return {
      initial,
      middle: dayBranch,
      final: getPunishmentTarget(dayBranch),
    };
  }

  const middle = initial === firstUpper && ["辰", "午", "酉", "亥"].includes(initial) ? (getStemYinYang(dayStem) === "陽" ? dayBranch : firstUpper) : getPunishmentTarget(initial);
  const final = ["辰", "午", "酉", "亥"].includes(middle) ? OPPOSITE_BRANCH[middle] : getPunishmentTarget(middle);

  return { initial, middle, final };
}

function deriveFanyinRow(initial: Branch): DerivedTriple {
  return {
    initial,
    middle: OPPOSITE_BRANCH[initial],
    final: initial,
  };
}

function deriveFanyinNoKeRow(dayStem: Stem, dayBranch: Branch, heavenPlate: Record<Branch, Branch>): DerivedTriple {
  return {
    initial: TRAVEL_HORSE_BY_BRANCH[dayBranch],
    middle: heavenPlate[dayBranch],
    final: heavenPlate[STEM_JI_GONG[dayStem]],
  };
}

function deriveNormalRow(initial: Branch, heavenPlate: Record<Branch, Branch>, lessonType: LessonType): SanChuanRow {
  return {
    initial,
    middle: heavenPlate[initial],
    final: heavenPlate[heavenPlate[initial]],
    lessonType,
  } satisfies SanChuanRow;
}

export function resolveSanChuanRow(dayGanzhi: Ganzhi, firstUpper: Branch): SanChuanResolution {
  const lookupRow = normalizeLookupRow(dayGanzhi, firstUpper);
  if (lookupRow) {
    return { row: lookupRow, source: "lookup", trace: ["三伝表の既存行を採用"] };
  }

  const [dayStem, dayBranch] = dayGanzhi.split("") as [Stem, Branch];
  const dayElement = STEM_WUXING[dayStem];
  const { heavenPlate, lessons } = buildDerivedLessons(dayStem, dayBranch, firstUpper);
  const trace = ["三伝表欠落行のため四課から導出"];
  const directKe = resolveDirectKe(dayStem, lessons);
  const isFuyin = firstUpper === STEM_JI_GONG[dayStem];
  const isFanyin = firstUpper === OPPOSITE_BRANCH[STEM_JI_GONG[dayStem]];

  if (isFuyin) {
    const row = deriveFuyinRow(dayStem, dayBranch, firstUpper, directKe);
    trace.push(...(directKe?.trace ?? ["伏吟無克の定式を採用"]));
    return {
      row: { ...row, lessonType: "伏吟" },
      source: "derived",
      trace,
    };
  }

  if (isFanyin) {
    const row = directKe ? deriveFanyinRow(directKe.lesson.upper) : deriveFanyinNoKeRow(dayStem, dayBranch, heavenPlate);
    trace.push(...(directKe?.trace ?? ["返吟無克の驛馬起課を採用"]));
    return {
      row: { ...row, lessonType: "返吟" },
      source: "derived",
      trace,
    };
  }

  if (directKe) {
    trace.push(...directKe.trace);
    return {
      row: deriveNormalRow(directKe.lesson.upper, heavenPlate, directKe.lessonType),
      source: "derived",
      trace,
    };
  }

  const remoteKe = resolveRemoteKe(dayStem, dayElement, lessons);
  if (remoteKe) {
    trace.push(...remoteKe.trace);
    return {
      row: deriveNormalRow(remoteKe.lesson.upper, heavenPlate, remoteKe.lessonType),
      source: "derived",
      trace,
    };
  }

  return {
    row: null,
    source: "unresolved",
    trace: [...trace, "九宗門の残課式までは未導出"],
  };
}
