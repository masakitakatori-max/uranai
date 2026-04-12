import { buildConsultationParagraphs, inferTopicFromQuestion, summarizeQuestion } from "./consultation";
import { LOCATION_OFFSETS } from "./data/core";
import type {
  DannekiBasis,
  DannekiChart,
  DannekiInput,
  DannekiLine,
  DannekiTopic,
  DannekiTrigram,
  DannekiUseDeity,
  NarrativeSection,
  SixKin,
  TrigramKey,
  Wuxing,
  YinYang,
} from "./types";

const TRIGRAM_ORDER: readonly TrigramKey[] = ["乾", "兌", "離", "震", "巽", "坎", "艮", "坤"];
const LINE_LABELS = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"] as const;

const TRIGRAMS: Record<TrigramKey, DannekiTrigram> = {
  乾: { key: "乾", symbol: "☰", image: "天", element: "金", keywords: ["主導", "剛健", "上昇"], lines: ["陽", "陽", "陽"] },
  兌: { key: "兌", symbol: "☱", image: "沢", element: "金", keywords: ["対話", "悦び", "開放"], lines: ["陽", "陽", "陰"] },
  離: { key: "離", symbol: "☲", image: "火", element: "火", keywords: ["可視化", "判断", "熱"], lines: ["陽", "陰", "陽"] },
  震: { key: "震", symbol: "☳", image: "雷", element: "木", keywords: ["始動", "刺激", "急変"], lines: ["陽", "陰", "陰"] },
  巽: { key: "巽", symbol: "☴", image: "風", element: "木", keywords: ["浸透", "調整", "交渉"], lines: ["陰", "陽", "陽"] },
  坎: { key: "坎", symbol: "☵", image: "水", element: "水", keywords: ["不安", "深掘り", "往復"], lines: ["陰", "陽", "陰"] },
  艮: { key: "艮", symbol: "☶", image: "山", element: "土", keywords: ["停止", "境界", "蓄積"], lines: ["陰", "陰", "陽"] },
  坤: { key: "坤", symbol: "☷", image: "地", element: "土", keywords: ["受容", "土台", "継続"], lines: ["陰", "陰", "陰"] },
};

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

const USE_DEITY_BY_TOPIC: Record<DannekiTopic, DannekiUseDeity> = {
  総合: "世応",
  仕事: "官鬼",
  金運: "妻財",
  恋愛: "世応",
  結婚: "世応",
  健康: "官鬼",
  失せ物: "父母",
  天気: "子孫",
};

const TOPIC_ACTION_TEXT: Record<DannekiTopic, string> = {
  総合: "全体の流れを見る課として、足元の整備と外圧への応答を分けて考えるのが先です。",
  仕事: "仕事では決裁者・責任・納期を分けて整理すると、卦の示すボトルネックが見えやすくなります。",
  金運: "金運では入ってくる話より、抜けていく穴を塞げるかが先決です。",
  恋愛: "恋愛では感情の強さより、相手が具体的に動く余地を確かめるのが重要です。",
  結婚: "結婚では関係の熱量より、生活設計をどこまで現実化できるかを重視します。",
  健康: "健康では気合いで押すより、悪化条件を一つずつ外す読み方が向いています。",
  失せ物: "失せ物では動線を戻る順番と、人手を借りる場面の切り分けが有効です。",
  天気: "天気では一点読みより、崩れる時間帯と持ち直す時間帯を分けて扱います。",
};

function getLocationOffset(locationId: string) {
  return LOCATION_OFFSETS.find((location) => location.id === locationId) ?? LOCATION_OFFSETS.find((location) => location.id === "akashi")!;
}

function toWallClockDate(input: Pick<DannekiInput, "year" | "month" | "day" | "hour" | "minute">) {
  return new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute));
}

function addMinutes(date: Date, offsetMinutes: number) {
  return new Date(date.getTime() + offsetMinutes * 60_000);
}

function getUtcParts(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function formatUtcDateTime(date: Date) {
  const parts = getUtcParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildSeed(input: DannekiInput, correctedDate: Date, resolvedTopic: DannekiTopic, offsetMinutes: number) {
  const parts = getUtcParts(correctedDate);
  const timeSeed = Number(`${parts.year}${String(parts.month).padStart(2, "0")}${String(parts.day).padStart(2, "0")}${String(parts.hour).padStart(2, "0")}${String(parts.minute).padStart(2, "0")}`);
  return hashString(`${resolvedTopic}|${input.questionText}|${timeSeed}|${offsetMinutes}`) >>> 0;
}

function pickTrigram(index: number) {
  return TRIGRAMS[TRIGRAM_ORDER[index % TRIGRAM_ORDER.length]];
}

function findTrigramByLines(lines: readonly YinYang[]) {
  return TRIGRAMS[TRIGRAM_ORDER.find((key) => TRIGRAMS[key].lines.join("") === lines.join("")) ?? "乾"];
}

function flipLine(value: YinYang): YinYang {
  return value === "陽" ? "陰" : "陽";
}

function buildMovingLines(seed: number, questionLength: number) {
  const count = questionLength > 40 ? 3 : questionLength > 0 ? 2 : 1;
  const result = new Set<number>();
  let cursor = seed || 1;

  while (result.size < count) {
    cursor = (Math.imul(cursor, 1103515245) + 12345) >>> 0;
    result.add((cursor % 6) + 1);
  }

  return [...result].sort((left, right) => left - right);
}

function resolveSixKin(reference: Wuxing, target: Wuxing): SixKin {
  if (reference === target) return "兄弟";
  if (GENERATES[reference] === target) return "子孫";
  if (OVERCOMES[reference] === target) return "妻財";
  if (OVERCOMES[target] === reference) return "官鬼";
  return "父母";
}

function describeElementRelation(outer: Wuxing, inner: Wuxing) {
  if (outer === inner) return "内外の五行は同気で、流れを揃えやすい配置です。";
  if (GENERATES[inner] === outer) return "内卦が外卦を生じるため、内側の努力が外へ効きやすい配置です。";
  if (GENERATES[outer] === inner) return "外卦が内卦を生じるため、外部条件から押し上げが入りやすい配置です。";
  if (OVERCOMES[inner] === outer) return "内卦が外卦を剋するため、こちらの打ち手で局面を動かしやすい反面、押し過ぎると摩耗します。";
  return "外卦が内卦を剋するため、相手条件や環境圧を先に整えないと自力が削られやすい配置です。";
}

function lineLabel(position: number) {
  return LINE_LABELS[position - 1] ?? `${position}爻`;
}

function buildLineNote(position: number, relation: SixKin, isMoving: boolean) {
  const lead = `${lineLabel(position)}は${relation}`;
  if (isMoving) return `${lead}として動き、論点が表面化しやすい箇所です。`;
  if (position <= 2) return `${lead}として足元と初動に現れます。`;
  if (position <= 4) return `${lead}として判断と交渉の中核に現れます。`;
  return `${lead}として外部条件と結論側に現れます。`;
}

function formatLineSet(values: number[]) {
  return values.map((value) => lineLabel(value)).join(" / ");
}

function buildExplanationSections(
  input: DannekiInput,
  resolvedTopic: DannekiTopic,
  basis: DannekiBasis,
  lines: readonly DannekiLine[],
): NarrativeSection[] {
  const focusLines =
    basis.useDeity === "世応"
      ? lines.filter((line) => line.position === 3 || line.position === 6)
      : lines.filter((line) => line.relation === basis.useDeity);

  return [
    {
      key: "danneki-foundation",
      title: "立卦の前提",
      paragraphs: [
        `入力日時を ${basis.locationLabel} の地方時差 ${basis.offsetMinutes >= 0 ? "+" : ""}${basis.offsetMinutes}分で補正し、基準時刻 ${basis.correctedDateTime} を採っています。`,
        input.questionText.trim()
          ? `相談文は「${summarizeQuestion(input.questionText)}」です。自由入力からは「${resolvedTopic}」の問いとして読むのが最も自然でした。`
          : `相談文が空欄のため、選択された占的「${resolvedTopic}」をそのまま読み筋の中心に置いています。`,
      ],
    },
    {
      key: "danneki-structure",
      title: "卦象の骨格",
      paragraphs: [
        `本卦は 上卦 ${basis.upperTrigram.key}${basis.upperTrigram.symbol} / 下卦 ${basis.lowerTrigram.key}${basis.lowerTrigram.symbol}。${basis.upperTrigram.image} は ${basis.upperTrigram.keywords.join("・")}、${basis.lowerTrigram.image} は ${basis.lowerTrigram.keywords.join("・")} を示します。`,
        `之卦は 上卦 ${basis.changedUpperTrigram.key}${basis.changedUpperTrigram.symbol} / 下卦 ${basis.changedLowerTrigram.key}${basis.changedLowerTrigram.symbol}。動いたのは ${formatLineSet(basis.movingLines)} です。`,
        describeElementRelation(basis.upperTrigram.element, basis.lowerTrigram.element),
      ],
    },
    {
      key: "danneki-use-deity",
      title: "用神候補",
      paragraphs: [
        basis.useDeity === "世応"
          ? "この相談は関係性の読みを優先し、三爻を相談者の足場、上爻を相手・外部条件の受け皿として扱います。"
          : `今回の用神候補は ${basis.useDeity} です。該当するのは ${focusLines.length ? focusLines.map((line) => `${lineLabel(line.position)}(${line.note})`).join(" / ") : "明瞭な一点に偏らず、複数線へ分散しています。"}。`,
      ],
    },
  ];
}

function buildInterpretationSections(
  input: DannekiInput,
  resolvedTopic: DannekiTopic,
  basis: DannekiBasis,
  lines: readonly DannekiLine[],
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];
  const consultationParagraphs = buildConsultationParagraphs(input.questionText, resolvedTopic);
  const movingCore = lines.filter((line) => line.isMoving);
  const focusLines =
    basis.useDeity === "世応"
      ? lines.filter((line) => line.position === 3 || line.position === 6)
      : lines.filter((line) => line.relation === basis.useDeity);

  if (consultationParagraphs.length) {
    sections.push({
      key: "danneki-consultation",
      title: "相談文への寄せ方",
      paragraphs: consultationParagraphs,
    });
  }

  sections.push({
    key: "danneki-topic",
    title: `${resolvedTopic}の見立て`,
    paragraphs: [
      `${TOPIC_ACTION_TEXT[resolvedTopic]} 本卦の下卦 ${basis.lowerTrigram.key} は「${basis.lowerTrigram.keywords.join("・")}」、上卦 ${basis.upperTrigram.key} は「${basis.upperTrigram.keywords.join("・")}」を帯びています。`,
      focusLines.length
        ? `${basis.useDeity === "世応" ? "関係線" : `用神 ${basis.useDeity}`} は ${focusLines.map((line) => `${lineLabel(line.position)}(${line.relation})`).join(" / ")} に現れています。足元よりも上段に寄るほど、相手都合や外部条件の比率が高い読みです。`
        : "用神が一か所に固まらないため、答えは一発で決めるより段階的に詰めるほうが外しにくい盤です。",
    ],
  });

  sections.push({
    key: "danneki-moving",
    title: "動爻の示唆",
    paragraphs: [
      movingCore.length
        ? `動いたのは ${movingCore.map((line) => `${lineLabel(line.position)}(${line.relation})`).join(" / ")} です。ここが現状維持では済まない変化点で、話が動くならこの層からです。`
        : "動爻が弱いため、局面は急変よりもじわじわ動く読みです。",
      `之卦の ${basis.changedLowerTrigram.key}/${basis.changedUpperTrigram.key} への遷移は、「${basis.changedLowerTrigram.keywords[0]}」から「${basis.changedUpperTrigram.keywords[0]}」へ重心が移ることを示します。`,
    ],
  });

  sections.push({
    key: "danneki-closing",
    title: "行動の要点",
    paragraphs: [
      basis.useDeity === "世応"
        ? "関係が主題の課なので、相手を読みにいく前に、自分が何を確認したいのかを一文で固定すると判断がぶれにくくなります。"
        : `まず ${basis.useDeity} に当たる線の強弱を確認し、その線を補う行動を先に置くと盤の示唆と噛み合いやすくなります。`,
      movingCore.some((line) => line.position >= 4)
        ? "上段の動きが強いので、結論を急ぐより相手側の反応待ちや外部条件の更新を挟むほうが得策です。"
        : "下段の動きが中心なので、まずは自分の準備・連絡・足元の整備から手を付けるのが筋です。",
    ],
  });

  return sections;
}

export function buildDannekiChart(input: DannekiInput): DannekiChart {
  const location = getLocationOffset(input.locationId);
  const correctedDate = addMinutes(toWallClockDate(input), location.offsetMinutes);
  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);
  const seed = buildSeed(input, correctedDate, resolvedTopic, location.offsetMinutes);
  const upperTrigram = pickTrigram(seed % 8);
  const lowerTrigram = pickTrigram(Math.floor(seed / 8) % 8);
  const movingLines = buildMovingLines(seed, input.questionText.trim().length);
  const useDeity = USE_DEITY_BY_TOPIC[resolvedTopic];
  const originalLines = [...lowerTrigram.lines, ...upperTrigram.lines] as YinYang[];
  const changedLines = originalLines.map((line, index) => (movingLines.includes(index + 1) ? flipLine(line) : line));
  const changedLowerTrigram = findTrigramByLines(changedLines.slice(0, 3) as YinYang[]);
  const changedUpperTrigram = findTrigramByLines(changedLines.slice(3) as YinYang[]);

  const lines: DannekiLine[] = originalLines.map((line, index) => {
    const position = (index + 1) as DannekiLine["position"];
    const relation = resolveSixKin(lowerTrigram.element, index < 3 ? lowerTrigram.element : upperTrigram.element);
    const isMoving = movingLines.includes(position);
    return {
      position,
      original: line,
      changed: changedLines[index],
      isMoving,
      relation,
      note: buildLineNote(position, relation, isMoving),
    };
  });

  const basis: DannekiBasis = {
    correctedDateTime: formatUtcDateTime(correctedDate),
    locationLabel: location.label,
    offsetMinutes: location.offsetMinutes,
    upperTrigram,
    lowerTrigram,
    changedUpperTrigram,
    changedLowerTrigram,
    movingLines,
    derivedSeed: seed,
    useDeity,
  };

  const explanationSections = buildExplanationSections(input, resolvedTopic, basis, lines);
  const interpretationSections = buildInterpretationSections(input, resolvedTopic, basis, lines);

  return {
    topic: resolvedTopic,
    resolvedTopic,
    questionText: input.questionText,
    basis,
    lines,
    explanationSections,
    interpretationSections,
    messages: [
      "断易モードは試作版です。相談文と日時から本卦・之卦・動爻を組み立て、論点整理用の機械解釈を返します。",
      basis.useDeity === "世応" ? "恋愛・結婚・総合では世応読みを優先し、三爻と上爻を関係線として扱っています。" : `今回の用神候補は ${basis.useDeity} です。`,
    ],
  };
}
