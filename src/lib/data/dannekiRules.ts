export const DANNEKI_RULES = {
  useGod: {
    label: "用神選定",
    note: "占的→世応→六親の順で用神を確定し、旺相・動変を優先して読む。",
    source: "増補卜易（用神章・断易要訣）",
  },
  dayRelations: {
    label: "日辰冲合",
    note: "日辰の冲は動き、合はまとまり、刑害破は阻害として加味する。",
    source: "増補卜易（断易要訣）",
  },
  seasonalState: {
    label: "旺相休囚死",
    note: "月建の旺相休囚死を基準に強弱を評価する。",
    source: "増補卜易（断易要訣）",
  },
  movingLines: {
    label: "動変",
    note: "動爻は論点の変化点であり、用神に絡む動爻は優先する。",
    source: "増補卜易（断易要訣）",
  },
} as const;
