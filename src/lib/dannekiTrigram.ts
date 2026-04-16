import type { DannekiTrigram, TrigramKey, YinYang } from "./types";

export const TRIGRAM_ORDER: readonly TrigramKey[] = ["乾", "兌", "離", "震", "巽", "坎", "艮", "坤"];

export const TRIGRAMS: Record<TrigramKey, DannekiTrigram> = {
  乾: { key: "乾", symbol: "☰", image: "天", element: "金", keywords: ["主導", "剛健", "上昇"], lines: ["陽", "陽", "陽"] },
  兌: { key: "兌", symbol: "☱", image: "沢", element: "金", keywords: ["対話", "悦び", "交渉"], lines: ["陽", "陽", "陰"] },
  離: { key: "離", symbol: "☲", image: "火", element: "火", keywords: ["判断", "明断", "光"], lines: ["陽", "陰", "陽"] },
  震: { key: "震", symbol: "☳", image: "雷", element: "木", keywords: ["変化", "起動", "行動"], lines: ["陽", "陰", "陰"] },
  巽: { key: "巽", symbol: "☴", image: "風", element: "木", keywords: ["浸透", "調整", "順応"], lines: ["陰", "陽", "陽"] },
  坎: { key: "坎", symbol: "☵", image: "水", element: "水", keywords: ["流動", "危機", "深さ"], lines: ["陰", "陽", "陰"] },
  艮: { key: "艮", symbol: "☶", image: "山", element: "土", keywords: ["停止", "境界", "熟考"], lines: ["陰", "陰", "陽"] },
  坤: { key: "坤", symbol: "☷", image: "地", element: "土", keywords: ["受容", "支持", "包容"], lines: ["陰", "陰", "陰"] },
};

export function findTrigramByLines(lines: readonly YinYang[]) {
  const match = TRIGRAM_ORDER.find((key) => TRIGRAMS[key].lines.join("") === lines.join(""));
  if (!match) {
    throw new Error(`Unknown trigram line pattern: ${lines.join(",")}`);
  }

  return TRIGRAMS[match];
}
