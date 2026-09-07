import { useState } from 'react';
import type { InterpretationResponse } from '../../lib/shichusuimeiInterpretation';

export function InterpretationView({ result, onEvidence }: { result: InterpretationResponse; onEvidence: (ids: string[], detail: string) => void }) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const report = result.interpretation;
  const evidence = (item: { evidenceIds: string[]; sourceIds: string[] }, detail: string) => <div className="bazi-reference-buttons"><button type="button" onClick={() => onEvidence(item.evidenceIds, detail)}>命式の根拠を見る</button>{item.sourceIds.map(id => <button type="button" key={id} onClick={() => setSourceId(id)}>{result.sources.find(s => s.id === id)?.book || id}</button>)}</div>;
  const list = (title: string, items: string[]) => items.length > 0 && <div><h5>{title}</h5><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>;
  const source = result.sources.find(s => s.id === sourceId);
  return <section className="bazi-interpretation" aria-label="AIの鑑定解説">
    <div className="bazi-section-heading"><h2>用神と相性の読み</h2><span>AIによる解釈</span></div><p className="bazi-ai-summary">{report.summary}</p>
    {report.strengths.map(s => <div className="bazi-strength-result" key={s.personId}><strong>{s.personId === 'a' ? '本人' : '相手'}：{s.assessment}</strong><p>{s.reason}</p>{evidence(s, s.reason)}</div>)}
    <h3>何を、何のために用いるか</h3><div className="bazi-yongshen-list">{report.yongshen.map(y => <details className="bazi-yongshen" key={y.personId + y.method} open={y.method === '調候'}><summary><span>{report.strengths.length > 1 ? (y.personId === 'a' ? '本人 / ' : '相手 / ') : ''}{y.method}</span><strong>{y.choice}</strong><small>{y.status}</small></summary><p className="bazi-targets">{y.targets.map(target => <span key={target}>{target}</span>)}</p><p>{y.reason}</p>{list('働く条件', y.conditions)}{list('妨げる組み合わせ', y.obstacles)}{evidence(y, `${y.method}：${y.reason}`)}</details>)}</div>
    {report.compatibility && <section className="bazi-compatibility-result"><h3>二人の相性</h3><p>{report.compatibility.summary}</p><div className="bazi-directions">{([['本人 → 相手', report.compatibility.aToB], ['相手 → 本人', report.compatibility.bToA]] as const).map(([title, item]) => <article key={title}><h4>{title}</h4><p>{item.summary}</p>{list('補い合う点', item.helps)}{list('緊張が生じる点', item.tensions)}{list('成立条件', item.conditions)}{evidence(item, `${title}：${item.summary}`)}</article>)}</div></section>}
    {report.luck && <section><h3>命式と大運の相性</h3><p>{report.luck.summary}</p>{list('助けになる作用', report.luck.helps)}{list('妨げになる作用', report.luck.tensions)}{list('成立条件', report.luck.conditions)}{evidence(report.luck, report.luck.summary)}</section>}
    {list('判断が残るところ', report.uncertainties)}
    {source && <aside className="bazi-source" aria-label="参照した古典"><div className="bazi-section-heading"><h3>{source.book}・{source.title}</h3><button type="button" onClick={() => setSourceId(null)}>閉じる</button></div><p>{source.kind}</p><blockquote>{source.text}</blockquote>{source.origin.startsWith('https://') ? <a href={source.origin} target="_blank" rel="noreferrer">原文の掲載先</a> : <small>{source.origin} {source.lineStart}行から / {source.id}</small>}</aside>}
    <p className="bazi-caption">{result.model} · {new Date(result.generatedAt).toLocaleString('ja-JP')}。命式の計算事実と古典に基づく解釈を分けて表示しています。</p>
  </section>;
}
