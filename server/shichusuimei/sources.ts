import corpus from '../../knowledge/shichusuimei/sources.json';
import type { BaziContext } from '../../src/lib/shichusuimeiTypes';
import type { SourceExcerpt } from '../../src/lib/shichusuimeiInterpretation';

export const SOURCE_VERSION = 'classics-2026-09-07-v1';
export function selectSources(context: BaziContext): SourceExcerpt[] {
  const charts = [context.person, ...(context.partner ? [context.partner] : [])];
  const selected = (corpus as SourceExcerpt[]).filter(s => {
    if (s.book === '子平真詮') return true;
    if (s.book === '窮通宝鑑') return charts.some(c => {
      if (s.stem !== c.dayMaster) return false;
      if (s.month === c.monthBranch) return true;
      if (s.month) return false;
      if (s.title.includes(c.season)) return true;
      if (/^[甲乙丙丁戊己庚辛壬癸][木火土金水]総論$/.test(s.title) || s.title === '論土') return true;
      return s.title.startsWith('正二月') && '寅卯'.includes(c.monthBranch)
        || s.title.startsWith('八九月') && '酉戌'.includes(c.monthBranch)
        || s.title.startsWith('十一・十二月') && '子丑'.includes(c.monthBranch);
    });
    if (s.stem) return charts.some(c => c.dayMaster === s.stem);
    return /衰旺|体用|通関|寒暖|燥湿|従象|化象|中和/.test(s.title)
      || !!context.partner && /夫妻/.test(s.title);
  });
  if (selected.length < 4) throw new Error('該当する古典資料を取得できませんでした');
  return selected;
}
