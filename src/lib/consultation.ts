import type { DivinationTopic } from "./types";

const TOPIC_KEYWORDS: Record<DivinationTopic, RegExp[]> = {
  総合: [/全体|総合|どうなる|見通し|流れ|方針|方向性|判断|この件|今回|悩み|相談/],
  仕事: [/仕事|転職|就職|職場|会社|上司|部下|案件|営業|商談|事業|独立|副業|契約|採用|面接|昇進|異動|キャリア/],
  金運: [/金運|お金|売上|収入|出費|投資|資金|借金|返済|利益|損失|値段|報酬|契約金|入金|資産/],
  恋愛: [/恋愛|好き|片思い|相手|彼|彼女|デート|連絡|復縁|告白|気持ち|関係|恋人|好意/],
  結婚: [/結婚|婚約|夫婦|離婚|入籍|同棲|家庭|嫁|婿|配偶者/],
  健康: [/健康|病気|体調|不調|手術|治療|検査|入院|回復|妊娠|睡眠|メンタル|ストレス|痛み/],
  失せ物: [/失せ物|紛失|なくし|見つかる|落とし物|財布|鍵|スマホ|行方|所在|どこ/],
  天気: [/天気|晴れ|雨|雪|台風|気温|気候|風|湿度|寒い|暑い|雷/],
};

const TOPIC_GUIDANCE: Record<DivinationTopic, string> = {
  総合: "複数の論点が混ざる相談として、主導権・外部条件・着地の三点を優先して読みます。",
  仕事: "役割、責任、契約条件、相手との力関係を優先して読みます。",
  金運: "入出金の流れ、支えになる要素、競合や消耗要因を優先して読みます。",
  恋愛: "相手の温度感、距離感、動くタイミングを優先して読みます。",
  結婚: "関係の固定化、家族条件、長期継続の可否を優先して読みます。",
  健康: "弱りやすい箇所、回復の条件、無理を避けるべき局面を優先して読みます。",
  失せ物: "物の動き、近場か遠方か、見つける手順を優先して読みます。",
  天気: "現象の強弱、変化の速さ、崩れやすい時間帯を優先して読みます。",
};

const CONSULTATION_CLUES: Array<{ pattern: RegExp; note: string }> = [
  { pattern: /いつ|時期|タイミング|何日|何月|何年|までに/, note: "時期が核心なので、動きが出る爻と末段の着地を重めに読みます。" },
  { pattern: /相手|競合|ライバル|先方|会社|チーム|家族/, note: "相手が絡む相談なので、自分側と相手側の力関係を分けて扱います。" },
  { pattern: /迷う|決める|判断|選ぶ|進む|やめる|続ける/, note: "意思決定の相談なので、強い要素よりも何が背中を押すかを整理して返します。" },
  { pattern: /不安|怖い|しんどい|苦しい|限界|焦る/, note: "心理負荷が強い相談として、短期の安全策を先に示す読み筋を採ります。" },
];

export function normalizeQuestion(question: string) {
  return question.replace(/\s+/g, " ").trim();
}

export function summarizeQuestion(question: string, maxLength = 88) {
  const normalized = normalizeQuestion(question);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function inferTopicFromQuestion(question: string, fallback: DivinationTopic): DivinationTopic {
  const normalized = normalizeQuestion(question);
  if (!normalized) return fallback;

  let bestTopic = fallback;
  let bestScore = 0;

  (Object.entries(TOPIC_KEYWORDS) as Array<[DivinationTopic, RegExp[]]>).forEach(([topic, patterns]) => {
    const score = patterns.reduce((sum, pattern) => sum + (pattern.test(normalized) ? 1 : 0), 0);
    if (score > bestScore) {
      bestTopic = topic;
      bestScore = score;
    }
  });

  return bestScore > 0 ? bestTopic : fallback;
}

export function buildConsultationParagraphs(question: string, topic: DivinationTopic) {
  const normalized = normalizeQuestion(question);
  if (!normalized) return [] as string[];

  const clueNotes = CONSULTATION_CLUES.filter((item) => item.pattern.test(normalized)).map((item) => item.note);

  return [
    `相談文「${summarizeQuestion(normalized)}」を起点に、解釈軸は「${topic}」へ寄せています。${TOPIC_GUIDANCE[topic]}`,
    clueNotes.length ? clueNotes.join(" ") : "相談文の焦点語を拾い、盤面の強弱を現実の判断材料へ落とし込んでいます。",
  ];
}
