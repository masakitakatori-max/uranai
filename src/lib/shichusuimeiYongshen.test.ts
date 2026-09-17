import { describe, expect, it } from 'vitest';
import { buildBaziChart } from './shichusuimei';
import { buildYongshenFacts, elementOfRole, roleOf } from './shichusuimeiYongshen';
import type { BirthInput } from './shichusuimeiTypes';

const at = (year: number, month: number, day: number): BirthInput => ({ year, month, day, hour: 12, minute: 0, utcOffset: 9, sex: 'male' });
const summer: BirthInput = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
const facts = (input: BirthInput) => buildYongshenFacts(buildBaziChart(input));
const candidate = (value: ReturnType<typeof facts>, method: string) => value.candidates.find(item => item.method === method)!;

describe('roles between elements', () => {
  it('maps each element to its role relative to the day master and back', () => {
    expect(['木', '火', '土', '金', '水'].map(element => roleOf('火', element as never))).toEqual(['印', '比劫', '食傷', '財', '官殺']);
    expect(elementOfRole('金', '官殺')).toBe('火');
    expect(elementOfRole('金', '食傷')).toBe('水');
  });
});

describe('deterministic yongshen facts', () => {
  it('scores strength with the day master, a triple-weighted month branch and the other six characters', () => {
    const value = facts(summer);
    expect(value.strength.entries).toHaveLength(8);
    expect(value.strength.entries.find(entry => entry.factId === 'a-day-s')?.points).toBe(4);
    expect(Math.abs(value.strength.entries.find(entry => entry.factId === 'a-month-b')!.points)).toBe(3);
    expect(value.strength.entries.reduce((sum, entry) => sum + entry.points, 0)).toBe(value.strength.total);
    expect(value.strength).toMatchObject({ total: 3, label: '身旺' });
    expect(value.strength.rule).toContain('古典の条文ではない');
    expect(value.weightedCounts).toEqual({ 木: 0, 火: 3, 土: 2, 金: 3, 水: 1 });
  });

  it('lists a candidate or an explicit non-match for all five methods', () => {
    const value = facts(summer);
    expect(value.candidates.map(item => item.method)).toEqual(['格局', '扶抑', '病薬', '調候', '通関']);
    expect(value.pattern.name).toBe('七殺格');
    expect(value.pattern.basis).toContain('格を成す透干はない');
    expect(candidate(value, '扶抑')).toMatchObject({ status: '候補', targets: ['火', '水'] });
    expect(candidate(value, '病薬')).toMatchObject({ status: '該当なし', targets: [] });
    expect(candidate(value, '調候')).toMatchObject({ status: '候補', targets: ['壬', '丙', '戊'], sourceId: 'qt-590' });
    expect(candidate(value, '通関')).toMatchObject({ status: '候補', targets: ['土'] });
    expect(value.flags).toEqual([]);
  });

  it('suppresses a strong chart driven by the print star with wealth and flags a possible follow-the-strong chart', () => {
    const value = facts(at(1988, 1, 1));
    expect(value.strength).toMatchObject({ total: 9, label: '身旺' });
    expect(value.pattern.name).toBe('印格');
    expect(candidate(value, '扶抑')).toMatchObject({ targets: ['土'] });
    expect(candidate(value, '扶抑').reason).toContain('印');
    expect(candidate(value, '病薬')).toMatchObject({ status: '候補', targets: ['土', '木'] });
    expect(value.flags.map(flag => flag.kind)).toEqual(['従旺の疑い']);
  });

  it('supports a weak chart pressured by the officer with the print star and bridges an element conflict', () => {
    const value = facts(at(1988, 2, 8));
    expect(value.strength).toMatchObject({ total: -5, label: '身弱' });
    expect(value.pattern.name).toBe('傷官格');
    expect(candidate(value, '扶抑')).toMatchObject({ targets: ['金'] });
    expect(candidate(value, '通関')).toMatchObject({ status: '候補', targets: ['火'] });
  });

  it('treats a peer month order as 建禄 and detects a possible transformation', () => {
    expect(facts(at(1990, 1, 14)).pattern.name).toBe('建禄格');
    const transforming = facts(at(1990, 5, 8));
    expect(transforming.flags).toEqual([expect.objectContaining({ kind: '化格の疑い', factIds: ['a-day-s', 'a-hour-s', 'a-month-b'] })]);
  });
});
