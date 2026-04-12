import type { Branch, GeneralOrder, NobleChoice, Stem, Wuxing } from "../types";

export const KINGOKETSU_MONTH_GENERAL_BY_MONTH_BRANCH: Record<Branch, Branch> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  卯: "戌",
  辰: "酉",
  巳: "申",
  午: "未",
  未: "午",
  申: "巳",
  酉: "辰",
  戌: "卯",
  亥: "寅",
};

export const KINGOKETSU_MONTH_GENERAL_TITLES: Record<Branch, string> = {
  子: "神后",
  丑: "大吉",
  寅: "功曹",
  卯: "太冲",
  辰: "天罡",
  巳: "太乙",
  午: "勝光",
  未: "小吉",
  申: "伝送",
  酉: "従魁",
  戌: "河魁",
  亥: "登明",
};

export const KINGOKETSU_NOBLE_SPIRIT_ORDER = ["丑", "巳", "午", "卯", "辰", "寅", "戌", "申", "未", "子", "酉", "亥"] as const satisfies readonly Branch[];

export const KINGOKETSU_NOBLE_SPIRIT_TITLES = ["貴人", "螣蛇", "朱雀", "六合", "勾陳", "青龍", "天空", "白虎", "太常", "玄武", "太陰", "天后"] as const;

export const KINGOKETSU_NOBLE_RULES: Record<Stem, Record<NobleChoice, { startBranch: Branch; direction: GeneralOrder }>> = {
  甲: {
    陽貴: { startBranch: "丑", direction: "順" },
    陰貴: { startBranch: "未", direction: "逆" },
  },
  乙: {
    陽貴: { startBranch: "子", direction: "順" },
    陰貴: { startBranch: "申", direction: "逆" },
  },
  丙: {
    陽貴: { startBranch: "亥", direction: "順" },
    陰貴: { startBranch: "酉", direction: "逆" },
  },
  丁: {
    陽貴: { startBranch: "亥", direction: "順" },
    陰貴: { startBranch: "酉", direction: "逆" },
  },
  戊: {
    陽貴: { startBranch: "丑", direction: "順" },
    陰貴: { startBranch: "未", direction: "逆" },
  },
  己: {
    陽貴: { startBranch: "子", direction: "順" },
    陰貴: { startBranch: "申", direction: "逆" },
  },
  庚: {
    陽貴: { startBranch: "丑", direction: "順" },
    陰貴: { startBranch: "未", direction: "逆" },
  },
  辛: {
    陽貴: { startBranch: "午", direction: "逆" },
    陰貴: { startBranch: "寅", direction: "順" },
  },
  壬: {
    陽貴: { startBranch: "巳", direction: "逆" },
    陰貴: { startBranch: "卯", direction: "順" },
  },
  癸: {
    陽貴: { startBranch: "巳", direction: "逆" },
    陰貴: { startBranch: "卯", direction: "順" },
  },
};

export const WUZI_DUN_START_STEM_BY_DAY_STEM: Record<Stem, Stem> = {
  甲: "甲",
  己: "甲",
  乙: "丙",
  庚: "丙",
  丙: "戊",
  辛: "戊",
  丁: "庚",
  壬: "庚",
  戊: "壬",
  癸: "壬",
};

export const SIMPLE_STEM_TO_BRANCH: Record<Stem, Branch> = {
  甲: "寅",
  乙: "卯",
  丙: "午",
  丁: "巳",
  戊: "辰",
  己: "丑",
  庚: "申",
  辛: "酉",
  壬: "子",
  癸: "亥",
};

export const FOUR_MAJOR_VOID_BY_XUN_LEADER: Record<string, Wuxing | "なし"> = {
  甲子: "水",
  甲戌: "なし",
  甲申: "金",
  甲午: "水",
  甲辰: "なし",
  甲寅: "金",
};

export const KINGOKETSU_SOURCE_INDEX = {
  chapterSummary: "img_0003",
  pillars: "img_0008",
  difenAndMonthGeneral: "img_0010",
  nobleAndWuzi: "img_0011",
  stemConversion: "img_0012",
  useYaoAndInnerStates: "img_0013",
  pillarSupportAndVoid: "img_0014",
  relations: "img_0015",
} as const;

export const KINGOKETSU_FIXTURES = [
  {
    name: "book-example-tokyo-sunny-2016-05-03",
    input: {
      year: 2016,
      month: 5,
      day: 3,
      hour: 11,
      minute: 40,
      locationId: "tokyo23",
      difen: "丑" as Branch,
      topic: "総合",
      questionText: "",
      nobleChoice: "陽貴" as NobleChoice,
      dstMinutes: 0 as const,
    },
    expected: {
      correctedDateTime: "2016-05-03 12:02",
      yearPillar: "丙申",
      monthPillar: "壬辰",
      dayPillar: "乙酉",
      hourPillar: "壬午",
      monthGeneral: "酉",
      nobleStartBranch: "子",
      nobleDirection: "順" as GeneralOrder,
      guishenBranch: "巳",
      jiangshenBranch: "辰",
      renyuanStem: "丁" as Stem,
      shenGan: "辛" as Stem,
      jiangGan: "庚" as Stem,
      useYao: "将神",
    },
  },
] as const;
