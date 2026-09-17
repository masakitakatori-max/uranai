import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { BRANCHES, ELEMENTS } from '../../lib/shichusuimei';
import { baziApiUrl, requestYongshenCircuit } from '../../lib/shichusuimeiClient';
import type { CircuitResult } from '../../lib/shichusuimeiCircuit';
import { MEMO_CAPACITY, buildBaziSheet, buildSheetMemo, memoFontSize, type BaziSheet, type SheetCalendarDay } from '../../lib/shichusuimeiSheet';
import type { BirthInput, Element } from '../../lib/shichusuimeiTypes';

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const ELEMENT_NODES: Readonly<Record<Element, { angle: number; fill: string; text: string; stroke: string }>> = {
  木: { angle: -90, fill: '#23883a', text: '#111', stroke: '#23883a' },
  火: { angle: -18, fill: '#e3261c', text: '#111', stroke: '#e3261c' },
  土: { angle: 54, fill: '#e2b52a', text: '#111', stroke: '#e2b52a' },
  金: { angle: 126, fill: '#fff', text: '#111', stroke: '#111' },
  水: { angle: 198, fill: '#111', text: '#fff', stroke: '#111' },
};

function polar(cx: number, cy: number, radius: number, degrees: number): [number, number] {
  const radians = degrees * Math.PI / 180;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

function arrowBetween(from: Element, to: Element, gap: number): string {
  const [x1, y1] = polar(120, 118, 88, ELEMENT_NODES[from].angle);
  const [x2, y2] = polar(120, 118, 88, ELEMENT_NODES[to].angle);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length; const uy = (y2 - y1) / length;
  return `M${(x1 + ux * gap).toFixed(1)} ${(y1 + uy * gap).toFixed(1)}L${(x2 - ux * gap).toFixed(1)} ${(y2 - uy * gap).toFixed(1)}`;
}

function FiveElementDiagram() {
  const generating = ELEMENTS.map((element, index) => [element, ELEMENTS[(index + 1) % 5]!] as const);
  const controlling = ELEMENTS.map((element, index) => [element, ELEMENTS[(index + 2) % 5]!] as const);
  return <svg className="bs-five" viewBox="0 0 300 236" role="img" aria-label="五行の相生と相剋">
    <defs><marker id="bs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#111" /></marker></defs>
    {controlling.map(([from, to]) => <path key={`k-${from}`} d={arrowBetween(from, to, 30)} stroke="#111" strokeWidth="1.1" strokeDasharray="3 3" markerEnd="url(#bs-arrow)" fill="none" />)}
    {generating.map(([from, to]) => <path key={`s-${from}`} d={arrowBetween(from, to, 30)} stroke="#111" strokeWidth="1.6" markerEnd="url(#bs-arrow)" fill="none" />)}
    {ELEMENTS.map(element => {
      const node = ELEMENT_NODES[element];
      const [x, y] = polar(120, 118, 88, node.angle);
      return <g key={element}><circle cx={x} cy={y} r="24" fill={node.fill} stroke={node.stroke} strokeWidth="2" /><text x={x} y={y + 8} textAnchor="middle" fontSize="23" fontWeight="700" fill={node.text}>{element}</text></g>;
    })}
    <path d="M228 196h30" stroke="#111" strokeWidth="1.6" markerEnd="url(#bs-arrow)" /><text x="264" y="200" fontSize="12">相生</text>
    <path d="M228 216h30" stroke="#111" strokeWidth="1.1" strokeDasharray="3 3" markerEnd="url(#bs-arrow)" /><text x="264" y="220" fontSize="12">相剋</text>
  </svg>;
}

function BranchDial() {
  const cx = 160; const cy = 146;
  const outline = Array.from({ length: 12 }, (_, index) => polar(cx, cy, 98, -75 + 30 * index).map(value => value.toFixed(1)).join(' ')).join(' ');
  const directions = [['北', 0, -1], ['東', 1, 0], ['南', 0, 1], ['西', -1, 0]] as const;
  return <svg className="bs-dial" viewBox="0 0 320 292" role="img" aria-label="十二支の方位・時刻・月">
    <polygon points={outline} fill="none" stroke="#111" strokeWidth="2.4" />
    {BRANCHES.map((branch, index) => {
      const angle = -90 + 30 * index;
      const [bx, by] = polar(cx, cy, 74, angle);
      const [mx, my] = polar(cx, cy, 52, angle);
      const [tx, ty] = polar(cx, cy, 114, angle);
      return <g key={branch}>
        <text x={bx} y={by + 8} textAnchor="middle" fontSize="22" fontWeight="700">{branch}</text>
        <text x={mx} y={my + 4} textAnchor="middle" fontSize="10">{((index + 11) % 12) + 1}月</text>
        <text x={tx} y={ty + 4} textAnchor="middle" fontSize="10" fontWeight="700">{pad(index * 2)}:00</text>
      </g>;
    })}
    {directions.map(([label, dx, dy]) => <text key={label} x={cx + dx * 148} y={cy + dy * 134 + 6} textAnchor="middle" fontSize="15" fill="#c2185b">{label}</text>)}
  </svg>;
}

function calendarWeeks(days: readonly SheetCalendarDay[]): (SheetCalendarDay | null)[][] {
  const cells: (SheetCalendarDay | null)[] = [...Array<null>(days[0]!.weekday).fill(null), ...days];
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

function Vertical({ children }: { children: string }) {
  return <span className="bs-vertical">{children}</span>;
}

export function BaziSheetView({ sheet, name, memo, appraiser, showCalendar }: { sheet: BaziSheet; name: string; memo: string; appraiser: string; showCalendar: boolean }) {
  const { input, pillars, calendar } = sheet;
  const memoBox = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // 字数からの見積もりで置いたあと、実際の高さを測って収まるまで縮める。
    const box = memoBox.current;
    if (!box) return;
    let size = memoFontSize(memo.length, !showCalendar);
    box.style.fontSize = `${size}pt`;
    while (box.scrollHeight > box.clientHeight && size > 6) {
      size = Math.round((size - 0.25) * 100) / 100;
      box.style.fontSize = `${size}pt`;
    }
  }, [memo, showCalendar]);
  const luckRows = [
    ['西暦', (index: number) => sheet.luck[index]!.year],
    ['年齢', (index: number) => `〜${sheet.luck[index]!.age}`],
    ['干', (index: number) => sheet.luck[index]!.stem],
    ['通変星', (index: number) => sheet.luck[index]!.tenGod],
    ['支', (index: number) => sheet.luck[index]!.branch],
    ['十二運', (index: number) => sheet.luck[index]!.stage],
  ] as const;
  const yearRows = [
    ['西暦', (index: number) => sheet.years[index]!.year],
    ['年齢', (index: number) => sheet.years[index]!.age ?? ''],
    ['干', (index: number) => sheet.years[index]!.stem],
    ['通変星', (index: number) => sheet.years[index]!.tenGod],
    ['支', (index: number) => sheet.years[index]!.branch],
    ['十二運', (index: number) => sheet.years[index]!.stage],
  ] as const;
  return <section className="bazi-sheet" aria-label="鑑定個票">
    <header className="bs-header">
      <span className="bs-name">{name}</span><span>様</span>
      <span className="bs-birth">{input.sex === 'male' ? '男性' : '女性'}{'\u3000'}{input.year}/{pad(input.month)}/{pad(input.day)} {pad(input.hour)}:{pad(input.minute)}生まれ</span>
    </header>

    <div className="bs-top">
      <div className="bs-meishiki">
        <h4>命式</h4>
        <table className="bs-table bs-stems" aria-label="命式の天干">
          <thead><tr>{pillars.map(p => <th key={p.key} scope="col">{p.label}</th>)}</tr></thead>
          <tbody>
            <tr className="bs-stem-row">{pillars.map(p => <td key={p.key}><span className="bs-stem">{p.stem}<br />（{p.stemElement}）</span>{p.tenGod && <Vertical>{p.tenGod}</Vertical>}</td>)}</tr>
            <tr>{pillars.map(p => <td key={p.key}>{p.selfStage ?? ''}</td>)}</tr>
          </tbody>
        </table>
        <table className="bs-table bs-branches" aria-label="命式の地支と蔵干">
          <tbody>
            <tr className="bs-branch-row">{pillars.map(p => <td key={p.key} colSpan={3}>{p.branch}</td>)}</tr>
            <tr className="bs-hidden-row">{pillars.flatMap(p => p.hidden.map((h, i) => <td key={`${p.key}-${i}`} className={h.active ? 'is-active' : undefined}>{h.stem}</td>))}</tr>
            <tr className="bs-hidden-gods">{pillars.flatMap(p => p.hidden.map((h, i) => <td key={`${p.key}-${i}`} className={h.active ? 'is-active' : undefined}><Vertical>{h.tenGod}</Vertical></td>))}</tr>
            <tr>{pillars.map(p => <td key={p.key} colSpan={3}>{p.stage}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="bs-strength">
        <span className="bs-label">五行の強さ</span>
        <dl>{ELEMENTS.map(element => <div key={element}><dt>{element}</dt><dd>{sheet.elementCounts[element]}</dd></div>)}</dl>
        <span>旺衰{'\u3000'}{sheet.strengthLabel}</span>
        <span>空亡{'\u3000'}{sheet.voidBranches.join('')}</span>
      </div>
      <FiveElementDiagram />
    </div>

    <div className="bs-middle">
      <div>
        <h4>大運</h4>
        <table className="bs-table bs-luck" aria-label="大運">
          <tbody>
            {luckRows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{sheet.luck.map((_, index) => <td key={index}>{value(index)}</td>)}</tr>)}
            <tr className="bs-mark-row"><th scope="row"><span className="bs-visually-hidden">記入欄</span></th>{sheet.luck.map((_, index) => <td key={index} />)}</tr>
          </tbody>
        </table>
      </div>
      <BranchDial />
    </div>

    <div className="bs-years">
      <h4>歳運</h4>
      <table className="bs-table bs-year-table" aria-label="歳運">
        <tbody>
          {yearRows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{sheet.years.map((_, index) => <td key={index}>{value(index)}</td>)}</tr>)}
          <tr className="bs-mark-row"><th scope="row"><span className="bs-visually-hidden">記入欄</span></th>{sheet.years.map(year => <td key={year.year}>{year.void ? '空亡' : ''}</td>)}</tr>
        </tbody>
      </table>
      <span className="bs-note">※年齢は数え年で表示されています</span>
    </div>

    <div className={`bs-bottom ${showCalendar ? '' : 'is-memo-only'}`}>
      {showCalendar && <div className="bs-calendar">
        <span className="bs-calendar-title">{calendar.year}年{'\u3000'}{calendar.month}月{'\u3000'}{calendar.stem}{calendar.branch}</span>
        <table className="bs-table" aria-label={`${calendar.year}年${calendar.month}月の日運`}>
          <thead><tr>{WEEKDAYS.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>{calendarWeeks(calendar.days).map((week, row) => <tr key={row}>{week.map((day, column) => <td key={column}>{day && <>
            <span className="bs-day-top"><span>{day.stem}</span><span className="bs-day-number">{day.day}</span></span>
            <span>{day.branch}</span>
            <span>{day.tenGod}</span>
          </>}</td>)}</tr>)}</tbody>
        </table>
      </div>}
      <div className="bs-memo">
        <h4>メモ</h4>
        <div className="bs-memo-box" ref={memoBox} style={{ fontSize: `${memoFontSize(memo.length, !showCalendar)}pt` }}>{memo}</div>
        <div className="bs-appraiser">鑑定士：<span>{appraiser}</span></div>
      </div>
    </div>
  </section>;
}

export function BaziSheetPanel({ input, now = new Date() }: { input: BirthInput; now?: Date }) {
  const [name, setName] = useState('');
  const [appraiser, setAppraiser] = useState('');
  const [memo, setMemo] = useState('');
  const [firstYear, setFirstYear] = useState(String(now.getFullYear()));
  const [calendarMonth, setCalendarMonth] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  const [showCalendar, setShowCalendar] = useState(false);
  const [technical, setTechnical] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [circuitReady, setCircuitReady] = useState<boolean | null>(null);
  const [review, setReview] = useState<{ busy: boolean; error: string; result: CircuitResult | null; source: string }>({ busy: false, error: '', result: null, source: '' });
  const controller = useRef<AbortController | null>(null);
  const memoCapacity = showCalendar ? MEMO_CAPACITY.withCalendar : MEMO_CAPACITY.memoOnly;
  const computed = useMemo(() => {
    const [calendarYear, month] = calendarMonth.split('-').map(Number);
    try {
      return { sheet: buildBaziSheet(input, { firstYear: Number(firstYear), calendarYear: calendarYear!, calendarMonth: month! }), error: '' };
    } catch {
      return { sheet: null, error: '歳運の開始年と日運の年月は1900年から2100年の範囲で入力してください。' };
    }
  }, [input, firstYear, calendarMonth]);

  useEffect(() => {
    const abort = new AbortController();
    fetch(baziApiUrl('status'), { signal: abort.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('status')))
      .then(value => { if (!abort.signal.aborted) setCircuitReady(!!value.circuit); })
      .catch(() => { if (!abort.signal.aborted) setCircuitReady(false); });
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);

  useEffect(() => {
    // 印刷時だけ body 直下に個票を複製し、アプリ本体を印刷対象から外す。
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);

  const sheet = computed.sheet;
  const inputKey = JSON.stringify(input);
  const runReview = async () => {
    if (review.busy) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20 * 60_000);
    setReview({ busy: true, error: '', result: null, source: inputKey });
    try {
      const result = await requestYongshenCircuit(input, abort.signal);
      setMemo(buildSheetMemo(result, { maxChars: memoCapacity, technical }));
      setReview({ busy: false, error: '', result, source: inputKey });
    } catch (error) {
      setReview({ busy: false, result: null, source: inputKey,
        error: abort.signal.aborted ? 'AIレビューを中止しました。' : error instanceof Error ? error.message : 'AIレビューを取得できませんでした。' });
    } finally { clearTimeout(timeout); }
  };

  return <div className="bazi-sheet-panel">
    <div className="bazi-sheet-form">
      <label>お名前<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="個票に「様」を付けて表示" /></label>
      <label>鑑定士<input value={appraiser} maxLength={40} onChange={e => setAppraiser(e.target.value)} /></label>
      <label>歳運の開始年<input type="number" min="1900" max="2100" value={firstYear} onChange={e => setFirstYear(e.target.value)} /></label>
      <label>日運の年月<input type="month" min="1900-01" max="2100-12" value={calendarMonth} onChange={e => setCalendarMonth(e.target.value)} /></label>
      <label className="bazi-sheet-memo">メモ<textarea aria-label="メモ" maxLength={2000} value={memo} onChange={e => setMemo(e.target.value)} />
        <small>{memo.length}字／紙面に収まる目安 {memoCapacity}字{memo.length > memoCapacity ? '（超えた分は印刷時に切れます）' : ''}</small></label>
      <label className="bazi-sheet-toggle"><input type="checkbox" checked={showCalendar} onChange={e => setShowCalendar(e.target.checked)} />日運カレンダーを載せる（外すとメモ欄が下段いっぱいに広がります）</label>
      <label className="bazi-sheet-toggle"><input type="checkbox" checked={technical} onChange={e => setTechnical(e.target.checked)} />鑑定用の内訳（旺衰・格局・用神など）もメモに入れる</label>
      <div className="bazi-sheet-actions">
        <button type="button" className="bazi-primary" disabled={!sheet} onClick={() => window.print()}>印刷・PDFで保存</button>
        <button type="button" disabled={!sheet || review.busy || circuitReady === false} onClick={runReview}>AIレビューをメモ欄に入れる</button>
        {review.busy && <><span role="status">古典と照合しています。数分かかります。</span><button type="button" onClick={() => controller.current?.abort()}>中止</button></>}
        {!review.busy && <span>{circuitReady === false ? 'AIレビューは接続準備中です。個票は印刷できます。' : 'A4縦1枚で出力します。'}</span>}
      </div>
    </div>
    {review.error && <p role="alert" className="bazi-error">{review.error}</p>}
    {review.result && <details className="bazi-details" open>
      <summary>AIレビューの出典 {review.result.citedPassages.length}件（{review.result.trace.at(-1)?.model} / {review.result.corpus.origin === 'local-files' ? 'ローカルの古典' : '同梱の抜粋'}）</summary>
      {review.source !== inputKey && <p className="bazi-error">出生情報を変えました。メモ欄のレビューは変更前の命式のものです。</p>}
      <ul>{review.result.citedPassages.map(passage => <li key={passage.id}>『{passage.book}』{passage.title}（{passage.kind}）{passage.origin}{passage.lineStart > 0 ? `:${passage.lineStart}-${passage.lineEnd}` : ''}</li>)}</ul>
      <p>用神：{review.result.stages.integration?.yongshen.targets.join('・') || '保留'}（{review.result.stages.integration?.yongshen.method}）／適用した規則：{review.result.stages.integration?.appliedRuleIds.join('・')}／確度：{review.result.stages.integration?.confidence}</p>
      <p>メモ欄の文章は編集できます。全文はサーバーの応答に残ります。</p>
    </details>}
    {computed.error && <p role="alert" className="bazi-error">{computed.error}</p>}
    {sheet && <>
      <p className="bazi-caption">蔵干は節入りから{sheet.commandDay}日目の司令を太字で示します。身旺・身弱は点数でなく、このアプリの旺衰判定（{sheet.strengthLabel}）を表示します。</p>
      <div className="bazi-sheet-scroll"><BaziSheetView sheet={sheet} name={name} memo={memo} appraiser={appraiser} showCalendar={showCalendar} /></div>
      {printing && createPortal(<div className="bazi-print-root"><BaziSheetView sheet={sheet} name={name} memo={memo} appraiser={appraiser} showCalendar={showCalendar} /></div>, document.body)}
    </>}
  </div>;
}
