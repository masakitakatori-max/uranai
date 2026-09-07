import { useEffect, useMemo, useRef, useState } from 'react';
import { buildBaziContext } from '../../lib/shichusuimei';
import { baziApiUrl, requestBaziInterpretation } from '../../lib/shichusuimeiClient';
import type { BirthInput, InterpretationRequest } from '../../lib/shichusuimeiTypes';
import type { InterpretationResponse } from '../../lib/shichusuimeiInterpretation';
import { BirthEditor } from '../shichusuimei/BirthEditor';
import { BaziChartView } from '../shichusuimei/BaziChartView';
import { BaziLandscape } from '../shichusuimei/BaziLandscape';
import { BaziLuckChanges } from '../shichusuimei/BaziLuckChanges';
import { InterpretationView } from '../shichusuimei/InterpretationView';
import '../shichusuimei/shichusuimei.css';

type View = 'yongshen' | 'combination' | 'luck' | 'compatibility';
const initial: BirthInput = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
export function ShichusuimeiWorkspace() {
  const [person, setPerson] = useState<BirthInput>(initial);
  const [partner, setPartner] = useState<BirthInput>({ ...initial, month: 1, sex: 'female' });
  const [sample, setSample] = useState(true);
  const [view, setView] = useState<View>('yongshen');
  const [luckIndex, setLuckIndex] = useState(0);
  const [question, setQuestion] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState('日主を中心に、天干を支える地支・蔵干と、組み合わせによる働きを見ます。');
  const [result, setResult] = useState<InterpretationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState({ ready: false, requiresAccessCode: false, checked: false });
  const [accessCode, setAccessCode] = useState('');
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const cache = useRef(new Map<string, InterpretationResponse>());
  const chartAnchor = useRef<HTMLDivElement>(null);
  const request = useMemo<InterpretationRequest>(() => ({ person, ...(view === 'compatibility' ? { partner } : {}), ...(view === 'luck' ? { luckIndex } : {}), focus: view === 'compatibility' ? 'compatibility' : 'yongshen', question }), [person, partner, view, luckIndex, question]);
  const computed = useMemo(() => {
    try { return { context: buildBaziContext(request), error: '' }; }
    catch (e) { return { context: null, error: e instanceof Error ? e.message : '出生情報を確認してください' }; }
  }, [request]);
  const context = computed.context;
  const visibleRelations = useMemo(() => {
    const seen = new Set<string>();
    return (context?.relations || []).filter(relation => {
      const key = relation.memberIds ? `${relation.scope}:${relation.kind}:${[...relation.memberIds].sort().join(',')}` : relation.id;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }, [context]);
  const factLabel = (id: string) => {
    const chart = id.startsWith('b-') ? context?.partner : context?.person;
    const pillar = [...(chart?.pillars || []), ...(context?.luck ? [context.luck] : [])].find(p => id.startsWith(p.id + '-'));
    return pillar ? `${chart?.id === 'b' ? '相手' : '本人'} ${pillar.label}・${id.endsWith('-s') ? pillar.stem : pillar.branch}` : '';
  };

  useEffect(() => {
    const abort = new AbortController();
    fetch(baziApiUrl('status'), { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('接続できません');
      const value = await response.json();
      if (!abort.signal.aborted) setConnection({ ready: value.ready === true, requiresAccessCode: value.requiresAccessCode === true, checked: true });
    }).catch(() => { if (!abort.signal.aborted) setConnection({ ready: false, requiresAccessCode: false, checked: true }); });
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);

  const invalidate = () => { generation.current++; controller.current?.abort(); setBusy(false); setResult(null); setError(''); setSelected([]); setDetail('日主を中心に、天干を支える地支・蔵干と、組み合わせによる働きを見ます。'); };
  const evidence = (ids: string[], explanation: string) => {
    const expanded = new Set(ids);
    if (context) {
      for (const relation of context.relations) if (expanded.has(relation.id)) { expanded.add(relation.fromId); expanded.add(relation.toId); relation.memberIds?.forEach(id => expanded.add(id)); }
      for (const chart of [context.person, ...(context.partner ? [context.partner] : [])]) {
        if (expanded.has(`${chart.id}-strength`)) {
          expanded.add(`${chart.id}-day-s`); expanded.add(`${chart.id}-month-b`);
          chart.strength.roots.forEach(root => expanded.add(root.id));
        }
        for (const pillar of [...chart.pillars, ...(chart.id === 'a' && context.luck ? [context.luck] : [])]) {
          if (expanded.has(pillar.id)) { expanded.add(`${pillar.id}-s`); expanded.add(`${pillar.id}-b`); }
        }
      }
    }
    setSelected([...expanded]); setDetail(explanation);
  };
  const fromAi = (ids: string[], explanation: string) => { evidence(ids, explanation); chartAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const run = async () => {
    if (!context || busy) return;
    const key = JSON.stringify(request);
    const saved = cache.current.get(key);
    if (saved) { setResult(saved); setError(''); return; }
    const job = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setResult(null);
    const timeout = setTimeout(() => abort.abort(), 370_000);
    try {
      const value = await requestBaziInterpretation(request, abort.signal, accessCode);
      if (generation.current !== job || abort.signal.aborted) return;
      if (cache.current.size >= 10) cache.current.delete(cache.current.keys().next().value as string);
      cache.current.set(key, value); setResult(value);
    } catch (e) {
      if (generation.current === job) setError(abort.signal.aborted ? '解説の取得を中止しました。再度実行できます。' : e instanceof Error ? e.message : '解説を取得できませんでした');
    } finally { clearTimeout(timeout); if (generation.current === job) setBusy(false); }
  };
  const chooseSample = (index: number) => {
    const samples = [{ month: 5, day: 15 }, { month: 1, day: 15 }, { month: 3, day: 10 }, { month: 5, day: 9 }, { month: 5, day: 13 }, { month: 5, day: 14 }, { year: 1991, month: 12, day: 9 }];
    invalidate(); setPerson({ ...initial, ...samples[index] }); setSample(true);
  };

  return <div className="bazi-workspace">
    <div className="bazi-topline"><span>四柱推命 / 用神と相性</span><details className="bazi-samples"><summary>命式例で試す</summary>{['初夏の庚', '冬の庚', '春の甲', '夏の甲', '初夏の戊', '初夏の己', '冬の癸'].map((name, i) => <button type="button" key={name} onClick={() => chooseSample(i)}>{name}</button>)}</details></div>
    <BirthEditor value={person} label="本人" onChange={input => { invalidate(); setPerson(input); setSample(false); }} />
    {sample && <p className="bazi-caption">現在は架空の入力例を表示しています。ご自身の出生情報に変更して使えます。</p>}
    <nav className="bazi-tabs" aria-label="四柱推命で知りたいこと">{([['yongshen', '用神'], ['combination', '組み合わせ'], ['luck', '大運との関係'], ['compatibility', '二人の相性']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={view === id} onClick={() => { if (view !== id) { invalidate(); setView(id); } }}>{label}</button>)}</nav>
    {view === 'compatibility' && <BirthEditor value={partner} label="相手" onChange={input => { invalidate(); setPartner(input); }} />}
    {computed.error && <p role="alert" className="bazi-error">{computed.error}</p>}
    {context && <>
      <div className="bazi-section-heading"><h2>{view === 'compatibility' ? '二つの命式は、どう関わり合うか。' : view === 'luck' ? '大運が加わると、何が変わるか。' : view === 'combination' ? '組み合わせで、働きは変わる。' : 'この命式には、何が必要か。'}</h2><span>日主 <b>{context.person.dayMaster}</b></span></div>
      {view === 'luck' && <div className="bazi-periods" aria-label="大運を選ぶ">{context.person.luck.map((p, i) => <button type="button" key={p.id} aria-pressed={i === luckIndex} onClick={() => { if (i !== luckIndex) { invalidate(); setLuckIndex(i); } }}><strong>{p.ganzhi}</strong><small>{p.startAge.toFixed(1)}〜{p.endAge.toFixed(1)}歳</small></button>)}</div>}
      <div className={`bazi-scenes ${context.luck || context.partner ? 'is-pair' : ''}`}><BaziLandscape selected={selected} onSelect={evidence} chart={context.person} title={context.partner ? '本人の景色' : '生まれ持った景色'} />{context.luck && <BaziLandscape selected={selected} onSelect={evidence} chart={context.person} luck={context.luck} title={`${context.luck.ganzhi}運が加わると`} />}{context.partner && <BaziLandscape selected={selected} onSelect={evidence} chart={context.partner} title="相手の景色" />}</div>
      {context.luck && <BaziLuckChanges chart={context.person} luck={context.luck} relations={context.relations} onSelect={evidence} />}
      <p className="bazi-caption">風景は季節・根・組み合わせを読むための象徴表現です。強さの増減と、必要な用神かどうかは分けて判断します。</p>
      <div ref={chartAnchor} className="bazi-evidence-box" aria-live="polite"><strong>命式のどこに表れているか</strong><p>{detail}</p></div>
      <div className={context.partner ? 'bazi-two-charts' : ''}><BaziChartView chart={context.person} luck={context.luck} title="本人" selected={selected} onSelect={evidence} />{context.partner && <BaziChartView chart={context.partner} title="相手" selected={selected} onSelect={evidence} />}</div>
      <details className="bazi-details" open={view !== 'yongshen'}><summary>組み合わせの作用先 {visibleRelations.length}件</summary><p>合・冲などの組み合わせを検出しています。成立条件と実際の働きは、用神や原局の状態を含めて解説します。</p><div className="bazi-relations">{visibleRelations.map(r => <button type="button" key={r.id} onClick={() => evidence([r.id, r.fromId, r.toId, ...(r.memberIds || [])], r.description)}><span>{r.scope === 'partner' ? '二人の間' : r.scope === 'luck' ? '大運と命式' : '命式内'}</span><strong>{r.kind}</strong><small>{(r.memberIds || [r.fromId, r.toId]).map(factLabel).join(" × ")}</small><small>{r.description}</small></button>)}</div>{!context.relations.length && <p>今回の検出条件に該当する合・冲等はありません。生剋と用神は別に検討します。</p>}</details>
      <details className="bazi-details"><summary>計算の規約と確認事項</summary><p>{context.person.convention}</p><p>大運は{context.person.direction}。起運年齢は節入りからの概算です。</p>{[context.person, ...(context.partner ? [context.partner] : [])].map(chart => <div key={chart.id}><strong>{chart.id === 'a' ? '本人' : '相手'}の確認事項</strong><ul>{chart.warnings.map((message, i) => <li key={i}>{message}</li>)}</ul></div>)}</details>
    </>}
    <section className="bazi-ai-input"><h3>{view === 'compatibility' ? '二人の用神と相性を読む' : '用神と組み合わせを読む'}</h3><p>古典と命式を照合し、何を用いるか、その働く条件と妨げを説明します。</p><label>詳しく見たいこと（任意）<textarea maxLength={2000} value={question} onChange={e => { invalidate(); setQuestion(e.target.value); }} placeholder={view === 'compatibility' ? '互いの用神を補えるか、気をつけたい組み合わせはあるか' : '調候と扶抑の用神が違う場合、何を優先するか'} /></label>
      {connection.requiresAccessCode && <label className="bazi-access">AI解説のアクセスコード<input type="password" autoComplete="off" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="限定公開用のコード" /></label>}
      {!connection.ready && <p className="bazi-caption">{connection.checked ? 'AI解説は接続準備中です。命式・蔵干・大運・組み合わせは確認できます。' : 'AI解説の接続を確認しています。'}</p>}
      <div className="bazi-ai-actions"><button className="bazi-primary" type="button" disabled={!context || !connection.ready || busy || connection.requiresAccessCode && !accessCode} onClick={run}>{view === 'compatibility' ? '二人の相性をAIで読む' : '用神をAIで読む'}</button>{busy && <><span role="status">命式と古典を照合しています。数分かかる場合があります。</span><button type="button" onClick={() => { invalidate(); setError('解説の取得を中止しました。'); }}>中止</button></>}</div>
      {error && <p role="alert" className="bazi-error">{error}</p>}
    </section>
    {result && <InterpretationView result={result} onEvidence={fromAi} />}
  </div>;
}
