import { describe, expect, it } from 'vitest';
import { validateInterpretation, validateRequest } from './contract';
import { buildBaziContext } from '../../src/lib/shichusuimei';
import type { BaziInterpretation } from '../../src/lib/shichusuimeiInterpretation';

const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
function report(): BaziInterpretation {
  return { summary: '判断例', strengths: [{ personId: 'a', assessment: '身弱寄り', reason: '根と月令を考慮', evidenceIds: ['a-day-s'], sourceIds: ['qt-1'] }],
    yongshen: ['格局', '扶抑', '調候', '病薬', '通関'].map(method => ({ personId: 'a', method, status: '条件付き', choice: '壬を検討', targets: ['壬'], reason: '火の働きを検討', conditions: ['水の作用可否'], obstacles: [], evidenceIds: ['a-day-s'], sourceIds: ['qt-1'] })) as BaziInterpretation['yongshen'],
    compatibility: null, luck: null, uncertainties: [] };
}
describe('interpretation boundary', () => {
  it('rejects missing partner and oversized questions before running AI', () => {
    expect(() => validateRequest({ person: birth, focus: 'compatibility', question: '' })).toThrow();
    expect(() => validateRequest({ person: birth, focus: 'yongshen', question: 'a'.repeat(2001) })).toThrow();
  });
  it('rejects nonexistent dates without normalizing them into another month', () => {
    expect(() => validateRequest({ person: { ...birth, month: 2, day: 30 }, focus: 'yongshen', question: '' })).toThrow();
  });
  it('refuses invented sources or facts instead of presenting them as evidence', () => {
    const good = report();
    expect(validateInterpretation(good, ['a-day-s'], ['qt-1'], false, false)).toEqual(good);
    good.yongshen[0].sourceIds = ['invented'];
    expect(() => validateInterpretation(good, ['a-day-s'], ['qt-1'], false, false)).toThrow();
    good.yongshen[0].sourceIds = ['qt-1'];
    good.yongshen[0].evidenceIds = ['a-absent-h-壬'];
    expect(() => validateInterpretation(good, ['a-day-s'], ['qt-1'], false, false)).toThrow();
  });
  it('requires all five methods once per person and both partner directions', () => {
    const bad = report(); bad.yongshen[4].method = '格局';
    expect(() => validateInterpretation(bad, ['a-day-s'], ['qt-1'], false, false)).toThrow();
    expect(() => validateInterpretation(report(), ['a-day-s'], ['qt-1'], true, false)).toThrow();
  });
  it('accepts verified cross-chart relation evidence and still rejects one-person-only compatibility', () => {
    const context = buildBaziContext(validateRequest({ person: birth, partner: { ...birth, month: 1 }, focus: 'compatibility', question: '' }));
    const relation = context.relations.find(r => r.scope === 'partner')!;
    const pair = report();
    pair.strengths.push({ ...pair.strengths[0], personId: 'b', evidenceIds: ['b-day-s'] });
    pair.yongshen.push(...pair.yongshen.map(item => ({ ...item, personId: 'b' as const, evidenceIds: ['b-day-s'] })));
    const direction = { summary: '二人の配置', helps: [], tensions: [], conditions: [], evidenceIds: [relation.id], sourceIds: ['qt-1'] };
    pair.compatibility = { summary: '双方向', aToB: { ...direction }, bToA: { ...direction } };
    expect(validateInterpretation(pair, context.factIds, ['qt-1'], true, false, context.relations)).toEqual(pair);
    pair.compatibility.aToB.evidenceIds = ['a-day-s'];
    expect(() => validateInterpretation(pair, context.factIds, ['qt-1'], true, false, context.relations)).toThrow('二人の命式');
  });

});
