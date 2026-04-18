export type Stem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type Branch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type Ganzhi = `${Stem}${Branch}`;
export type Wuxing = "木" | "火" | "土" | "金" | "水";
export type SixKin = "兄弟" | "子孫" | "妻財" | "官鬼" | "父母";
export type AppMode = "liuren" | "qimen" | "kingoketsu" | "danneki" | "taiitsu";
export type YinYang = "陽" | "陰";
export type HeavenlyGeneral =
  | "貴人"
  | "騰蛇"
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
export type QimenTopic = DivinationTopic;
export type QimenDirection = "北" | "北東" | "東" | "南東" | "南" | "南西" | "西" | "北西";
export type QimenBoardKind = "year" | "month" | "day" | "time";
export type QimenPalaceName = "坎" | "坤" | "震" | "巽" | "中" | "乾" | "兌" | "艮" | "離";
export type QimenDoor = "休門" | "生門" | "傷門" | "杜門" | "景門" | "死門" | "驚門" | "開門";
export type QimenStar = "天蓬星" | "天任星" | "天冲星" | "天輔星" | "天英星" | "天芮星" | "天柱星" | "天心星" | "天禽星";
export type QimenGod = "直符" | "騰蛇" | "太陰" | "六合" | "勾陳" | "朱雀" | "九地" | "九天";
export type QimenJudgmentLabel = "大吉" | "吉" | "平" | "注意" | "凶" | "未判定";

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

export type ChartCertainty = "confirmed" | "derived" | "unresolved";

export interface SourceReference {
  id: string;
  label: string;
  detail?: string;
  imageId?: string;
  chapter?: string;
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
  traces: RuleTrace[];
  sourceReferences: SourceReference[];
  certainty: ChartCertainty;
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

export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationId: string;
  topic: QimenTopic;
  questionText: string;
  targetDirection: QimenDirection;
}

export interface RuleTrace {
  ruleId: string;
  step: string;
  value: string;
  source: string;
  sourceRef: SourceReference;
  reason: string;
  certainty: ChartCertainty;
  approximation?: string;
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
  sourceReferences: SourceReference[];
  explanationSections: KingoketsuNarrativeSection[];
  interpretationSections: KingoketsuNarrativeSection[];
  traces: RuleTrace[];
  certainty: ChartCertainty;
  messages: string[];
}

export interface QimenPillar {
  label: "年" | "月" | "日" | "時";
  ganzhi: Ganzhi;
  stem: Stem;
  branch: Branch;
}

export interface QimenBoardBasis {
  kind: QimenBoardKind;
  label: string;
  pillar: QimenPillar;
  yinYang: YinYang;
  juNumber: number;
  xunLeader: Stem;
  voidBranches: [Branch, Branch];
  directOfficer: QimenDoor | null;
  directStar: QimenStar;
  source: string;
  certainty: ChartCertainty;
}

export interface QimenPalace {
  palace: QimenPalaceName;
  palaceNumber: number;
  direction: QimenDirection | "中宮";
  element: Wuxing;
  branches: Branch[];
  earthStem: Stem;
  heavenStem: Stem;
  door: QimenDoor | null;
  star: QimenStar;
  god: QimenGod | null;
  isXunLeaderSeat: boolean;
  isHourStemSeat: boolean;
  isVoid: boolean;
  notes: string[];
  gridRow: number;
  gridColumn: number;
}

export interface QimenBoard {
  kind: QimenBoardKind;
  label: string;
  basis: QimenBoardBasis;
  palaces: QimenPalace[];
}

export interface QimenDirectionJudgment {
  direction: QimenDirection;
  palace: QimenPalaceName;
  boardKind: QimenBoardKind;
  boardLabel: string;
  score: number;
  label: QimenJudgmentLabel;
  tone: "good" | "neutral" | "warning" | "alert" | "unknown";
  patterns: string[];
  reasons: string[];
  warnings: string[];
  sourceReferences: SourceReference[];
}

export interface QimenBasis {
  wallClockDateTime: string;
  correctedDateTime: string;
  locationLabel: string;
  locationOffsetMinutes: number;
  supportRange: string;
  selectedDirection: QimenDirection;
  yearPillar: QimenPillar;
  monthPillar: QimenPillar;
  dayPillar: QimenPillar;
  hourPillar: QimenPillar;
}

export interface QimenChart {
  topic: QimenTopic;
  resolvedTopic: QimenTopic;
  questionText: string;
  basis: QimenBasis;
  boards: QimenBoard[];
  primaryBoard: QimenBoard;
  directionJudgments: QimenDirectionJudgment[];
  selectedDirectionJudgment: QimenDirectionJudgment;
  traces: RuleTrace[];
  sourceReferences: SourceReference[];
  certainty: ChartCertainty;
  explanationSections: NarrativeSection[];
  interpretationSections: NarrativeSection[];
  messages: string[];
}

export type DannekiTopic = DivinationTopic;
export type DannekiUseDeity = SixKin | "世応";
export type DannekiLineInputMode = "auto" | "manual";
export type DannekiUseGodRole = "" | "用神" | "忌神" | "原神" | "仇神";
export type DannekiSixSpirit = "青龍" | "朱雀" | "勾陳" | "螣蛇" | "白虎" | "玄武";
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
  lineInputMode: DannekiLineInputMode;
  manualLineValues: Array<6 | 7 | 8 | 9> | null;
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
  value: 6 | 7 | 8 | 9;
  stem: Stem;
  branch: Branch;
  sixSpirit: DannekiSixSpirit;
  original: YinYang;
  changed: YinYang;
  isMoving: boolean;
  relation: SixKin;
  element: Wuxing;
  seasonalState: SeasonalState;
  dayRelations: string[];
  isVoid: boolean;
  isDayChong: boolean;
  isDayHe: boolean;
  isMonthBroken: boolean;
  useGodRole: DannekiUseGodRole;
  role: "" | "世" | "応";
  note: string;
}

export interface DannekiBasis {
  correctedDateTime: string;
  locationLabel: string;
  offsetMinutes: number;
  dayGanzhi: Ganzhi;
  dayStem: Stem;
  dayBranch: Branch;
  dayElement: Wuxing;
  monthBranch: Branch;
  monthElement: Wuxing;
  voidBranches: [Branch, Branch];
  palace: TrigramKey | null;
  palaceOrder: number | null;
  worldLine: 1 | 2 | 3 | 4 | 5 | 6 | null;
  responseLine: 1 | 2 | 3 | 4 | 5 | 6 | null;
  useGodLine: 1 | 2 | 3 | 4 | 5 | 6 | null;
  useGodReason: string;
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
  traces: RuleTrace[];
  sourceReferences: SourceReference[];
  certainty: ChartCertainty;
  explanationSections: NarrativeSection[];
  interpretationSections: NarrativeSection[];
  messages: string[];
}

export type TaiitsuStartCondition = "time" | "direction" | "time-and-direction";

export interface TaiitsuInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  locationId: string;
  direction: Branch;
  startCondition: TaiitsuStartCondition;
  topic: DivinationTopic;
  questionText: string;
}

export interface TaiitsuInputState {
  input: TaiitsuInput;
}

export interface TaiitsuWorkspaceState {
  input: TaiitsuInput;
}

export interface TaiitsuKnowledgeAudit {
  generatedAt: string;
  pagesScanned: number;
  entriesCount: number;
  emptyBodyCount: number;
  duplicateEntryIdCount: number;
  lowConfidenceOrShortCount: number;
  missingPageCount: number;
  missingPages: number[];
  missingPagesTotal: number;
  textCharCount?: number;
  structuredCharCount?: number;
  textCoverageRatio?: number;
  rawTextSha1?: string;
  structuredTextSha1?: string;
}

export interface TaiitsuKnowledgeEntry {
  entryId: string;
  chapterId: string;
  chapterTitle: string;
  sectionId: string;
  sectionTitle: string;
  headingKind: "章" | "節" | "目" | "部" | "編";
  pageStart: number;
  pageEnd: number;
  body: string;
  paragraphs: string[];
  conditions: string[];
  confidence: number;
  textSha1: string;
}

export interface TaiitsuKnowledgeIndex {
  version: string;
  sourceFile: string;
  sourcePageCount: number;
  generatedAt: string;
  textFile: string;
  entries: TaiitsuKnowledgeEntry[];
  audit: TaiitsuKnowledgeAudit;
}

export interface TaiitsuBasis {
  wallClockDateTime: string;
  correctedDateTime: string;
  locationLabel: string;
  locationOffsetMinutes: number;
  direction: Branch;
  startCondition: TaiitsuStartCondition;
  dayGanzhi: Ganzhi;
  dayStem: Stem;
  dayBranch: Branch;
  hourBranch: Branch;
  directionAnchor: Branch;
  cycleIndex: number;
}

export interface TaiitsuSignal {
  key: string;
  title: string;
  value: string;
  isPrimary: boolean;
}

export interface TaiitsuSummary {
  headline: string;
  coreSignals: TaiitsuSignal[];
}

export interface TaiitsuChart {
  topic: DivinationTopic;
  resolvedTopic: DivinationTopic;
  questionText: string;
  basis: TaiitsuBasis;
  signals: TaiitsuSignal[];
  cycleGrid: Array<{
    index: number;
    label: string;
    branch: Branch;
    source: string;
  }>;
  traces: RuleTrace[];
  sourceReferences: SourceReference[];
  certainty: ChartCertainty;
  explanationSections: NarrativeSection[];
  interpretationSections: NarrativeSection[];
  summary: TaiitsuSummary;
  messages: string[];
}
