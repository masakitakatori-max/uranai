import { z } from 'zod';
import { interpretationSchema, METHODS } from '../../src/lib/shichusuimeiInterpretation';

export const birthSchema = z.object({
  year: z.number().int().min(1900).max(2100), month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31), hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59), utcOffset: z.number().min(-12).max(14),
  sex: z.enum(['male', 'female']),
}).strict().refine(b => new Date(Date.UTC(b.year, b.month - 1, b.day)).getUTCMonth() === b.month - 1, '実在しない日付です');
const requestSchema = z.object({
  person: birthSchema, partner: birthSchema.optional(), luckIndex: z.number().int().min(0).max(7).optional(),
  focus: z.enum(['yongshen', 'compatibility']), question: z.string().max(2000),
}).strict().refine(r => r.focus !== 'compatibility' || !!r.partner, '相性の解説には相手の生年月日時が必要です');
export function validateRequest(value: unknown) { return requestSchema.parse(value); }

export function validateInterpretation(value: unknown, factIds: string[], sourceIds: string[], partner: boolean, luck: boolean) {
  const report = interpretationSchema.parse(value);
  const facts = new Set(factIds), sources = new Set(sourceIds), people = partner ? ['a', 'b'] : ['a'];
  const check = (entry: { evidenceIds: string[]; sourceIds: string[] }, person?: string, paired = false) => {
    if (entry.evidenceIds.some(id => !facts.has(id)) || entry.sourceIds.some(id => !sources.has(id))) throw new Error('AIの根拠を命式・原典と照合できませんでした');
    if (person && !entry.evidenceIds.some(id => id.startsWith(person + '-'))) throw new Error('対象者の命式を根拠に含めていません');
    if (paired && !people.every(p => entry.evidenceIds.some(id => id.startsWith(p + '-')))) throw new Error('相性には二人の命式の根拠が必要です');
  };
  if (report.strengths.length !== people.length || report.yongshen.length !== people.length * METHODS.length) throw new Error('対象者の評価が不足しています');
  for (const person of people) {
    if (report.strengths.filter(s => s.personId === person).length !== 1) throw new Error('旺衰評価の対象者が重複しています');
    for (const method of METHODS) {
      if (report.yongshen.filter(y => y.personId === person && y.method === method).length !== 1) throw new Error('用神の各観点を個別に評価してください');
    }
  }
  report.strengths.forEach(entry => check(entry, entry.personId));
  report.yongshen.forEach(entry => check(entry, entry.personId));
  if (!!report.compatibility !== partner || !!report.luck !== luck) throw new Error('依頼した比較範囲とAIの回答が一致しません');
  if (report.compatibility) { check(report.compatibility.aToB, undefined, true); check(report.compatibility.bToA, undefined, true); }
  if (report.luck) { check(report.luck, 'a'); if (!report.luck.evidenceIds.some(id => id.includes('-luck-'))) throw new Error('大運の根拠がありません'); }
  return report;
}
