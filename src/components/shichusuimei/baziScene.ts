import { rootsForStem } from '../../lib/shichusuimei';
import type { BaziChart, BaziPillar, LuckPeriod, RootEvidence, Stem } from '../../lib/shichusuimeiTypes';

// These dimensions encode root locations, not a strength or auspiciousness score.
export function rootAppearance(roots: RootEvidence[]) {
  const branches = new Set(roots.map(root => root.pillarId)).size;
  const main = roots.filter(root => root.main).length;
  return { branches, main, fontSize: 28 + branches * 3 + main * 2,
    scale: .66 + branches * .10 + main * .065, opacity: Math.min(1, .58 + branches * .06 + main * .025) };
}
export interface SceneStem {
  stem: Stem; pillars: BaziPillar[]; roots: RootEvidence[]; before: RootEvidence[];
  incoming: boolean; day: boolean; form: string;
}
export function buildScene(chart: BaziChart, luck?: LuckPeriod | null) {
  const pillars = [...chart.pillars, ...(luck ? [luck] : [])];
  const hasRooted = (stem: Stem) => pillars.some(p => p.stem === stem) && rootsForStem(chart, stem, luck || undefined).length > 0;
  const cold = chart.season === '冬' && !hasRooted('丙') && !hasRooted('丁');
  const wet = pillars.filter(p => p.storage?.moisture === '湿土');
  const dry = pillars.filter(p => p.storage?.moisture === '燥土');
  const entities: SceneStem[] = [...new Set(pillars.map(p => p.stem))].map(stem => {
    const roots = rootsForStem(chart, stem, luck || undefined);
    const before = rootsForStem(chart, stem);
    const form: Record<Stem, string> = {
      甲: cold ? '寒気の中の大樹' : '土に立つ大樹', 乙: cold ? '寒気の中の草木' : '伸びる草木',
      丙: '空を照らす太陽', 丁: '灯火', 戊: '山と堤', 己: '耕土',
      庚: hasRooted('丁') && roots.length ? '丁で鍛える刀の候補' : '形になる前の金属', 辛: '宝石',
      壬: cold ? '冷気を帯びる川' : '流れる水', 癸: cold ? '雪の候補' : roots.some(r => r.main) ? '雨の候補' : '露の候補',
    };
    return { stem, roots, before, pillars: pillars.filter(p => p.stem === stem),
      incoming: luck?.stem === stem, day: stem === chart.dayMaster, form: form[stem] };
  });
  return { entities, pillars, cold, wet, dry };
}
