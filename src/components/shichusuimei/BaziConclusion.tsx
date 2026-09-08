import candidates from '../../../knowledge/shichusuimei/seasonal-candidates.json';
import { elementOf, STEMS } from '../../lib/shichusuimei';
import type { BaziChart, Stem } from '../../lib/shichusuimeiTypes';
import type { BaziInterpretation } from '../../lib/shichusuimeiInterpretation';
type Props = { chart: BaziChart; report?: BaziInterpretation; onSelect: (ids: string[], detail: string) => void };

export function BaziConclusion({ chart, report, onSelect }: Props) {
  const candidate = candidates.find(c => c.stem === chart.dayMaster && c.months.includes(chart.monthBranch));
  const presence = (target: string) => {
    const matches = chart.pillars.flatMap(p => [
      ...(p.stem === target ? [{ id: p.id + '-s', label: `${p.label}の天干` }] : []),
      ...(p.branch === target ? [{ id: p.id + '-b', label: `${p.label}の地支` }] : []),
      ...p.hidden.filter(h => h.stem === target).map(h => ({ id: h.id, label: `${p.label}・${p.branch}中${h.stem}` })),
    ]);
    const description = matches.length ? matches.map(m => m.label).join(' / ') : '原局に見当たらない';
    return <button type="button" className="bazi-candidate-presence" key={target} onClick={() => onSelect(matches.map(m => m.id), `${target}：${description}。存在することと、用神として働くことは別に判断します。`)}><b>{target}</b><span>{STEMS.includes(target as Stem) && <small>{elementOf(target as Stem)}の候補</small>}{description}</span></button>;
  };
  const groups = [ ['採用', '採用した用神'], ['条件付き', '条件付きの用神'], ['保留', '判断を保留した用神'] ] as const;
  return <section className={`bazi-conclusion ${report ? 'has-ai-answer' : ''}`} aria-label="必要なものの結論" aria-live="polite">
    {report ? <>
      <span className="bazi-conclusion-label">結論 / AIの採用判断</span>
      <p className="bazi-conclusion-answer">{report.summary}</p>
      {groups.map(([status, label]) => {
        const entries = report.yongshen.filter(y => y.personId === chart.id && y.status === status);
        return entries.length > 0 && <section className="bazi-conclusion-methods" aria-label={label} key={status}><h3>{status}</h3>{entries.map(y => <article key={y.method}><div><span>{y.method}</span><strong>{y.choice}</strong></div><details><summary>所在と働く条件</summary>{status !== '保留' && y.targets.length > 0 && <div className="bazi-conclusion-presence">{y.targets.map(presence)}</div>}<p>{y.reason}</p>{y.conditions.length > 0 && <p>条件：{y.conditions.join(' / ')}</p>}{y.obstacles.length > 0 && <p>妨げ：{y.obstacles.join(' / ')}</p>}<button type="button" onClick={() => onSelect(y.evidenceIds, `${y.method}：${y.reason}`)}>この判断の根拠を見る</button></details></article>)}</section>;
      })}
    </> : <>
      <span className="bazi-conclusion-label">古典からの候補 / 暫定</span>
      <p className="bazi-conclusion-answer">{candidate ? candidate.targets.join('・') : '命式全体を照合して判断'}</p>
      <p>{candidate?.reason || '候補を絞るには、格局と寒暖燥湿を含めた検討が必要です。'}</p>
      {candidate && <><div className="bazi-conclusion-presence">{candidate.targets.map(presence)}</div><p className="bazi-conclusion-source">『{candidate.book}』{candidate.title}に基づく要約</p></>}
      <details><summary>この結論の範囲</summary>{candidate?.referenceQuote && <blockquote>参照箇所：{candidate.referenceQuote}</blockquote>}<p>日主{chart.dayMaster}・出生月令{chart.monthBranch}に対応する古典の候補です。並びはこの命式での採用順ではなく、すべてを追加する意味でもありません。身強身弱・格局・調候・合冲などを照合したAI解説後に、採用・条件付き・保留の判断へ更新します。</p></details>
      <a className="bazi-conclusion-link" href="#bazi-ai-input">命式全体から用神を検討する</a>
    </>}
  </section>;
}
