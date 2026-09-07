import { rootAppearance } from './baziScene';
import { rootsForStem } from '../../lib/shichusuimei';
import type { BaziChart, BaziPillar, LuckPeriod } from '../../lib/shichusuimeiTypes';

export function BaziChartView({ chart, luck, selected, onSelect, title }: { chart: BaziChart; luck?: LuckPeriod | null; selected: string[]; onSelect: (ids: string[], detail: string) => void; title: string }) {
  const renderPillar = (p: BaziPillar, day = false) => {
    const roots = rootsForStem(chart, p.stem, luck || undefined);
    const appearance = rootAppearance(roots);
    const before = rootAppearance(rootsForStem(chart, p.stem));
    const added = luck && !p.id.includes("-luck-") && appearance.branches > before.branches;
    const buttonClass = (id: string) => selected.includes(id) ? 'bazi-node is-evidence' : 'bazi-node';
    return <article className="bazi-pillar" key={p.id}>
      <h4>{p.label}{day ? '・日主' : ''}</h4>
      <button type="button" data-fact-id={`${p.id}-s`} className={`${buttonClass(p.id + '-s')} bazi-stem ${day ? 'is-day' : ''}`} onClick={() => onSelect([p.id + '-s', ...roots.map(r => r.id)], `${p.label}の${p.stem}。${roots.length ? '根は ' + roots.map(r => `${r.branch}中${r.stem}`).join('・') : '同五行の蔵干を確認できません'}。`)}>
        <b style={{ fontSize: appearance.fontSize, opacity: appearance.opacity }}>{p.stem}</b><span>{day ? chart.id === 'b' ? '相手の日主' : 'あなたの日主' : p.tenGod}</span>
      </button>
      <small className="bazi-root-note">{added ? `根 ${before.branches} → ${appearance.branches}か所` : appearance.branches ? `根${appearance.branches}か所・本気${appearance.main}` : '同五行の根なし'}</small>
      <div className={`bazi-earth ${p.storage?.moisture === '湿土' ? 'is-wet' : ''}`}>
        <button type="button" data-fact-id={`${p.id}-b`} className={`${buttonClass(p.id + '-b')} bazi-branch`} onClick={() => onSelect([p.id + '-b', ...p.hidden.map(h => h.id)], `${p.branch}の蔵干：${p.hidden.map(h => h.stem).join('・')}。${p.storage ? p.storage.moisture + '、' + p.storage.element + 'の庫。庫の所属と、開庫の成否は別に判断します。' : p.stage + '。'}`)}>{p.branch}</button>
        <small>{p.storage ? `${p.storage.moisture}・${p.storage.element}の庫` : p.stage}</small>
        <div className="bazi-hidden-label">蔵干</div>
        {p.hidden.map(h => <button type="button" key={h.id} data-fact-id={h.id} className={`${buttonClass(h.id)} bazi-hidden`} onClick={() => onSelect([h.id, p.id + '-b'], `${p.label}・${p.branch}中の${h.stem}は${h.tenGod}。${h.main ? '本気' : 'その他の蔵干'}です。`)}><b>{h.stem}</b><span>{h.tenGod}</span></button>)}
      </div>
    </article>;
  };
  return <section className="bazi-chart" aria-label={`${title}の命式`}>
    <div className="bazi-section-heading"><h3>{title}の命式</h3><span>{chart.monthBranch}月・{chart.season} / 日主 {chart.dayMaster}</span></div>
    <div className="bazi-pillars">{chart.pillars.map((p, i) => renderPillar(p, i === 2))}</div>
    {luck && <div className="bazi-luck-added"><div><strong>加わる大運 {luck.ganzhi}</strong><p>出生月令は{chart.monthBranch}のまま。</p></div><div className="bazi-luck-pillar">{renderPillar(luck)}</div></div>}
    <p className="bazi-caption">金色＝日主。文字の大きさ・濃さ＝根の所在。文字を選ぶと根拠を表示します。</p>
    <details className="bazi-details"><summary>旺衰の計算根拠：{chart.strength.label}</summary><p>月令では{chart.strength.seasonalState}。通常格を前提にした機械評価です。</p><ul>{chart.strength.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul><p>{chart.strength.caveats.join(' ')}</p></details>
  </section>;
}
