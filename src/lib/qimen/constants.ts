import type {
  Branch,
  Ganzhi,
  QimenDirection,
  QimenDoor,
  QimenGod,
  QimenPalaceName,
  QimenStar,
  SourceReference,
  Stem,
  Wuxing,
  YinYang,
} from "../types";

export const QIMEN_SUPPORTED_YEAR_RANGE = { start: 2015, end: 2030 } as const;

export const QIMEN_PALACES = [
  { palace: "坎", number: 1, direction: "北", element: "水", branches: ["子"], row: 3, column: 2 },
  { palace: "坤", number: 2, direction: "南西", element: "土", branches: ["未", "申"], row: 1, column: 3 },
  { palace: "震", number: 3, direction: "東", element: "木", branches: ["卯"], row: 2, column: 1 },
  { palace: "巽", number: 4, direction: "南東", element: "木", branches: ["辰", "巳"], row: 1, column: 1 },
  { palace: "中", number: 5, direction: "中宮", element: "土", branches: [], row: 2, column: 2 },
  { palace: "乾", number: 6, direction: "北西", element: "金", branches: ["戌", "亥"], row: 3, column: 3 },
  { palace: "兌", number: 7, direction: "西", element: "金", branches: ["酉"], row: 2, column: 3 },
  { palace: "艮", number: 8, direction: "北東", element: "土", branches: ["丑", "寅"], row: 3, column: 1 },
  { palace: "離", number: 9, direction: "南", element: "火", branches: ["午"], row: 1, column: 2 },
] as const satisfies readonly {
  palace: QimenPalaceName;
  number: number;
  direction: QimenDirection | "中宮";
  element: Wuxing;
  branches: readonly Branch[];
  row: number;
  column: number;
}[];

export const QIMEN_FLYING_ORDER = ["坎", "坤", "震", "巽", "中", "乾", "兌", "艮", "離"] as const satisfies readonly QimenPalaceName[];
export const QIMEN_EIGHT_PALACE_ORDER = ["坎", "艮", "震", "巽", "離", "坤", "兌", "乾"] as const satisfies readonly Exclude<QimenPalaceName, "中">[];
export const QIMEN_EARTH_STEM_ORDER = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"] as const satisfies readonly Stem[];
export const QIMEN_THREE_WONDERS = ["乙", "丙", "丁"] as const satisfies readonly Stem[];

export const QIMEN_DOOR_BY_HOME_PALACE: Record<Exclude<QimenPalaceName, "中">, QimenDoor> = {
  坎: "休門",
  艮: "生門",
  震: "傷門",
  巽: "杜門",
  離: "景門",
  坤: "死門",
  兌: "驚門",
  乾: "開門",
};

export const QIMEN_STAR_BY_HOME_PALACE: Record<QimenPalaceName, QimenStar> = {
  坎: "天蓬星",
  艮: "天任星",
  震: "天冲星",
  巽: "天輔星",
  中: "天禽星",
  離: "天英星",
  坤: "天芮星",
  兌: "天柱星",
  乾: "天心星",
};

export const QIMEN_GOD_ORDER = ["直符", "騰蛇", "太陰", "六合", "勾陳", "朱雀", "九地", "九天"] as const satisfies readonly QimenGod[];

export const QIMEN_STEM_NUMBERS: Record<Stem, number> = {
  甲: 1,
  乙: 2,
  丙: 3,
  丁: 4,
  戊: 5,
  己: 6,
  庚: 7,
  辛: 8,
  壬: 9,
  癸: 10,
};

export const QIMEN_XUN_LEADER_BY_XUN_INDEX = ["戊", "己", "庚", "辛", "壬", "癸"] as const satisfies readonly Stem[];

export const QIMEN_BOARD_LABELS = {
  year: "年盤",
  month: "月盤",
  day: "日盤",
  time: "時盤",
} as const;

export const QIMEN_DAY_JU_FIXTURES: Record<string, { ganzhi: Ganzhi; yinYang: YinYang; juNumber: number; source: string }> = {
  "2015-08-02": { ganzhi: "庚戌", yinYang: "陰", juNumber: 8, source: "IMG_0150.JPG" },
  "2015-09-05": { ganzhi: "甲申", yinYang: "陰", juNumber: 1, source: "IMG_0149.JPG" },
};

export const QIMEN_TIME_JU_FIXTURES: Record<string, { ganzhi: Ganzhi; yinYang: YinYang; juNumber: number; source: string }> = {
  "2015-08-02:申": { ganzhi: "甲申", yinYang: "陰", juNumber: 2, source: "IMG_0150.JPG" },
};

export const QIMEN_TIME_JU_BY_SOLAR_TERM: Record<string, { yinYang: YinYang; juNumbers: readonly [number, number, number] }> = {
  冬至: { yinYang: "陽", juNumbers: [1, 7, 4] },
  小寒: { yinYang: "陽", juNumbers: [2, 8, 5] },
  大寒: { yinYang: "陽", juNumbers: [3, 9, 6] },
  立春: { yinYang: "陽", juNumbers: [8, 5, 2] },
  雨水: { yinYang: "陽", juNumbers: [9, 6, 3] },
  啓蟄: { yinYang: "陽", juNumbers: [1, 7, 4] },
  惊蛰: { yinYang: "陽", juNumbers: [1, 7, 4] },
  春分: { yinYang: "陽", juNumbers: [3, 9, 6] },
  清明: { yinYang: "陽", juNumbers: [4, 1, 7] },
  穀雨: { yinYang: "陽", juNumbers: [5, 2, 8] },
  谷雨: { yinYang: "陽", juNumbers: [5, 2, 8] },
  立夏: { yinYang: "陽", juNumbers: [4, 1, 7] },
  小満: { yinYang: "陽", juNumbers: [5, 2, 8] },
  小满: { yinYang: "陽", juNumbers: [5, 2, 8] },
  芒種: { yinYang: "陽", juNumbers: [6, 3, 9] },
  芒种: { yinYang: "陽", juNumbers: [6, 3, 9] },
  夏至: { yinYang: "陰", juNumbers: [9, 3, 6] },
  小暑: { yinYang: "陰", juNumbers: [8, 2, 5] },
  大暑: { yinYang: "陰", juNumbers: [7, 1, 4] },
  立秋: { yinYang: "陰", juNumbers: [2, 5, 8] },
  処暑: { yinYang: "陰", juNumbers: [1, 4, 7] },
  处暑: { yinYang: "陰", juNumbers: [1, 4, 7] },
  白露: { yinYang: "陰", juNumbers: [9, 3, 6] },
  秋分: { yinYang: "陰", juNumbers: [7, 1, 4] },
  寒露: { yinYang: "陰", juNumbers: [6, 9, 3] },
  霜降: { yinYang: "陰", juNumbers: [5, 8, 2] },
  立冬: { yinYang: "陰", juNumbers: [6, 9, 3] },
  小雪: { yinYang: "陰", juNumbers: [5, 8, 2] },
  大雪: { yinYang: "陰", juNumbers: [4, 7, 1] },
};

export const QIMEN_SOURCE_REFERENCES: readonly SourceReference[] = [
  {
    id: "qimen:source:four-boards",
    label: "奇門遁甲作盤の基本",
    detail: "年盤・月盤・日盤・時盤と活盤式の採用",
    imageId: "IMG_0147.JPG",
    chapter: "第2部 初級編 第2章",
  },
  {
    id: "qimen:source:ju-and-pillars",
    label: "干支と局数",
    detail: "2015-2030の年盤/月盤/日盤表、時干支と時盤局数の求め方",
    imageId: "IMG_0148.JPG-IMG_0151.JPG",
    chapter: "第2部 初級編 第2章",
  },
  {
    id: "qimen:source:earth-heaven",
    label: "地盤干・天盤干",
    detail: "局数位置に戊を置き、陰局は逆行・陽局は順行で三奇六儀を配布",
    imageId: "IMG_0152.JPG-IMG_0155.JPG",
    chapter: "第2部 初級編 第2章",
  },
  {
    id: "qimen:source:door-star-god",
    label: "八門・九星・八神",
    detail: "直使・直符を定め、時干の宮へ移して配布",
    imageId: "IMG_0156.JPG-IMG_0159.JPG",
    chapter: "第2部 初級編 第2章",
  },
  {
    id: "qimen:source:direction-score",
    label: "方位吉凶判断",
    detail: "八門、九星、八神、三奇六儀、十干剋応の配点方針",
    imageId: "IMG_0162.JPG-IMG_0165.JPG",
    chapter: "第2部 初級編 第3章",
  },
];
