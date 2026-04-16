import type { Branch, Stem, TrigramKey, Wuxing, YinYang } from "../types";

export interface NajiaCell {
  stem: Stem;
  branch: Branch;
}

export const TRIGRAM_LINES: Record<TrigramKey, [YinYang, YinYang, YinYang]> = {
  乾: ["陽", "陽", "陽"],
  兌: ["陽", "陽", "陰"],
  離: ["陽", "陰", "陽"],
  震: ["陽", "陰", "陰"],
  巽: ["陰", "陽", "陽"],
  坎: ["陰", "陽", "陰"],
  艮: ["陰", "陰", "陽"],
  坤: ["陰", "陰", "陰"],
};

export const TRIGRAM_ELEMENT: Record<TrigramKey, Wuxing> = {
  乾: "金",
  兌: "金",
  離: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土",
};

// 京房納甲法: 各純卦の内卦3爻・外卦3爻への干支配当
// 参考: 増删卜易 / 断易書籍
export const TRIGRAM_NAJIA: Record<TrigramKey, { inner: [NajiaCell, NajiaCell, NajiaCell]; outer: [NajiaCell, NajiaCell, NajiaCell] }> = {
  乾: {
    inner: [
      { stem: "甲", branch: "子" },
      { stem: "甲", branch: "寅" },
      { stem: "甲", branch: "辰" },
    ],
    outer: [
      { stem: "壬", branch: "午" },
      { stem: "壬", branch: "申" },
      { stem: "壬", branch: "戌" },
    ],
  },
  坤: {
    inner: [
      { stem: "乙", branch: "未" },
      { stem: "乙", branch: "巳" },
      { stem: "乙", branch: "卯" },
    ],
    outer: [
      { stem: "癸", branch: "丑" },
      { stem: "癸", branch: "亥" },
      { stem: "癸", branch: "酉" },
    ],
  },
  震: {
    inner: [
      { stem: "庚", branch: "子" },
      { stem: "庚", branch: "寅" },
      { stem: "庚", branch: "辰" },
    ],
    outer: [
      { stem: "庚", branch: "午" },
      { stem: "庚", branch: "申" },
      { stem: "庚", branch: "戌" },
    ],
  },
  巽: {
    inner: [
      { stem: "辛", branch: "丑" },
      { stem: "辛", branch: "亥" },
      { stem: "辛", branch: "酉" },
    ],
    outer: [
      { stem: "辛", branch: "未" },
      { stem: "辛", branch: "巳" },
      { stem: "辛", branch: "卯" },
    ],
  },
  坎: {
    inner: [
      { stem: "戊", branch: "寅" },
      { stem: "戊", branch: "辰" },
      { stem: "戊", branch: "午" },
    ],
    outer: [
      { stem: "戊", branch: "申" },
      { stem: "戊", branch: "戌" },
      { stem: "戊", branch: "子" },
    ],
  },
  離: {
    inner: [
      { stem: "己", branch: "卯" },
      { stem: "己", branch: "丑" },
      { stem: "己", branch: "亥" },
    ],
    outer: [
      { stem: "己", branch: "酉" },
      { stem: "己", branch: "未" },
      { stem: "己", branch: "巳" },
    ],
  },
  艮: {
    inner: [
      { stem: "丙", branch: "辰" },
      { stem: "丙", branch: "午" },
      { stem: "丙", branch: "申" },
    ],
    outer: [
      { stem: "丙", branch: "戌" },
      { stem: "丙", branch: "子" },
      { stem: "丙", branch: "寅" },
    ],
  },
  兌: {
    inner: [
      { stem: "丁", branch: "巳" },
      { stem: "丁", branch: "卯" },
      { stem: "丁", branch: "丑" },
    ],
    outer: [
      { stem: "丁", branch: "亥" },
      { stem: "丁", branch: "酉" },
      { stem: "丁", branch: "未" },
    ],
  },
};

export type PalaceVariant = "本宮" | "一世" | "二世" | "三世" | "四世" | "五世" | "遊魂" | "帰魂";

export const PALACE_VARIANT_ORDER: readonly PalaceVariant[] = [
  "本宮",
  "一世",
  "二世",
  "三世",
  "四世",
  "五世",
  "遊魂",
  "帰魂",
];

// variant -> (worldLine, responseLine)
export const WORLD_RESPONSE_BY_VARIANT: Record<PalaceVariant, { world: 1 | 2 | 3 | 4 | 5 | 6; response: 1 | 2 | 3 | 4 | 5 | 6 }> = {
  本宮: { world: 6, response: 3 },
  一世: { world: 1, response: 4 },
  二世: { world: 2, response: 5 },
  三世: { world: 3, response: 6 },
  四世: { world: 4, response: 1 },
  五世: { world: 5, response: 2 },
  遊魂: { world: 4, response: 1 },
  帰魂: { world: 3, response: 6 },
};

interface PalaceEntry {
  palace: TrigramKey;
  variant: PalaceVariant;
  upper: TrigramKey;
  lower: TrigramKey;
}

// 京房八宮卦序 (64卦)
// 各宮: 本宮→一世→二世→三世→四世→五世→遊魂→帰魂
const PALACE_SEQUENCES: Array<{ palace: TrigramKey; hexagrams: Array<[TrigramKey, TrigramKey]> }> = [
  {
    palace: "乾",
    hexagrams: [
      ["乾", "乾"], // 乾為天
      ["乾", "巽"], // 天風姤
      ["乾", "艮"], // 天山遯
      ["乾", "坤"], // 天地否
      ["巽", "坤"], // 風地観
      ["艮", "坤"], // 山地剥
      ["離", "坤"], // 火地晋 (遊魂)
      ["離", "乾"], // 火天大有 (帰魂)
    ],
  },
  {
    palace: "兌",
    hexagrams: [
      ["兌", "兌"], // 兌為沢
      ["兌", "坎"], // 沢水困
      ["兌", "坤"], // 沢地萃
      ["兌", "艮"], // 沢山咸
      ["坎", "艮"], // 水山蹇
      ["坤", "艮"], // 地山謙
      ["震", "艮"], // 雷山小過 (遊魂)
      ["震", "兌"], // 雷沢帰妹 (帰魂)
    ],
  },
  {
    palace: "離",
    hexagrams: [
      ["離", "離"], // 離為火
      ["離", "艮"], // 火山旅
      ["離", "巽"], // 火風鼎
      ["離", "坎"], // 火水未済
      ["艮", "坎"], // 山水蒙
      ["巽", "坎"], // 風水渙
      ["乾", "坎"], // 天水訟 (遊魂)
      ["乾", "離"], // 天火同人 (帰魂)
    ],
  },
  {
    palace: "震",
    hexagrams: [
      ["震", "震"], // 震為雷
      ["震", "坤"], // 雷地豫
      ["震", "坎"], // 雷水解
      ["震", "巽"], // 雷風恒
      ["坤", "巽"], // 地風升
      ["坎", "巽"], // 水風井
      ["兌", "巽"], // 沢風大過 (遊魂)
      ["兌", "震"], // 沢雷随 (帰魂)
    ],
  },
  {
    palace: "巽",
    hexagrams: [
      ["巽", "巽"], // 巽為風
      ["巽", "乾"], // 風天小畜
      ["巽", "離"], // 風火家人
      ["巽", "震"], // 風雷益
      ["乾", "震"], // 天雷无妄
      ["離", "震"], // 火雷噬嗑
      ["艮", "震"], // 山雷頤 (遊魂)
      ["艮", "巽"], // 山風蠱 (帰魂)
    ],
  },
  {
    palace: "坎",
    hexagrams: [
      ["坎", "坎"], // 坎為水
      ["坎", "兌"], // 水沢節
      ["坎", "震"], // 水雷屯
      ["坎", "離"], // 水火既済
      ["兌", "離"], // 沢火革
      ["震", "離"], // 雷火豊
      ["坤", "離"], // 地火明夷 (遊魂)
      ["坤", "坎"], // 地水師 (帰魂)
    ],
  },
  {
    palace: "艮",
    hexagrams: [
      ["艮", "艮"], // 艮為山
      ["艮", "離"], // 山火賁
      ["艮", "乾"], // 山天大畜
      ["艮", "兌"], // 山沢損
      ["離", "兌"], // 火沢睽
      ["乾", "兌"], // 天沢履
      ["巽", "兌"], // 風沢中孚 (遊魂)
      ["巽", "艮"], // 風山漸 (帰魂)
    ],
  },
  {
    palace: "坤",
    hexagrams: [
      ["坤", "坤"], // 坤為地
      ["坤", "震"], // 地雷復
      ["坤", "兌"], // 地沢臨
      ["坤", "乾"], // 地天泰
      ["震", "乾"], // 雷天大壮
      ["兌", "乾"], // 沢天夬
      ["坎", "乾"], // 水天需 (遊魂)
      ["坎", "坤"], // 水地比 (帰魂)
    ],
  },
];

function buildPalaceIndex(): Map<string, PalaceEntry> {
  const map = new Map<string, PalaceEntry>();
  for (const { palace, hexagrams } of PALACE_SEQUENCES) {
    hexagrams.forEach(([upper, lower], index) => {
      const variant = PALACE_VARIANT_ORDER[index];
      const key = `${upper}|${lower}`;
      if (!map.has(key)) {
        map.set(key, { palace, variant, upper, lower });
      }
    });
  }
  return map;
}

const PALACE_INDEX = buildPalaceIndex();

export function lookupPalace(upper: TrigramKey, lower: TrigramKey): PalaceEntry {
  const entry = PALACE_INDEX.get(`${upper}|${lower}`);
  if (!entry) {
    throw new Error(`Palace not found for hexagram upper=${upper} lower=${lower}`);
  }
  return entry;
}

export function getLineNajia(upper: TrigramKey, lower: TrigramKey, position: 1 | 2 | 3 | 4 | 5 | 6): NajiaCell {
  if (position <= 3) {
    return TRIGRAM_NAJIA[lower].inner[position - 1];
  }
  return TRIGRAM_NAJIA[upper].outer[position - 4];
}
