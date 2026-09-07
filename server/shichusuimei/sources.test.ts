import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import corpus from '../../knowledge/shichusuimei/sources.json';
import { buildBaziContext } from '../../src/lib/shichusuimei';
import { selectSources } from './sources';
const person = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' as const };
describe('classical evidence selection', () => {
  it('keeps unique and verifiable source excerpts with translation/summary provenance', () => {
    expect(new Set(corpus.map(s => s.id)).size).toBe(corpus.length);
    for (const source of corpus) {
      expect(createHash('sha256').update(source.text).digest('hex'), source.id).toBe(source.hash);
      expect(source.kind).toBeTruthy(); expect(source.origin).toBeTruthy();
    }
  });
  it('selects the actual day stem/month and adds partner references only for the pair', () => {
    const request = { person, focus: 'yongshen' as const, question: '' };
    const single = selectSources(buildBaziContext(request));
    expect(single.some(s => s.title === '四月庚金')).toBe(true);
    expect(single.some(s => s.id === 'dt-1278')).toBe(false);
    const pair = selectSources(buildBaziContext({ ...request, partner: { ...person, day: 10 }, focus: 'compatibility' }));
    expect(pair.some(s => s.id === 'dt-1278')).toBe(true);
    expect(pair.some(s => s.stem === '乙')).toBe(true);
    expect(pair.filter(s => s.book === '子平真詮').length).toBe(2);
  });
});
