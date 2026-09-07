import { z } from 'zod';

const sentence = z.string().min(1).max(1600);
const evidence = z.array(z.string().min(1)).min(1).max(16);
const sources = z.array(z.string().min(1)).min(1).max(8);
const notes = z.array(sentence).max(8);
export const METHODS = ['格局', '扶抑', '調候', '病薬', '通関'] as const;
const personId = z.enum(['a', 'b']);
const direction = z.object({
  summary: sentence, helps: notes, tensions: notes, conditions: notes,
  evidenceIds: evidence, sourceIds: sources,
}).strict();
export const interpretationSchema = z.object({
  summary: sentence,
  strengths: z.array(z.object({
    personId, assessment: sentence, reason: sentence, evidenceIds: evidence, sourceIds: sources,
  }).strict()).min(1).max(2),
  yongshen: z.array(z.object({
    personId, method: z.enum(METHODS), status: z.enum(['採用', '条件付き', '保留']),
    choice: sentence, targets: z.array(z.enum(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])).max(4),
    reason: sentence, conditions: notes, obstacles: notes, evidenceIds: evidence, sourceIds: sources,
  }).strict()).min(5).max(10),
  compatibility: z.object({ summary: sentence, aToB: direction, bToA: direction }).strict().nullable(),
  luck: direction.nullable(),
  uncertainties: notes,
}).strict();
export type BaziInterpretation = z.infer<typeof interpretationSchema>;
export interface SourceExcerpt {
  id: string; book: string; title: string; kind: string; text: string;
  origin: string; lineStart: number; lineEnd: number; hash: string;
  stem: string | null; month: string | null;
}
export interface InterpretationResponse {
  interpretation: BaziInterpretation; sources: SourceExcerpt[];
  model: string; provider: string; generatedAt: string; requestId: string;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; estimatedUsd: number | null };
}
