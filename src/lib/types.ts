export type Stem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type Branch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type Ganzhi = `${Stem}${Branch}`;
export type Wuxing = "木" | "火" | "土" | "金" | "水";
export type SixKin = "兄弟" | "子孫" | "妻財" | "官鬼" | "父母";
export type AppMode = "liuren" | "kingoketsu" | "danneki";
export type YinYang = "陽" | "陰";
export type HeavenlyGeneral =
  | "貴人"
  | "蛇"
  | "朱雀"
  | "六合"
  | "勾陳"
  | "青龍"
  | "天空"
  | "白虎"
  | "太常"
  | "玄武"
  | "太陰"
  | "天后";
export type LessonType =
  | "元首"
  | "重審"
  | "比用"
  | "知一"
  | "伏吟"
  | "返吟"
  | "渉害"
  | "遥剋"
  | "昴星"
  | "別責"
  | "八専";
export type NobleMode = "昼" | "夜";
export type GeneralOrder = "順" | "逆";
export type SeasonalState = "旺" | "相" | "休" | "囚" | "死";
export type DivinationTopic = "総合" | "仕事" | "金運" | "恋愛" | "結婚" | "健康" | "失せ物" | "天気";
export type NobleChoice = "陽貴" | "陰貴";
export type LiurenTopic = DivinationTopic;
export type KingoketsuTopic = DivinationTopic;
export type KingoketsuPositionKey = "人元" | "貴神" | "将神" | "地分";

export interface ManualOverrides {
  dayGanzhi: Ganzhi | "";
  monthGeneral: Branch | "";
  hourBranch: Branch | "";
}

export interface LiurenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationId: string;
  topic: LiurenTopic;
  questionText: string;
  manualOverrides: ManualOverrides;
}

export interface ChartBasis {
  correctedDateTime: string;
  offsetMinutes: number;
  dayGanzhi: Ganzhi;
  dayStem: Stem;
  dayBranch: Branch;
  monthGeneral: Branch;
  monthBranch: Branch;
  hourBranch: Branch;
  voidBranches: [Branch, Branch];
  nobleMode: NobleMode;
  nobleBranch: Branch;
  generalOrder: GeneralOrder;
  juNumber: number;
  locationLabel: string;
  appliedOverrides: string[];
}

export interface FourLesson {
  index: 1 | 2 | 3 | 4;
  lower: Stem | Branch;
  upper: Branch;
  sixKin: SixKin;
  heavenlyGeneral: HeavenlyGeneral;
  wuxingRelation: SixKin;
  isVoid: boolean;
}

export interface ThreeTransmission {
  stage: "初伝" | "中伝" | "末伝";
  branch: Branch;
  dunStem: Stem | null;
  sixKin: SixKin;
  heavenlyGeneral: HeavenlyGeneral;
  isVoid: boolean;
}

export interface PlateCell {
  earth: Branch;
  heaven: Branch;
  general: HeavenlyGeneral;
  isVoid: boolean;
  isHourSeat: boolean;
  isMonthGeneral: boolean;
  isNobleSeat: boolean;
}

export interface HelperAnnotation {
  key: string;
  label: string;
  branch: Branch;
  wuxing: Wuxing;
  sixKin: SixKin;
  heavenlyGeneral: HeavenlyGeneral;
  seasonalState: SeasonalState;
  isVoid: boolean;
  relations: string[];
}

export interface NarrativeSection {
  key: string;
  title: string;
  paragraphs: string[];
}

export interface LiurenChart {
  topic: LiurenTopic;
  resolvedTopic: LiurenTopic;
  questionText: string;
  earthPlate: Branch[];
  heavenPlate: Record<Branch, Branch>;
  plateCells: PlateCell[];
  fourLessons: FourLesson[];
  threeTransmissions: ThreeTransmission[];
  lessonType: LessonType | null;
  basis: ChartBasis;
  helperAnnotations: HelperAnnotation[];
  explanationSections: NarrativeSection[];
  interpretationSections: NarrativeSection[];
  messages: string[];
}

export interface LocationOffset {
  id: string;
  label: string;
  offsetMinutes: number;
}

export interface SanChuanRow {
  initial: Branch;
  middle: Branch;
  final: Branch;
  lessonType: LessonType;
}

export interface KingoketsuInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationId: string;
  difen: Branch;
  topic: KingoketsuTopic;
  questionText: string;
  nobleChoice: NobleChoice;
  dstMinutes: 0 | 60;
}

export interface RuleTrace {
  step: string;
  value: string;
  source: string;
}

export interface KingoketsuPillar {
  label: "年" | "月" | "日" | "時";
  ganzhi: Ganzhi;
  stem: Stem;
  branch: Branch;
}

export interface KingoketsuPosition {
  key: KingoketsuPositionKey;
  stem: Stem | null;
  branch: Branch | null;
  displayValue: string;
  wuxing: Wuxing;
  yinYang: YinYang;
  state: SeasonalState;
  title: string;
  titleTone: "neutral" | "good" | "alert";
  convertedBranch: Branch | null;
  isUseYao: boolean;
}

export interface KingoketsuBasis {
  wallClockDateTime: string;
  correctedDateTime: string;
  locationLabel: string;
  locationOffsetMinutes: number;
  equationOfTimeMinutes: number;
  dstMinutes: number;
  totalCorrectionMinutes: number;
  yearPillar: KingoketsuPillar;
  monthPillar: KingoketsuPillar;
  dayPillar: KingoketsuPillar;
  hourPillar: KingoketsuPillar;
  voidBranches: [Branch, Branch];
  fourMajorVoid: Wuxing | "なし";
  monthGeneral: Branch;
  monthGeneralTitle: string;
  nobleStartBranch: Branch;
  nobleDirection: GeneralOrder;
  nobleChoice: NobleChoice;
  useYao: Exclude<KingoketsuPositionKey, "人元" | "地分">;
  useYaoReason: string;
}

export interface KingoketsuRelation {
  key: string;
  label: string;
  badges: string[];
}

export interface KingoketsuHelperSection {
  title: string;
  value: string;
  note?: string;
}

export type KingoketsuNarrativeSection = NarrativeSection;

export interface KingoketsuChart {
  topic: KingoketsuTopic;
  resolvedTopic: KingoketsuTopic;
  questionText: string;
  basis: KingoketsuBasis;
  positions: KingoketsuPosition[];
  relationSummary: KingoketsuRelation[];
  helperSections: KingoketsuHelperSection[];
  explanationSections: KingoketsuNarrativeSection[];
  interpretationSections: KingoketsuNarrativeSection[];
  traces: RuleTrace[];
  messages: string[];
}

export type DannekiTopic = DivinationTopic;
export type DannekiUseDeity = SixKin | "世応";
export type TrigramKey = "乾" | "兌" | "離" | "震" | "巽" | "坎" | "艮" | "坤";

export interface DannekiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationId: string;
  topic: DannekiTopic;
  questionText: string;
}

export interface DannekiTrigram {
  key: TrigramKey;
  symbol: string;
  image: string;
  element: Wuxing;
  keywords: string[];
  lines: [YinYang, YinYang, YinYang];
}

export interface DannekiLine {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  original: YinYang;
  changed: YinYang;
  isMoving: boolean;
  relation: SixKin;
  note: string;
}

export interface DannekiBasis {
  correctedDateTime: string;
  locationLabel: string;
  offsetMinutes: number;
  upperTrigram: DannekiTrigram;
  lowerTrigram: DannekiTrigram;
  changedUpperTrigram: DannekiTrigram;
  changedLowerTrigram: DannekiTrigram;
  movingLines: number[];
  derivedSeed: number;
  useDeity: DannekiUseDeity;
}

export interface DannekiChart {
  topic: DannekiTopic;
  resolvedTopic: DannekiTopic;
  questionText: string;
  basis: DannekiBasis;
  lines: DannekiLine[];
  explanationSections: NarrativeSection[];
  interpretationSections: NarrativeSection[];
  messages: string[];
}
