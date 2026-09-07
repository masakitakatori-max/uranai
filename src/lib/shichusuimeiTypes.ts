export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type Element = '木' | '火' | '土' | '金' | '水';
export type PersonId = 'a' | 'b';
export interface BirthInput {
  year: number; month: number; day: number; hour: number; minute: number;
  utcOffset: number; sex: 'male' | 'female';
}
export interface HiddenStem {
  id: string; stem: Stem; element: Element; tenGod: string; main: boolean;
}
export interface BaziPillar {
  id: string; label: string; stem: Stem; branch: Branch; ganzhi: string;
  element: Element; tenGod: string; stage: string; hidden: HiddenStem[];
  storage: { moisture: '湿土' | '燥土'; element: Element } | null;
}
export interface RootEvidence {
  id: string; pillarId: string; branch: Branch; stem: Stem; main: boolean;
}
export interface LuckPeriod extends BaziPillar {
  index: number; startAge: number; endAge: number;
}
export interface BaziRelation {
  id: string; kind: string; fromId: string; toId: string; from: string; to: string;
  scope: 'natal' | 'luck' | 'partner'; description: string; conditional: boolean;
  memberIds?: string[];
}
export interface StrengthEvidence {
  label: '身強寄り' | '身弱寄り' | '判定保留'; status: 'rule-estimate';
  seasonalState: string; roots: RootEvidence[]; support: string[]; drain: string[];
  reasons: string[]; caveats: string[]; ruleVersion: string;
}
export interface BaziChart {
  id: PersonId; input: BirthInput; dayMaster: Stem; element: Element;
  monthBranch: Branch; season: '春' | '夏' | '秋' | '冬'; pillars: BaziPillar[];
  luck: LuckPeriod[]; direction: '順行' | '逆行'; voidBranches: Branch[];
  strength: StrengthEvidence; relations: BaziRelation[];
  warnings: string[]; convention: string; version: string;
}
export interface InterpretationRequest {
  person: BirthInput; partner?: BirthInput; luckIndex?: number;
  focus: 'yongshen' | 'compatibility'; question: string;
}
export interface BaziContext {
  person: BaziChart; partner: BaziChart | null; luck: LuckPeriod | null;
  relations: BaziRelation[]; factIds: string[];
}
