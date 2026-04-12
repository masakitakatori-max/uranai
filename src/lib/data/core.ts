import type { Branch, Ganzhi, LocationOffset, Stem } from "../types";

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const satisfies readonly Stem[];
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const satisfies readonly Branch[];
export const GANZHI_CYCLE = Array.from({ length: 60 }, (_, index) => `${STEMS[index % STEMS.length]}${BRANCHES[index % BRANCHES.length]}` as Ganzhi);

export const REFERENCE_DAY_GANZHI = "癸卯" as Ganzhi;
export const REFERENCE_DATE = { year: 2006, month: 5, day: 12 };
export const YEAR_RANGE = { start: 1989, end: 2060 };

export const EARTH_RING_SEQUENCE = ["巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰"] as const satisfies readonly Branch[];

export const PLATE_GRID_POSITIONS: Record<Branch, { row: number; column: number }> = {
  巳: { row: 1, column: 1 },
  午: { row: 1, column: 2 },
  未: { row: 1, column: 3 },
  申: { row: 1, column: 4 },
  酉: { row: 2, column: 4 },
  戌: { row: 3, column: 4 },
  亥: { row: 4, column: 4 },
  子: { row: 4, column: 3 },
  丑: { row: 4, column: 2 },
  寅: { row: 4, column: 1 },
  卯: { row: 3, column: 1 },
  辰: { row: 2, column: 1 },
};

export const MONTH_GENERAL_BY_QI_MONTH: Record<number, Branch> = {
  1: "子",
  2: "亥",
  3: "戌",
  4: "酉",
  5: "申",
  6: "未",
  7: "午",
  8: "巳",
  9: "辰",
  10: "卯",
  11: "寅",
  12: "丑",
};

export const MONTH_BRANCH_BY_QI_MONTH: Record<number, Branch> = {
  1: "丑",
  2: "寅",
  3: "卯",
  4: "辰",
  5: "巳",
  6: "午",
  7: "未",
  8: "申",
  9: "酉",
  10: "戌",
  11: "亥",
  12: "子",
};

export const STEM_JI_GONG: Record<Stem, Branch> = {
  甲: "寅",
  乙: "辰",
  丙: "巳",
  丁: "未",
  戊: "巳",
  己: "未",
  庚: "申",
  辛: "戌",
  壬: "亥",
  癸: "丑",
};

export const VOID_BRANCHES_BY_XUN = [
  ["戌", "亥"],
  ["申", "酉"],
  ["午", "未"],
  ["辰", "巳"],
  ["寅", "卯"],
  ["子", "丑"],
] as const satisfies readonly [Branch, Branch][];

export const JU_NUMBER_BY_EARTH_BRANCH: Record<Branch, number> = {
  子: 1,
  丑: 2,
  寅: 3,
  卯: 4,
  辰: 5,
  巳: 6,
  午: 7,
  未: 8,
  申: 9,
  酉: 10,
  戌: 11,
  亥: 12,
};

export const LOCATION_OFFSETS: readonly LocationOffset[] = [
  { id: "kushiro", label: "釧路", offsetMinutes: 38 },
  { id: "sapporo", label: "札幌", offsetMinutes: 25 },
  { id: "hakodate", label: "函館", offsetMinutes: 23 },
  { id: "aomori", label: "青森", offsetMinutes: 23 },
  { id: "morioka", label: "盛岡", offsetMinutes: 25 },
  { id: "akita", label: "秋田", offsetMinutes: 21 },
  { id: "sendai", label: "仙台", offsetMinutes: 24 },
  { id: "yamagata", label: "山形", offsetMinutes: 21 },
  { id: "fukushima", label: "福島", offsetMinutes: 22 },
  { id: "mito", label: "水戸", offsetMinutes: 22 },
  { id: "utsunomiya", label: "宇都宮", offsetMinutes: 20 },
  { id: "maebashi", label: "前橋", offsetMinutes: 17 },
  { id: "chiba", label: "千葉", offsetMinutes: 21 },
  { id: "omiya", label: "大宮", offsetMinutes: 19 },
  { id: "tokyo23", label: "東京23区", offsetMinutes: 19 },
  { id: "hachioji", label: "八王子", offsetMinutes: 17 },
  { id: "yokohama", label: "横浜", offsetMinutes: 19 },
  { id: "niigata", label: "新潟", offsetMinutes: 16 },
  { id: "nagano", label: "長野", offsetMinutes: 13 },
  { id: "yamanashi", label: "山梨", offsetMinutes: 15 },
  { id: "shizuoka", label: "静岡", offsetMinutes: 14 },
  { id: "nagoya", label: "名古屋", offsetMinutes: 8 },
  { id: "gifu", label: "岐阜", offsetMinutes: 7 },
  { id: "toyama", label: "富山", offsetMinutes: 9 },
  { id: "kanazawa", label: "金沢", offsetMinutes: 6 },
  { id: "fukui", label: "福井", offsetMinutes: 5 },
  { id: "otsu", label: "大津", offsetMinutes: 4 },
  { id: "tsu", label: "津", offsetMinutes: 5 },
  { id: "kyoto", label: "京都", offsetMinutes: 3 },
  { id: "osaka", label: "大阪", offsetMinutes: 2 },
  { id: "nara", label: "奈良", offsetMinutes: 3 },
  { id: "wakayama", label: "和歌山", offsetMinutes: 1 },
  { id: "kobe", label: "神戸", offsetMinutes: 1 },
  { id: "akashi", label: "明石", offsetMinutes: 0 },
  { id: "tottori", label: "鳥取", offsetMinutes: -3 },
  { id: "matsue", label: "松江", offsetMinutes: -8 },
  { id: "okayama", label: "岡山", offsetMinutes: -4 },
  { id: "hiroshima", label: "広島", offsetMinutes: -10 },
  { id: "yamaguchi", label: "山口", offsetMinutes: -14 },
  { id: "takamatsu", label: "高松", offsetMinutes: -4 },
  { id: "tokushima", label: "徳島", offsetMinutes: -2 },
  { id: "kochi", label: "高知", offsetMinutes: -6 },
  { id: "matsuyama", label: "松山", offsetMinutes: -9 },
  { id: "fukuoka", label: "福岡", offsetMinutes: -19 },
  { id: "nagasaki", label: "長崎", offsetMinutes: -19 },
  { id: "saga", label: "佐賀", offsetMinutes: -19 },
  { id: "oita", label: "大分", offsetMinutes: -13 },
  { id: "miyazaki", label: "宮崎", offsetMinutes: -14 },
  { id: "kumamoto", label: "熊本", offsetMinutes: -17 },
  { id: "kagoshima", label: "鹿児島", offsetMinutes: -18 },
  { id: "naha", label: "那覇", offsetMinutes: -29 },
];
