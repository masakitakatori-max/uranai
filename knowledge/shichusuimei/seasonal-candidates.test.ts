import { describe, expect, it } from 'vitest';
import candidates from './seasonal-candidates.json';
import sources from './sources.json';
import { BRANCHES, STEMS } from '../../src/lib/shichusuimei';
describe('seasonal candidate editorial provenance', () => {
  it('covers each day-stem and birth-month once, with existing source provenance', () => {
    for (const stem of STEMS) for (const month of BRANCHES) {
      expect(candidates.filter(c => c.stem === stem && c.months.includes(month)), `${stem}/${month}`).toHaveLength(1);
    }
    for (const row of candidates) {
      const source = sources.find(s => s.id === row.sourceId);
      expect(source, row.sourceId).toBeDefined();
      expect(source?.stem).toBe(row.stem);
      expect(source?.title).toBe(row.title);
      expect(source?.lineStart).toBe(row.lineStart);
      if (source?.month && !row.months.includes(source.month)) {
        expect(row.referenceQuote).toBeTruthy();
        expect(source.text).toContain(row.referenceQuote);
      }
      for (const target of row.targets) expect(source?.text).toContain(target);
    }
  });
});
