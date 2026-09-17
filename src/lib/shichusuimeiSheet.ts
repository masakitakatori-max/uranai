import { BRANCHES, ELEMENTS, STEMS, buildBaziChart, dayGanzhi, daysSinceMonthTerm, ganzhiAt, stageOf, tenGod } from './shichusuimei';
import type { CircuitResult } from './shichusuimeiCircuit';
import type { BirthInput, Branch, Element, Stem } from './shichusuimeiTypes';

// 鑑定個票の書式。命式の計算は buildBaziChart と同じ規約で、表示の呼び名と蔵干の司令だけを個票側で持つ。

const SHEET_TEN_GOD_NAMES: Readonly<Record<string, string>> = { 劫財: '敗財', 正印: '印綬', 七殺: '偏官' };

export function sheetTenGod(dayMaster: Stem, stem: Stem): string {
  const name = tenGod(dayMaster, stem);
  return SHEET_TEN_GOD_NAMES[name] ?? name;
}

export function sheetStage(stem: Stem, branch: Branch): string {
  const name = stageOf(stem, branch);
  return name === '臨官' ? '建禄' : name;
}

interface HiddenCommand { slots: readonly [Stem, Stem, Stem]; residualUntil: number; middleUntil: number }

// 蔵干深浅。表示順は本気・中気・余気。節入り当日を1日目とし、余気→中気→本気の順に司令が移る。
// 中気を持たない子・卯・酉は中気欄にも本気の干を置く（個票の書式どおり）。
const HIDDEN_COMMAND: Readonly<Record<Branch, HiddenCommand>> = {
  子: { slots: ['癸', '癸', '壬'], residualUntil: 10, middleUntil: 20 },
  丑: { slots: ['己', '辛', '癸'], residualUntil: 9, middleUntil: 12 },
  寅: { slots: ['甲', '丙', '戊'], residualUntil: 7, middleUntil: 14 },
  卯: { slots: ['乙', '乙', '甲'], residualUntil: 10, middleUntil: 20 },
  辰: { slots: ['戊', '癸', '乙'], residualUntil: 9, middleUntil: 12 },
  巳: { slots: ['丙', '庚', '戊'], residualUntil: 7, middleUntil: 14 },
  午: { slots: ['丁', '己', '丙'], residualUntil: 10, middleUntil: 19 },
  未: { slots: ['己', '乙', '丁'], residualUntil: 9, middleUntil: 12 },
  申: { slots: ['庚', '壬', '戊'], residualUntil: 7, middleUntil: 14 },
  酉: { slots: ['辛', '辛', '庚'], residualUntil: 10, middleUntil: 20 },
  戌: { slots: ['戊', '丁', '辛'], residualUntil: 9, middleUntil: 12 },
  亥: { slots: ['壬', '甲', '戊'], residualUntil: 7, middleUntil: 14 },
};

/** 地支の蔵干3欄（本気・中気・余気）と、節入りから dayNumber 日目に司令している欄の位置。 */
export function hiddenCommand(branch: Branch, dayNumber: number): { slots: readonly [Stem, Stem, Stem]; activeIndex: 0 | 1 | 2 } {
  const table = HIDDEN_COMMAND[branch];
  const activeIndex = dayNumber <= table.residualUntil ? 2 : dayNumber <= table.middleUntil ? 1 : 0;
  return { slots: table.slots, activeIndex };
}

export interface SheetHiddenSlot { stem: Stem; tenGod: string; active: boolean }
export interface SheetPillar {
  key: 'hour' | 'day' | 'month' | 'year'; label: string;
  stem: Stem; stemElement: Element; tenGod: string | null; selfStage: string | null;
  branch: Branch; hidden: readonly SheetHiddenSlot[]; stage: string;
}
export interface SheetLuckColumn { year: number; age: number | null; stem: Stem; tenGod: string; branch: Branch; stage: string }
export interface SheetYearColumn extends SheetLuckColumn { void: boolean }
export interface SheetCalendarDay { day: number; weekday: number; stem: Stem; branch: Branch; tenGod: string }
export interface BaziSheet {
  input: BirthInput; dayMaster: Stem;
  pillars: readonly SheetPillar[];
  elementCounts: Readonly<Record<Element, number>>;
  strengthLabel: string; voidBranches: readonly Branch[]; commandDay: number;
  luck: readonly SheetLuckColumn[];
  years: readonly SheetYearColumn[];
  calendar: { year: number; month: number; stem: Stem; branch: Branch; days: readonly SheetCalendarDay[] };
}
export interface SheetOptions { firstYear: number; calendarYear: number; calendarMonth: number }

const LUCK_COLUMNS = 10;
const YEAR_COLUMNS = 15;

function modulo(value: number, base: number): number {
  return ((value % base) + base) % base;
}

function yearGanzhi(year: number): { stem: Stem; branch: Branch } {
  return { stem: STEMS[modulo(year - 4, 10)]!, branch: BRANCHES[modulo(year - 4, 12)]! };
}

function validateOptions(options: SheetOptions): void {
  for (const [name, year] of [['firstYear', options.firstYear], ['calendarYear', options.calendarYear]] as const) {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new RangeError(`${name} must be an integer from 1900 through 2100`);
  }
  if (!Number.isInteger(options.calendarMonth) || options.calendarMonth < 1 || options.calendarMonth > 12) {
    throw new RangeError('calendarMonth must be an integer from 1 through 12');
  }
}

export function buildBaziSheet(input: BirthInput, options: SheetOptions): BaziSheet {
  validateOptions(options);
  const chart = buildBaziChart(input);
  const dayMaster = chart.dayMaster;
  const commandDay = Math.floor(daysSinceMonthTerm(input)) + 1;
  const [year, month, day, hour] = chart.pillars;
  const ordered = [['hour', hour!], ['day', day!], ['month', month!], ['year', year!]] as const;
  const pillars = ordered.map(([key, pillar]): SheetPillar => {
    const command = hiddenCommand(pillar.branch, commandDay);
    return {
      key, label: pillar.label,
      stem: pillar.stem, stemElement: pillar.element,
      tenGod: key === 'day' ? null : sheetTenGod(dayMaster, pillar.stem),
      selfStage: key === 'day' ? null : sheetStage(pillar.stem, pillar.branch),
      branch: pillar.branch,
      hidden: command.slots.map((stem, index) => ({ stem, tenGod: sheetTenGod(dayMaster, stem), active: index === command.activeIndex })),
      stage: sheetStage(dayMaster, pillar.branch),
    };
  });

  const elementCounts = Object.fromEntries(ELEMENTS.map(element => [element, 0])) as Record<Element, number>;
  for (const pillar of chart.pillars) {
    elementCounts[pillar.element] += 1;
    elementCounts[pillar.hidden.find(hidden => hidden.main)!.element] += 1;
  }

  // 月柱を立運までの欄とし、以後10年ごと。年齢は数え年で、その欄が終わる歳と西暦を示す。
  const startAge = Math.max(1, Math.round(chart.luck[0]!.startAge));
  const step = chart.direction === '順行' ? 1 : -1;
  const luck = Array.from({ length: LUCK_COLUMNS }, (_, index): SheetLuckColumn => {
    const stem = STEMS[modulo(STEMS.indexOf(month!.stem) + step * index, 10)]!;
    const branch = BRANCHES[modulo(BRANCHES.indexOf(month!.branch) + step * index, 12)]!;
    const age = startAge + 10 * index;
    return { year: input.year + age - 1, age, stem, tenGod: sheetTenGod(dayMaster, stem), branch, stage: sheetStage(dayMaster, branch) };
  });

  const years = Array.from({ length: YEAR_COLUMNS }, (_, index): SheetYearColumn => {
    const value = options.firstYear + index;
    const { stem, branch } = yearGanzhi(value);
    const age = value - input.year + 1;
    return {
      year: value, age: age >= 1 ? age : null, stem, tenGod: sheetTenGod(dayMaster, stem), branch,
      stage: sheetStage(dayMaster, branch), void: chart.voidBranches.includes(branch),
    };
  });

  const { calendarYear, calendarMonth } = options;
  // 節入りは毎月上旬なので、15日の月柱をその暦月の月干支とする。
  const monthParts = ganzhiAt({ ...input, year: calendarYear, month: calendarMonth, day: 15, hour: 12, minute: 0 });
  const length = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate();
  const days = Array.from({ length }, (_, index): SheetCalendarDay => {
    const date = index + 1;
    const { stem, branch } = dayGanzhi(calendarYear, calendarMonth, date);
    return { day: date, weekday: new Date(Date.UTC(calendarYear, calendarMonth - 1, date)).getUTCDay(), stem, branch, tenGod: sheetTenGod(dayMaster, stem) };
  });

  return {
    input: { ...input }, dayMaster, pillars, elementCounts,
    strengthLabel: chart.strength.label, voidBranches: chart.voidBranches, commandDay,
    luck, years,
    calendar: { year: calendarYear, month: calendarMonth, stem: monthParts.stems[1], branch: monthParts.branches[1], days },
  };
}

const PASSAGE_ID = /[（(]?\b(?:dt|qt|zp|src\d+)-[A-Za-z0-9\u4E00-\u9FFF-]+[）)]?/g;

/** メモ枠に収まる目安の字数。カレンダーを外すと下段いっぱいを使えるので増える。 */
export const MEMO_CAPACITY = { withCalendar: 330, memoOnly: 780 } as const;

/** 字数と枠の広さから紙面の文字サイズ（pt）を決める。 */
export function memoFontSize(chars: number, memoOnly: boolean): number {
  // 枠の実測（メモのみ709×262px／カレンダー併記368×262px、行間1.55）に約7%の余裕を見た段階。
  const steps: readonly [number, number][] = memoOnly
    ? [[420, 10], [520, 9], [650, 8]]
    : [[290, 8.5], [380, 8], [440, 7.5]];
  return steps.find(([limit]) => chars <= limit)?.[1] ?? (memoOnly ? 7.5 : 7);
}

function clip(value: string, limit: number): string {
  const text = value.replace(PASSAGE_ID, '').replace(/\s+/g, ' ').replace(/（\s*）|\(\s*\)/g, '').trim();
  if (text.length <= limit) return text;
  // 文の途中で切れた語尾が残らないよう、収まる範囲の最後の句点で切る。
  const sentence = text.slice(0, limit).lastIndexOf('。');
  return sentence >= limit * 0.5 ? text.slice(0, sentence + 1) : `${text.slice(0, limit - 1)}…`;
}

export interface SheetMemoOptions { maxChars?: number; technical?: boolean }

/**
 * 回路の判定を個票のメモ欄の文章にする。
 * 先頭は占いを知らない人向けの結論で、鑑定用の内訳は technical を指定したときだけ足す。
 * 入り切らないときは優先度の低い行から落とす。編集できる下書きであり、判断の正本は回路の出力側。
 */
export function buildSheetMemo(result: CircuitResult, options: SheetMemoOptions = {}): string {
  const maxChars = options.maxChars ?? MEMO_CAPACITY.withCalendar;
  const { strength, pattern, methods, integration, plain } = result.stages;
  const wide = maxChars >= 600;
  const long = (short: number, full: number) => (wide ? full : short);
  const lines: { priority: number; text: string }[] = [];
  const add = (priority: number, text: string | null | undefined) => { if (text) lines.push({ priority, text }); };

  if (plain) {
    const confidence = plain.strength.confident ? '' : '（決め手に欠けるが）';
    add(1, `① 強さ：${confidence}${plain.strength.verdict}。${clip(plain.strength.plain, long(60, 90))}`);
    add(1, `② 用神の取り方：${plain.approach.method}。${clip(plain.approach.plain, long(60, 90))}`);
    add(6, plain.approach.alternatives.length ? `\u3000（他の取り方：${plain.approach.alternatives.join('／')}）` : null);
    add(1, `③ 用神：${plain.yongshen.targets.join('・')}（${plain.yongshen.inChart}）。${clip(plain.yongshen.plain, long(70, 120))}`);
    add(3, `④ 助けになるもの：${plain.helpAvoid.help.join('・') || 'なし'}／避けたいもの：${plain.helpAvoid.avoid.join('・') || 'なし'}。${clip(plain.helpAvoid.plain, long(50, 90))}`);
    add(2, plain.daily.length ? `⑤ 生活では：${plain.daily.map((item, index) => `${index + 1}) ${item}`).join('\u3000')}` : null);
    add(5, plain.unsettled ? `まだ決まっていないこと：${clip(plain.unsettled, 90)}` : null);
  }

  if (options.technical) {
    add(6, strength && `【旺衰】${strength.verdict}（機械点数 ${result.facts.strength.total >= 0 ? '+' : ''}${result.facts.strength.total}）${clip(strength.reason, long(55, 150))}`);
    add(7, pattern && `【格局】${pattern.pattern.name}・${pattern.pattern.status}／${pattern.special.kind}は${pattern.special.status}`);
    add(8, methods && `【取用法】${methods.methods.map(entry => `${entry.method}:${entry.status}${entry.targets.length ? ` ${entry.targets.join('・')}` : ''}`).join('／')}`);
    if (integration) {
      add(6, `【用神】${integration.yongshen.targets.join('・') || '保留'}（${integration.yongshen.method}）${clip(integration.yongshen.reason, long(60, 150))}`);
      add(8, `【喜神】${integration.xishen.join('・') || 'なし'}${'\u3000'}【忌神】${integration.jishen.join('・') || 'なし'}${'\u3000'}【成敗】${integration.successFailure.status}`);
      integration.conflicts.slice(0, 1).forEach(conflict => add(9, `【対立】${conflict.methods.join('と')}：${clip(conflict.resolution, long(40, 120))}（${conflict.ruleId}）`));
    }
    const condition = methods?.methods.flatMap(entry => entry.conditions.map(item => `${entry.method}：${item}`))[0];
    add(9, condition ? `【条件】${clip(condition, long(50, 110))}` : null);
  }

  // 出典は最終段で引いた節を先に並べる。
  const order = new Map(result.citedPassages.map((passage, index) => [passage.id, index]));
  const preferred = [...new Set((integration?.citations ?? []).map(citation => citation.passageId))].filter(id => order.has(id));
  const ranked = [...preferred, ...result.citedPassages.map(passage => passage.id).filter(id => !preferred.includes(id))];
  const shown = ranked.slice(0, wide ? 3 : 2).map(id => result.citedPassages[order.get(id)!]!).map(passage => `『${passage.book}』${passage.title.split(' / ').at(-1)}`);
  add(4, shown.length ? `参考にした古典：${shown.join('、')}${ranked.length > shown.length ? ` ほか${ranked.length - shown.length}件` : ''}` : null);
  add(4, '※古典と照らしてAIがまとめた暫定の見立てです。');

  // 優先度の高い行が入らなかったら、それより低い行は載せない（結論より先に枝葉が残らないように）。
  const kept = new Set<number>();
  let total = 0;
  let blocked = Number.POSITIVE_INFINITY;
  for (const index of lines.map((_line, position) => position).sort((a, b) => lines[a]!.priority - lines[b]!.priority)) {
    const { priority, text } = lines[index]!;
    if (priority > blocked) continue;
    if (total + text.length + 1 > maxChars) { blocked = priority; continue; }
    kept.add(index); total += text.length + 1;
  }
  return lines.filter((_line, index) => kept.has(index)).map(line => line.text).join('\n');
}
