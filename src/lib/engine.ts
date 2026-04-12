import { Solar } from "lunar-typescript";

import { buildConsultationParagraphs, inferTopicFromQuestion } from "./consultation";
import {
  BRANCHES,
  EARTH_RING_SEQUENCE,
  GANZHI_CYCLE,
  JU_NUMBER_BY_EARTH_BRANCH,
  LOCATION_OFFSETS,
  MONTH_BRANCH_BY_QI_MONTH,
  MONTH_GENERAL_BY_QI_MONTH,
  PLATE_GRID_POSITIONS,
  REFERENCE_DATE,
  REFERENCE_DAY_GANZHI,
  STEM_JI_GONG,
  VOID_BRANCHES_BY_XUN,
  YEAR_RANGE,
} from "./data/core";
import { BRANCH_WUXING, DAY_NIGHT_NOBLE_BRANCH, GENERAL_ORDER_NAMES, STEM_WUXING, getBranchRelations, getGeneralOrderFromNobleEarth, getSeasonalState, getSixKin } from "./data/rules";
import { SAN_CHUAN_LOOKUP } from "./data/sanChuanLookup";
import type {
  Branch,
  ChartBasis,
  FourLesson,
  Ganzhi,
  HeavenlyGeneral,
  HelperAnnotation,
  LessonType,
  LiurenChart,
  LiurenInput,
  LiurenTopic,
  NarrativeSection,
  NobleMode,
  PlateCell,
  SeasonalState,
  SixKin,
  Stem,
  ThreeTransmission,
  Wuxing,
} from "./types";

const REFERENCE_CYCLE_INDEX = GANZHI_CYCLE.indexOf(REFERENCE_DAY_GANZHI);

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function getLocationOffset(locationId: string) {
  return LOCATION_OFFSETS.find((location) => location.id === locationId) ?? LOCATION_OFFSETS.find((location) => location.id === "akashi")!;
}

function toWallClockDate(input: Pick<LiurenInput, "year" | "month" | "day" | "hour" | "minute">) {
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

function getDayGanzhi(date: Date): Ganzhi {
  const parts = getUtcParts(date);
  const currentUtcNoon = Date.UTC(parts.year, parts.month - 1, parts.day, 12);
  const referenceUtcNoon = Date.UTC(REFERENCE_DATE.year, REFERENCE_DATE.month - 1, REFERENCE_DATE.day, 12);
  const diffDays = Math.round((currentUtcNoon - referenceUtcNoon) / 86_400_000);
  return GANZHI_CYCLE[mod(REFERENCE_CYCLE_INDEX + diffDays, GANZHI_CYCLE.length)];
}

function getVoidBranches(dayGanzhi: Ganzhi): [Branch, Branch] {
  const cycleIndex = GANZHI_CYCLE.indexOf(dayGanzhi);
  return [...VOID_BRANCHES_BY_XUN[Math.floor(cycleIndex / 10)]] as [Branch, Branch];
}

function getHourBranch(hour: number): Branch {
  if (hour === 23 || hour === 0) return "子";
  if (hour <= 2) return "丑";
  if (hour <= 4) return "寅";
  if (hour <= 6) return "卯";
  if (hour <= 8) return "辰";
  if (hour <= 10) return "巳";
  if (hour <= 12) return "午";
  if (hour <= 14) return "未";
  if (hour <= 16) return "申";
  if (hour <= 18) return "酉";
  if (hour <= 20) return "戌";
  return "亥";
}

function getQiMonthData(date: Date) {
  const parts = getUtcParts(date);
  if (parts.year < YEAR_RANGE.start || parts.year > YEAR_RANGE.end) {
    throw new Error(`年対応は ${YEAR_RANGE.start}〜${YEAR_RANGE.end} です。`);
  }
  const solar = Solar.fromYmdHms(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0);
  const prevQi = solar.getLunar().getPrevQi(false);
  const qiMonth = prevQi.getSolar().getMonth();
  return {
    qiMonth,
    monthGeneral: MONTH_GENERAL_BY_QI_MONTH[qiMonth],
    monthBranch: MONTH_BRANCH_BY_QI_MONTH[qiMonth],
  };
}

function buildHeavenPlate(monthGeneral: Branch, hourBranch: Branch) {
  const hourPosition = EARTH_RING_SEQUENCE.indexOf(hourBranch);
  const monthGeneralIndex = BRANCHES.indexOf(monthGeneral);
  const heavenPlate = {} as Record<Branch, Branch>;

  EARTH_RING_SEQUENCE.forEach((earthBranch, index) => {
    const steps = mod(index - hourPosition, BRANCHES.length);
    heavenPlate[earthBranch] = BRANCHES[mod(monthGeneralIndex + steps, BRANCHES.length)];
  });

  return heavenPlate;
}

function invertPlate(plate: Record<Branch, Branch>) {
  const result = {} as Record<Branch, Branch>;
  EARTH_RING_SEQUENCE.forEach((earthBranch) => {
    result[plate[earthBranch]] = earthBranch;
  });
  return result;
}

function buildGeneralMap(heavenPlate: Record<Branch, Branch>, nobleBranch: Branch) {
  const heavenToEarth = invertPlate(heavenPlate);
  const nobleEarth = heavenToEarth[nobleBranch];
  const order = getGeneralOrderFromNobleEarth(nobleEarth);
  const startIndex = EARTH_RING_SEQUENCE.indexOf(nobleEarth);
  const generalByHeavenBranch = {} as Record<Branch, HeavenlyGeneral>;

  GENERAL_ORDER_NAMES.forEach((general, index) => {
    const earthIndex = order === "順" ? mod(startIndex + index, EARTH_RING_SEQUENCE.length) : mod(startIndex - index, EARTH_RING_SEQUENCE.length);
    const earthBranch = EARTH_RING_SEQUENCE[earthIndex];
    generalByHeavenBranch[heavenPlate[earthBranch]] = general;
  });

  return { generalByHeavenBranch, order };
}

function getJuNumber(heavenPlate: Record<Branch, Branch>) {
  const heavenToEarth = invertPlate(heavenPlate);
  return JU_NUMBER_BY_EARTH_BRANCH[heavenToEarth["子"]];
}

function createPlateCells(heavenPlate: Record<Branch, Branch>, generalByHeavenBranch: Record<Branch, HeavenlyGeneral>, basis: Pick<ChartBasis, "hourBranch" | "monthGeneral" | "nobleBranch" | "voidBranches">): PlateCell[] {
  return EARTH_RING_SEQUENCE.map((earth) => {
    const heaven = heavenPlate[earth];
    return {
      earth,
      heaven,
      general: generalByHeavenBranch[heaven],
      isVoid: basis.voidBranches.includes(heaven),
      isHourSeat: earth === basis.hourBranch,
      isMonthGeneral: heaven === basis.monthGeneral,
      isNobleSeat: heaven === basis.nobleBranch,
    };
  });
}

function createFourLessons(dayStem: Stem, dayBranch: Branch, heavenPlate: Record<Branch, Branch>, dayElement: Wuxing, generalByHeavenBranch: Record<Branch, HeavenlyGeneral>, voidBranches: [Branch, Branch]): FourLesson[] {
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

  return sequence.map((item, index) => {
    const sixKin = getSixKin(dayElement, BRANCH_WUXING[item.upper]);
    return {
      index: (index + 1) as FourLesson["index"],
      lower: item.lower,
      upper: item.upper,
      sixKin,
      heavenlyGeneral: generalByHeavenBranch[item.upper],
      wuxingRelation: sixKin,
      isVoid: voidBranches.includes(item.upper),
    };
  });
}

function createThreeTransmissions(dayGanzhi: Ganzhi, firstUpper: Branch, dayElement: Wuxing, generalByHeavenBranch: Record<Branch, HeavenlyGeneral>, voidBranches: [Branch, Branch]) {
  const row = SAN_CHUAN_LOOKUP[dayGanzhi]?.[firstUpper];
  if (!row) {
    return { items: [] as ThreeTransmission[], lessonType: null as LiurenChart["lessonType"] };
  }

  const stages: Array<["初伝" | "中伝" | "末伝", Branch]> = [
    ["初伝", row.initial],
    ["中伝", row.middle],
    ["末伝", row.final],
  ];

  return {
    lessonType: row.lessonType,
    items: stages.map(([stage, branch]) => ({
      stage,
      branch,
      dunStem: null,
      sixKin: getSixKin(dayElement, BRANCH_WUXING[branch]),
      heavenlyGeneral: generalByHeavenBranch[branch],
      isVoid: voidBranches.includes(branch),
    })),
  };
}

function getBranchPairNotes(label: string, branch: Branch, references: Array<{ label: string; branch: Branch }>) {
  const notes = new Set<string>();
  references.forEach((reference) => {
    if (reference.label === label && reference.branch === branch) return;
    getBranchRelations(branch, reference.branch).forEach((relation) => {
      notes.add(`${relation}:${reference.label}${reference.branch}`);
    });
  });
  return [...notes];
}

function buildHelperAnnotations(fourLessons: FourLesson[], threeTransmissions: ThreeTransmission[], basis: ChartBasis, monthElement: Wuxing): HelperAnnotation[] {
  const references = [
    { label: "日支", branch: basis.dayBranch },
    { label: "月将", branch: basis.monthGeneral },
    { label: "占時", branch: basis.hourBranch },
    ...fourLessons.map((lesson) => ({ label: `第${lesson.index}課`, branch: lesson.upper })),
    ...threeTransmissions.map((item) => ({ label: item.stage, branch: item.branch })),
  ];

  const lessonAnnotations = fourLessons.map((lesson) => ({
    key: `lesson-${lesson.index}`,
    label: `第${lesson.index}課`,
    branch: lesson.upper,
    wuxing: BRANCH_WUXING[lesson.upper],
    sixKin: lesson.sixKin,
    heavenlyGeneral: lesson.heavenlyGeneral,
    seasonalState: getSeasonalState(monthElement, BRANCH_WUXING[lesson.upper]),
    isVoid: lesson.isVoid,
    relations: getBranchPairNotes(`第${lesson.index}課`, lesson.upper, references),
  }));

  const transmissionAnnotations = threeTransmissions.map((item) => ({
    key: `transmission-${item.stage}`,
    label: item.stage,
    branch: item.branch,
    wuxing: BRANCH_WUXING[item.branch],
    sixKin: item.sixKin,
    heavenlyGeneral: item.heavenlyGeneral,
    seasonalState: getSeasonalState(monthElement, BRANCH_WUXING[item.branch]),
    isVoid: item.isVoid,
    relations: getBranchPairNotes(item.stage, item.branch, references),
  }));

  return [...transmissionAnnotations, ...lessonAnnotations];
}

function describeLessonType(lessonType: LessonType | null) {
  switch (lessonType) {
    case "元首":
      return "初伝がまっすぐ立ち、物事の主題が表に出やすい課式です。";
    case "重審":
      return "同種の圧力や事情が重なり、同じ論点を繰り返し吟味しやすい課式です。";
    case "比用":
      return "似た条件の中から、より使える筋だけを選び取る課式です。";
    case "知一":
      return "選択肢を絞り、一筋に焦点を合わせる課式です。";
    case "伏吟":
      return "動きが鈍く、同じ場所で逡巡しやすい課式です。";
    case "返吟":
      return "往復や反転が生じやすく、一度決まっても戻りやすい課式です。";
    case "渉害":
      return "利害や衝突を踏み越えて進むため、摩擦を前提に見る課式です。";
    case "遥剋":
      return "遠いところから影響や牽制が飛んでくる課式です。";
    case "昴星":
      return "一点の強い焦点が全体を引っ張る課式です。";
    case "別責":
      return "責任や役割が分離し、別経路で話が動きやすい課式です。";
    case "八専":
      return "偏りが強く、一方向へ寄りやすい課式です。";
    default:
      return "三伝表が未収録のため、四課中心で読みます。";
  }
}

const SIX_KIN_CORE_TEXT: Record<SixKin, string> = {
  兄弟: "同格・競争・横並びの事情",
  子孫: "緩和・成果・発散の流れ",
  妻財: "実利・回収・現実利益",
  官鬼: "圧力・責任・障害",
  父母: "文書・根拠・保護",
};

const HEAVENLY_GENERAL_TEXT: Record<HeavenlyGeneral, string> = {
  貴人: "援助や引き上げ",
  蛇: "迷い、絡み、錯綜",
  朱雀: "言葉、告知、発言",
  六合: "縁、調停、まとまり",
  勾陳: "停滞、粘着、引き延ばし",
  青龍: "伸び、利益、前進",
  天空: "空転、欠落、名ばかり",
  白虎: "強い圧力、損傷、切断",
  太常: "安定、蓄え、常道",
  玄武: "隠れ事、夜の動き、裏面",
  太陰: "内情、静かな支え、秘匿",
  天后: "保護、受容、取りまとめ",
};

const TOPIC_SCOPE_TEXT: Record<LiurenTopic, string> = {
  総合: "総合では初伝を立ち上がり、中伝を展開、末伝を着地として読みます。",
  仕事: "仕事では初伝を着手、中伝を実務の山、末伝を納品や評価として読みます。",
  金運: "金運では初伝をお金の入口、中伝を回り方、末伝を回収として読みます。",
  恋愛: "恋愛では初伝を接触のきっかけ、中伝を距離感、末伝を成否の着地として読みます。",
  結婚: "結婚では初伝を縁談の起点、中伝を家や条件の詰め、末伝を成約可否として読みます。",
  健康: "健康では初伝を発症や負荷、中伝を経過、末伝を回復や固定化として読みます。",
  失せ物: "失せ物では初伝を移動の始まり、中伝を経由地点、末伝を落ち着き先として読みます。",
  天気: "天気では初伝を現れ始め、中伝を推移、末伝を終わり際として読みます。",
};

function describeSeasonalState(state: SeasonalState) {
  switch (state) {
    case "旺":
      return "勢いが強く、その性質が前面に出やすい状態です。";
    case "相":
      return "後押しを受けやすく、周囲に乗って伸びやすい状態です。";
    case "休":
      return "いったん休ませると整いやすい状態です。";
    case "囚":
      return "制約を受けやすく、動いても伸びにくい状態です。";
    case "死":
      return "そのまま進めるより切り替えが要る状態です。";
  }
}

function getAnnotationMap(helperAnnotations: readonly HelperAnnotation[]) {
  return new Map(helperAnnotations.map((item) => [item.label, item] as const));
}

function formatSignal(signal: HelperAnnotation | undefined) {
  if (!signal) return "未収録";
  return `${signal.label} ${signal.branch} / ${signal.heavenlyGeneral} / ${signal.sixKin} / ${signal.seasonalState}${signal.isVoid ? " / 空亡" : ""}`;
}

function describeSignal(signal: HelperAnnotation | undefined) {
  if (!signal) {
    return "該当データが欠けているため、四課ベースの補助判断に留めます。";
  }
  return `${signal.label} は ${signal.branch}、${signal.sixKin} で ${SIX_KIN_CORE_TEXT[signal.sixKin]} を示し、天将 ${signal.heavenlyGeneral} は ${
    HEAVENLY_GENERAL_TEXT[signal.heavenlyGeneral]
  } を帯びます。${describeSeasonalState(signal.seasonalState)} ${signal.isVoid ? "空亡なので見込み違い、遅延、空転を差し引いて見ます。" : "空亡していないため、盤の勢いをそのまま採りやすいです。"}`;
}

function buildLiurenExplanationSections(
  basis: ChartBasis,
  fourLessons: readonly FourLesson[],
  threeTransmissions: readonly ThreeTransmission[],
  helperAnnotations: readonly HelperAnnotation[],
  lessonType: LessonType | null,
): NarrativeSection[] {
  const annotationMap = getAnnotationMap(helperAnnotations);
  const initial = annotationMap.get("初伝");
  const middle = annotationMap.get("中伝");
  const final = annotationMap.get("末伝");
  const firstLesson = annotationMap.get("第1課");

  return [
    {
      key: "liuren-foundation",
      title: "作盤の根拠",
      paragraphs: [
        `入力日時を ${basis.locationLabel} の地方時差 ${basis.offsetMinutes >= 0 ? "+" : ""}${basis.offsetMinutes}分で補正し、基準時刻 ${basis.correctedDateTime} を採っています。日干支は ${basis.dayGanzhi}、月将は ${basis.monthGeneral}、占時は ${basis.hourBranch} です。`,
        `月支 ${basis.monthBranch} に基づく月将で天盤を敷き、${basis.nobleMode}貴人 ${basis.nobleBranch} を起点に ${basis.generalOrder}行、子の位置から ${basis.juNumber}局を定めています。${basis.appliedOverrides.length ? `手動補正: ${basis.appliedOverrides.join(" / ")}。` : ""}`,
      ],
    },
    {
      key: "liuren-structure",
      title: "四課と三伝",
      paragraphs: [
        `第1課から第4課は ${fourLessons.map((lesson) => `${lesson.lower}/${lesson.upper}`).join(" → ")}。課式は ${lessonType ?? "未詳"} で、${describeLessonType(lessonType)}`,
        threeTransmissions.length
          ? `三伝は ${formatSignal(initial)} → ${formatSignal(middle)} → ${formatSignal(final)} の順で進みます。`
          : `三伝 lookup が未収録のため、代表信号は第1課 ${formatSignal(firstLesson)} を仮の主軸として扱います。`,
      ],
    },
    {
      key: "liuren-judgment-core",
      title: "判断の芯",
      paragraphs: [
        `空亡は ${basis.voidBranches[0]}${basis.voidBranches[1]}。三伝がある場合は初伝を主導線、四課では第1課を入口として読みます。`,
        `${describeSignal(initial ?? firstLesson)} ${threeTransmissions.length ? describeSignal(final) : ""}`.trim(),
      ],
    },
  ];
}

function buildLiurenInterpretationSections(
  input: LiurenInput,
  resolvedTopic: LiurenTopic,
  basis: ChartBasis,
  helperAnnotations: readonly HelperAnnotation[],
  lessonType: LessonType | null,
): NarrativeSection[] {
  const annotationMap = getAnnotationMap(helperAnnotations);
  const driver = annotationMap.get("初伝") ?? annotationMap.get("第1課");
  const support = annotationMap.get("中伝") ?? annotationMap.get("第2課");
  const closing = annotationMap.get("末伝") ?? annotationMap.get("第4課");

  const sections: NarrativeSection[] = [
    {
      key: "liuren-machine-scope",
      title: "機械解釈の前提",
      paragraphs: [
        `以下は占的 ${resolvedTopic} に合わせた基礎の機械解釈です。${TOPIC_SCOPE_TEXT[resolvedTopic]}`,
        `${describeSignal(driver)} ${support ? `補助線は ${formatSignal(support)}。` : ""}`,
      ],
    },
  ];

  const consultationParagraphs = buildConsultationParagraphs(input.questionText, resolvedTopic);
  if (consultationParagraphs.length) {
    sections.push({
      key: "liuren-consultation",
      title: "相談文への寄せ方",
      paragraphs: consultationParagraphs,
    });
  }

  const topicTitle = `${resolvedTopic}の見立て`;
  let topicParagraphs: string[] = [];

  switch (resolvedTopic) {
    case "総合":
      topicParagraphs = [
        `${lessonType ? `${lessonType}課は、${describeLessonType(lessonType)}` : "三伝未詳のため、四課中心の読みです。"} 入口の信号は ${formatSignal(driver)}。`,
        `${closing ? `着地点は ${formatSignal(closing)}。` : ""} 盤全体としては ${driver?.isVoid ? "最初の勢いが空転しやすく、途中で条件確認が要ります。" : "最初に見えた筋を実務で形にしやすい構成です。"}`,
      ].filter(Boolean);
      break;
    case "仕事":
      topicParagraphs = [
        `仕事では ${formatSignal(driver)} を着手線として見ます。${driver?.sixKin === "官鬼" ? "責任、締切、上位判断が先に立つので、負荷管理を怠ると崩れやすいです。" : driver?.sixKin === "妻財" ? "成果や実利を取りに行きやすく、金額・成果物に話を寄せると通しやすいです。" : "人や情報の流れを整えるほど仕事が前に出やすい形です。"}`,
        `${closing ? `終盤の ${formatSignal(closing)} を見ると、${closing.isVoid ? "最後に条件変更や手戻りが入りやすいです。" : "着地条件は詰めやすいです。"}` : "三伝未詳なので、第4課の変化で着地を補います。"}`,
      ];
      break;
    case "金運":
      topicParagraphs = [
        `金運では ${formatSignal(driver)} が入口です。${driver?.sixKin === "妻財" ? "実利に直結しやすく、数字の話へ寄せるほど結果が出やすいです。" : driver?.sixKin === "官鬼" ? "支出、責任、出血が先に立ちやすいので守りを固めるほうが安全です。" : "お金そのものより、条件や人の流れを整えることが先です。"}`,
        `${closing ? `${formatSignal(closing)} を出口とみると、${closing.isVoid ? "見込み額と実回収にズレが出やすいです。" : "最後は現実額として固めやすいです。"}` : ""}`,
      ].filter(Boolean);
      break;
    case "恋愛":
      topicParagraphs = [
        `恋愛では ${formatSignal(driver)} が最初の空気感です。${driver?.heavenlyGeneral === "六合" || driver?.heavenlyGeneral === "天后" || driver?.heavenlyGeneral === "太陰" ? "縁や受容の気配があり、静かに距離を詰めるほうが合います。" : "気配はあっても、そのままでは噛み合わない要素が混じります。"}`,
        `${closing ? `${formatSignal(closing)} を着地とみると、${closing.isVoid ? "途中で熱が引いたり約束が流れたりしやすいです。" : "具体化まで持ち込みやすいです。"}` : ""}`,
      ].filter(Boolean);
      break;
    case "結婚":
      topicParagraphs = [
        `結婚では ${formatSignal(driver)} が縁談の入口です。${driver?.sixKin === "父母" ? "家、書面、紹介、条件書きの整理から入ると筋が通ります。" : driver?.sixKin === "官鬼" ? "責任や現実条件の重みが先に来るので、理想より制度と生活設計が先です。" : "感情だけでなく実務条件も並行して詰めると崩れにくいです。"}`,
        `${closing ? `${formatSignal(closing)} が末端に出るので、${closing.seasonalState === "旺" || closing.seasonalState === "相" ? "終盤は条件を固めやすいです。" : "終盤に詰め直しが入りやすいです。"}` : ""}`,
      ].filter(Boolean);
      break;
    case "健康":
      topicParagraphs = [
        `健康では ${formatSignal(driver)} を発症や負荷の入口として見ます。${driver?.sixKin === "官鬼" || driver?.heavenlyGeneral === "白虎" ? "病勢や痛みを軽く見ないほうがよく、無理を切る判断が先です。" : driver?.sixKin === "子孫" ? "回復力は残っており、休養で整いやすい側面があります。" : "急変よりも生活由来の負荷管理が焦点です。"}`,
        `${closing ? `${formatSignal(closing)} を最後の形とみると、${closing.isVoid ? "治った感覚より再確認を優先したほうが安全です。" : "適切に休めば整えやすい流れです。"}` : ""}`,
      ].filter(Boolean);
      break;
    case "失せ物":
      topicParagraphs = [
        `失せ物では ${formatSignal(driver)} が動き始めです。${driver?.heavenlyGeneral === "玄武" || driver?.heavenlyGeneral === "天空" ? "見えない所、影、袋、裏側、人の手を疑うほうが筋です。" : "目に入る範囲や動線上を先に当たるほうが筋です。"}`,
        `${closing ? `${formatSignal(closing)} を落ち着き先とみると、${closing.isVoid ? "見つけても回収に一拍遅れが出やすいです。" : "着地点は比較的絞りやすいです。"}` : ""}`,
      ].filter(Boolean);
      break;
    case "天気":
      topicParagraphs = [
        `天気では ${formatSignal(driver)} が立ち上がりです。${driver ? `${driver.wuxing} の気が前に出るので、${driver.wuxing === "水" ? "雨や湿気" : driver.wuxing === "火" ? "晴れ間や熱気" : driver.wuxing === "木" ? "風" : driver.wuxing === "金" ? "乾きや急変" : "曇りや停滞"} を主信号として見ます。` : ""}`,
        `${closing ? `${formatSignal(closing)} を終わり際とみると、${closing.isVoid ? "予報ほどはっきり出ないか、途中で外れやすいです。" : "最後まで同じ傾向を保ちやすいです。"}` : ""}`,
      ].filter(Boolean);
      break;
  }

  sections.push({
    key: "liuren-topic",
    title: topicTitle,
    paragraphs: topicParagraphs,
  });

  sections.push({
    key: "liuren-closing",
    title: "補助判断",
    paragraphs: [
      `${support ? `中継点は ${formatSignal(support)}。` : ""}${basis.voidBranches[0]}${basis.voidBranches[1]} の空亡に掛かる信号は、見込み違い・遅延・空転を割り引いて読むのが安全です。`,
      `${basis.nobleMode}貴人 ${basis.nobleBranch} と ${basis.generalOrder}行の盤なので、外部支援は ${basis.nobleMode === "昼" ? "表向き" : "裏方"}に出やすい形です。`,
    ].filter(Boolean),
  });

  return sections;
}

export function buildLiurenChart(input: LiurenInput): LiurenChart {
  const location = getLocationOffset(input.locationId);
  const correctedDate = addMinutes(toWallClockDate(input), location.offsetMinutes);
  const correctedParts = getUtcParts(correctedDate);
  const qiMonthData = getQiMonthData(correctedDate);
  const autoDayGanzhi = getDayGanzhi(correctedDate);
  const autoHourBranch = getHourBranch(correctedParts.hour);

  const appliedOverrides: string[] = [];
  const dayGanzhi = input.manualOverrides.dayGanzhi || autoDayGanzhi;
  if (input.manualOverrides.dayGanzhi) appliedOverrides.push("日干支");
  const monthGeneral = input.manualOverrides.monthGeneral || qiMonthData.monthGeneral;
  if (input.manualOverrides.monthGeneral) appliedOverrides.push("月将");
  const hourBranch = input.manualOverrides.hourBranch || autoHourBranch;
  if (input.manualOverrides.hourBranch) appliedOverrides.push("占時");

  const [dayStem, dayBranch] = dayGanzhi.split("") as [Stem, Branch];
  const voidBranches = getVoidBranches(dayGanzhi);
  const nobleMode: NobleMode = ["卯", "辰", "巳", "午", "未", "申"].includes(hourBranch) ? "昼" : "夜";
  const nobleBranch = DAY_NIGHT_NOBLE_BRANCH[dayStem][nobleMode];
  const heavenPlate = buildHeavenPlate(monthGeneral, hourBranch);
  const { generalByHeavenBranch, order } = buildGeneralMap(heavenPlate, nobleBranch);
  const juNumber = getJuNumber(heavenPlate);

  const basis: ChartBasis = {
    correctedDateTime: formatUtcDateTime(correctedDate),
    offsetMinutes: location.offsetMinutes,
    dayGanzhi,
    dayStem,
    dayBranch,
    monthGeneral,
    monthBranch: qiMonthData.monthBranch,
    hourBranch,
    voidBranches,
    nobleMode,
    nobleBranch,
    generalOrder: order,
    juNumber,
    locationLabel: location.label,
    appliedOverrides,
  };

  const dayElement = STEM_WUXING[dayStem];
  const monthElement = BRANCH_WUXING[qiMonthData.monthBranch];
  const resolvedTopic = inferTopicFromQuestion(input.questionText, input.topic);
  const fourLessons = createFourLessons(dayStem, dayBranch, heavenPlate, dayElement, generalByHeavenBranch, voidBranches);
  const sanChuan = createThreeTransmissions(dayGanzhi, fourLessons[0].upper, dayElement, generalByHeavenBranch, voidBranches);
  const helperAnnotations = buildHelperAnnotations(fourLessons, sanChuan.items, basis, monthElement);
  const explanationSections = buildLiurenExplanationSections(basis, fourLessons, sanChuan.items, helperAnnotations, sanChuan.lessonType);
  const interpretationSections = buildLiurenInterpretationSections(input, resolvedTopic, basis, helperAnnotations, sanChuan.lessonType);

  const messages: string[] = [];
  if (!sanChuan.items.length) {
    messages.push(`三伝表データが未収録です: ${dayGanzhi} / 干上神 ${fourLessons[0].upper}`);
  }
  if (dayGanzhi === "壬寅" || dayGanzhi === "癸卯") {
    messages.push("壬寅日・癸卯日は共有スクリーンショットが1ページ欠けており、三伝表の網羅性が未完です。");
  }

  return {
    topic: resolvedTopic,
    resolvedTopic,
    questionText: input.questionText,
    earthPlate: [...EARTH_RING_SEQUENCE],
    heavenPlate,
    plateCells: createPlateCells(heavenPlate, generalByHeavenBranch, basis),
    fourLessons,
    threeTransmissions: sanChuan.items,
    lessonType: sanChuan.lessonType,
    basis,
    helperAnnotations,
    explanationSections,
    interpretationSections,
    messages,
  };
}

export { GANZHI_CYCLE, LOCATION_OFFSETS, PLATE_GRID_POSITIONS };
