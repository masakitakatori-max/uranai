import { z } from 'zod';
import { BRANCHES, ELEMENTS, STEMS } from './shichusuimei';
import type { BirthInput } from './shichusuimeiTypes';
import type { YongshenFacts } from './shichusuimeiYongshen';

// 用神判定回路の共有契約。各段が返す構造と、画面・サーバーが同じ形を見るための型。
// 根拠の実在と規則の順守はサーバー側（circuit/pipeline.ts）で検証する。

export const STAGES = ['strength', 'pattern', 'methods', 'integration', 'plain'] as const;
export type StageName = typeof STAGES[number];
export const METHODS = ['格局', '扶抑', '病薬', '調候', '通関'] as const;

/** 流派間の対立をどう裁くかの固定規則（divination-shichusuimei の source-pack に基づく）。 */
export const INTEGRATION_RULES = [
  { id: 'R1', text: '旺衰の判定を先に確定し、格局判定の入力にする。順序を逆にしない。' },
  { id: 'R2', text: '従格・化格が疑われる命局では滴天髄（従象・化象・仮従・仮化）の成立条件を優先し、子平真詮は専旺としての位置づけ確認に使う。' },
  { id: 'R3', text: '格局が一つに定まる命局では格局の用神を採り、調候（窮通宝鑑）は補強・注意点として併記する。' },
  { id: 'R4', text: '格局が競合し決めがたい命局では、調候の用神をタイブレーカーに採ってよい。' },
  { id: 'R5', text: '見方どうしの結論が異なるときは一方を黙って採らず、両論とその扱いを明示する。' },
  { id: 'R6', text: '墓庫は刑冲を成立の必須条件にしない（透干・会支していれば働く）。' },
  { id: 'R7', text: '子平真詮の本文が足りない判断（格局の成立、成敗救応）は「条件付き」「救応あり」「保留」までにとどめる。' },
] as const;
export const RULE_IDS = INTEGRATION_RULES.map(rule => rule.id) as [string, ...string[]];

const target = z.enum([...STEMS, ...BRANCHES, ...ELEMENTS] as [string, ...string[]]);
const note = z.string().min(1).max(200);
const citation = z.object({
  passageId: z.string().min(1),
  quote: z.string().min(2).max(60).describe('取得した本文からそのまま抜き出した40字以内の語句'),
}).strict();
const evidence = {
  citations: z.array(citation).max(4),
  factIds: z.array(z.string().min(1)).max(8),
};

export const stageSchemas = {
  strength: z.object({
    verdict: z.enum(['身旺', '身弱', '中和', '従旺の疑い', '従弱の疑い', '判定保留']),
    scoreAssessment: note.describe('点数規則の結論に同意するか、しないならその理由'),
    reason: z.string().min(1).max(400),
    ...evidence,
    uncertainties: z.array(note).max(4),
  }).strict(),
  pattern: z.object({
    pattern: z.object({ name: z.string().min(1).max(20), status: z.enum(['成立', '条件付き', '不成立', '保留']), reason: z.string().min(1).max(400) }).strict(),
    special: z.object({ kind: z.enum(['通常格', '従格', '化格', '専旺']), status: z.enum(['成立', '疑いあり', '否定', '保留']), reason: z.string().min(1).max(300) }).strict(),
    ...evidence,
    uncertainties: z.array(note).max(4),
  }).strict(),
  methods: z.object({
    methods: z.array(z.object({
      method: z.enum(METHODS),
      status: z.enum(['採用候補', '条件付き', '該当なし', '保留']),
      targets: z.array(target).max(4),
      reason: z.string().min(1).max(300),
      conditions: z.array(note).max(3),
      obstacles: z.array(note).max(3),
      ...evidence,
    }).strict()).min(5).max(5),
  }).strict(),
  integration: z.object({
    summary: z.string().min(1).max(300),
    yongshen: z.object({ method: z.enum([...METHODS, '保留']), targets: z.array(target).max(3), reason: z.string().min(1).max(400) }).strict(),
    xishen: z.array(target).max(4),
    jishen: z.array(target).max(4),
    successFailure: z.object({ status: z.enum(['成', '敗', '救応あり', '保留']), rescuers: z.array(target).max(3), reason: z.string().min(1).max(300) }).strict(),
    conflicts: z.array(z.object({ methods: z.array(z.enum(METHODS)).min(2).max(2), resolution: note, ruleId: z.enum(RULE_IDS) }).strict()).max(4),
    appliedRuleIds: z.array(z.enum(RULE_IDS)).min(1).max(7),
    confidence: z.enum(['高', '中', '低']),
    ...evidence,
    uncertainties: z.array(note).max(5),
  }).strict(),
  // 読み手に渡す結論。判断の順序（強弱→取り方→具体の用神→生活）をスキーマで固定する。
  plain: z.object({
    strength: z.object({
      verdict: z.enum(['身強', '身弱', '中間']),
      confident: z.boolean().describe('前段が保留でも、どちら寄りかは必ず示す。確信が持てなければ false'),
      plain: z.string().min(1).max(90).describe('なぜそう言えるかを、季節と支えの有無で一言'),
    }).strict(),
    approach: z.object({
      method: z.enum(METHODS),
      plain: z.string().min(1).max(90).describe('その取り方が何をする方向か、なぜ他でなくこれかを一言'),
      alternatives: z.array(z.string().min(1).max(50)).max(2).describe('次点の取り方と、それを採らなかった理由'),
    }).strict(),
    yongshen: z.object({
      targets: z.array(z.string().min(1).max(4)).min(1).max(3).describe('具体的な十干・十二支・五行'),
      inChart: z.enum(['命式にある', '命式にない', '一部ある']),
      plain: z.string().min(1).max(120).describe('それが何をするものか、命式のどこにあるか／無いとどうなるか'),
    }).strict(),
    helpAvoid: z.object({ help: z.array(z.string().min(1).max(4)).max(3), avoid: z.array(z.string().min(1).max(4)).max(3), plain: z.string().min(1).max(90) }).strict(),
    daily: z.array(z.string().min(1).max(60)).min(2).max(3).describe('用神・忌神が生活で何を意味するか'),
    unsettled: z.string().max(90).describe('決め切れなかった点を1文で。無ければ空文字'),
  }).strict(),
} satisfies Record<StageName, z.ZodType>;

/**
 * 結論の段で説明なしに使ってはいけない用語。
 * 身強・身弱・用神・喜神・忌神と、取り方の名前（扶抑など）は読み手に必要なので残し、
 * 内部の判断過程でしか使わない語だけを禁じる。
 */
export const JARGON = [
  '相神', '旺衰', '得令', '建禄', '陽刃', '従格', '化格', '専旺', '真従', '仮従',
  '比肩', '劫財', '敗財', '食神', '傷官', '偏財', '正財', '正官', '七殺', '偏官', '印綬', '偏印', '正印', '通変星', '十神',
  '日主', '日干', '月令', '蔵干', '透干', '通根', '十二運', '空亡', '三会', '六合', '干合', '墓庫', '節入り', '余気', '本気', '中気',
] as const;

export type StageOutputs = { [K in StageName]: z.infer<typeof stageSchemas[K]> };

export function stageJsonSchema(stage: StageName): Record<string, unknown> {
  return z.toJSONSchema(stageSchemas[stage], { target: 'draft-7' }) as Record<string, unknown>;
}

export const CIRCUIT_VERSION = 'bazi-yongshen-circuit-v1';

export interface StageUsage { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; estimatedUsd: number | null }
export interface ToolCallLog { name: string; input: Record<string, unknown>; passageIds: string[] }
export interface StageTrace { stage: StageName; attempts: number; ms: number; model: string; provider: string; usage: StageUsage; seedPassageIds: string[]; toolCalls: ToolCallLog[] }
export interface CircuitPassageReference { id: string; book: string; title: string; kind: string; origin: string; lineStart: number; lineEnd: number }
export interface CircuitResult {
  version: string; input: BirthInput; facts: YongshenFacts; stages: Partial<StageOutputs>;
  citedPassages: CircuitPassageReference[];
  corpus: { origin: 'local-files' | 'bundled-excerpts'; books: Record<string, number> };
  trace: StageTrace[]; generatedAt: string;
}

/** 画面側で応答の形を確かめるための最小限の検証。中身の妥当性はサーバーで検証済み。 */
export const circuitResultSchema = z.object({
  version: z.literal(CIRCUIT_VERSION),
  stages: z.object({ strength: stageSchemas.strength, pattern: stageSchemas.pattern, methods: stageSchemas.methods, integration: stageSchemas.integration, plain: stageSchemas.plain }),
  citedPassages: z.array(z.object({ id: z.string(), book: z.string(), title: z.string(), kind: z.string() }).loose()),
  corpus: z.object({ origin: z.enum(['local-files', 'bundled-excerpts']), books: z.record(z.string(), z.number()) }),
}).loose();
