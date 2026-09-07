import { rootsForStem } from '../../lib/shichusuimei';
import type { BaziChart, BaziRelation, LuckPeriod } from '../../lib/shichusuimeiTypes';
import { rootAppearance } from './baziScene';

export function BaziLuckChanges({ chart, luck, relations, onSelect }: { chart: BaziChart; luck: LuckPeriod; relations: BaziRelation[]; onSelect: (ids: string[], detail: string) => void }) {
  const changes = [...new Set(chart.pillars.map(p => p.stem))].map(stem => {
    const before = rootsForStem(chart, stem);
    const after = rootsForStem(chart, stem, luck);
    return { stem, before, after, added: after.filter(root => !before.some(r => r.id === root.id)) };
  }).filter(change => change.added.length);
  const factLabel = (id: string) => {
    const pillar = [...chart.pillars, luck].find(p => id.startsWith(p.id + '-'));
    return pillar ? `${pillar.label}・${id.endsWith('-s') ? pillar.stem : pillar.branch}` : id;
  };
  const seen = new Set<string>();
  const interactions = relations.filter(r => r.scope === 'luck').filter(r => {
    const key = r.memberIds ? `${r.kind}:${[...r.memberIds].sort().join(',')}` : r.id;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  return <section className="bazi-luck-changes" aria-label="大運で変わるところ" aria-live="polite">
    <div><h3>{luck.ganzhi}が加わると</h3><p>天干の{luck.stem}と、地支{luck.branch}の蔵干{luck.hidden.map(h => h.stem).join('・')}を重ねます。出生月令は{chart.monthBranch}のまま。</p></div>
    <div className="bazi-change-list">{changes.map(change => <button type="button" key={change.stem} onClick={() => onSelect([...chart.pillars.filter(p => p.stem === change.stem).map(p => p.id + '-s'), ...change.added.map(r => r.id)], `${change.stem}の根が${change.added.map(r => `${r.branch}中${r.stem}`).join('・')}に加わります。原局の根はそのまま、用神として助けになるかは別に検討します。`)}><strong>{change.stem}</strong><span>根 {rootAppearance(change.before).branches} → {rootAppearance(change.after).branches}か所<small>追加：{change.added.map(r => `${r.branch}中${r.stem}`).join('・')}</small></span></button>)}{!changes.length && <p>原局の透干には、同五行の根の追加はありません。加わる干と組み合わせが変化点です。</p>}</div>
    <div className="bazi-change-relations"><span>大運が関わる組み合わせ</span>{interactions.length ? interactions.map(r => <button type="button" key={r.id} onClick={() => onSelect([r.id, r.fromId, r.toId, ...(r.memberIds || [])], r.description)}>{(r.memberIds || [r.fromId, r.toId]).map(factLabel).join(' × ')} {r.kind}</button>) : <span>今回の検出条件ではなし</span>}</div>
  </section>;
}
