import { describe, expect, it } from 'vitest';

import { buildBaziChart, dayGanzhi, daysSinceMonthTerm, ganzhiAt } from './shichusuimei';
import { MEMO_CAPACITY, buildBaziSheet, buildSheetMemo, hiddenCommand, memoFontSize } from './shichusuimeiSheet';
import { circuitFixture } from '../test/circuitFixture';
import type { BirthInput } from './shichusuimeiTypes';

const summer: BirthInput = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };
const november2024 = { firstYear: 2024, calendarYear: 2024, calendarMonth: 11 };

describe('calendar helpers for the sheet', () => {
  it('gives civil-date day pillars, the same pillars as the chart, and days since the month term', () => {
    expect(dayGanzhi(2000, 1, 1)).toEqual({ stem: '戊', branch: '午' });
    expect(dayGanzhi(2024, 11, 1)).toEqual({ stem: '己', branch: '巳' });
    const parts = ganzhiAt(summer);
    expect(parts.stems.map((stem, index) => stem + parts.branches[index])).toEqual(buildBaziChart(summer).pillars.map(pillar => pillar.ganzhi));
    // 1990年の立夏（5月6日未明）から約9.5日。
    expect(daysSinceMonthTerm(summer)).toBeGreaterThan(9);
    expect(daysSinceMonthTerm(summer)).toBeLessThan(10);
  });
});

describe('hidden stem command by days since the term', () => {
  it('moves from residual to middle to main qi at each branch boundary', () => {
    expect(hiddenCommand('申', 7)).toEqual({ slots: ['庚', '壬', '戊'], activeIndex: 2 });
    expect(hiddenCommand('申', 8).activeIndex).toBe(1);
    expect(hiddenCommand('申', 14).activeIndex).toBe(1);
    expect(hiddenCommand('申', 15).activeIndex).toBe(0);
    expect(hiddenCommand('戌', 12)).toEqual({ slots: ['戊', '丁', '辛'], activeIndex: 1 });
    expect(hiddenCommand('戌', 13).activeIndex).toBe(0);
    expect(hiddenCommand('午', 10)).toEqual({ slots: ['丁', '己', '丙'], activeIndex: 2 });
    expect(hiddenCommand('午', 20).activeIndex).toBe(0);
  });

  it('repeats the main qi in the middle slot for branches without a middle qi', () => {
    expect(hiddenCommand('子', 10)).toEqual({ slots: ['癸', '癸', '壬'], activeIndex: 2 });
    expect(hiddenCommand('卯', 11)).toEqual({ slots: ['乙', '乙', '甲'], activeIndex: 1 });
    expect(hiddenCommand('酉', 21)).toEqual({ slots: ['辛', '辛', '庚'], activeIndex: 0 });
  });
});

describe('buildBaziSheet', () => {
  const sheet = buildBaziSheet(summer, november2024);

  it('lays out the natal chart hour to year with sheet names for ten gods and stages', () => {
    expect(sheet.pillars.map(pillar => pillar.label)).toEqual(['時柱', '日柱', '月柱', '年柱']);
    expect(sheet.pillars.map(pillar => `${pillar.stem}${pillar.branch}`)).toEqual(['癸未', '庚辰', '辛巳', '庚午']);
    expect(sheet.pillars.map(pillar => pillar.tenGod)).toEqual(['傷官', null, '敗財', '比肩']);
    expect(sheet.pillars.map(pillar => pillar.selfStage)).toEqual(['墓', null, '死', '沐浴']);
    expect(sheet.pillars.map(pillar => pillar.stage)).toEqual(['冠帯', '養', '長生', '沐浴']);
    const names = [sheet.pillars.map(pillar => pillar.tenGod), sheet.pillars.flatMap(pillar => pillar.hidden.map(hidden => hidden.tenGod)), sheet.luck.map(column => column.tenGod), sheet.years.map(column => column.tenGod)].flat().join(' ');
    expect(names).toContain('印綬');
    expect(names).not.toMatch(/劫財|正印|七殺/);
    expect([...sheet.luck, ...sheet.years].map(column => column.stage).join(' ')).not.toContain('臨官');
  });

  it('marks the commanding hidden stem of every branch from the same day count', () => {
    expect(sheet.commandDay).toBe(10);
    expect(sheet.pillars.map(pillar => pillar.hidden.map(hidden => hidden.active ? `[${hidden.stem}]` : hidden.stem).join(''))).toEqual([
      '己[乙]丁', '戊[癸]乙', '丙[庚]戊', '丁己[丙]',
    ]);
    expect(sheet.pillars.map(pillar => pillar.hidden.map(hidden => hidden.tenGod))).toEqual([
      ['印綬', '正財', '正官'], ['偏印', '傷官', '正財'], ['偏官', '比肩', '偏印'], ['正官', '印綬', '偏官'],
    ]);
  });

  it('counts the eight visible characters by element and keeps the chart strength label and void branches', () => {
    expect(sheet.elementCounts).toEqual({ 木: 0, 火: 2, 土: 2, 金: 3, 水: 1 });
    expect(sheet.strengthLabel).toBe(buildBaziChart(summer).strength.label);
    expect(sheet.voidBranches).toEqual(['申', '酉']);
  });

  it('starts major luck with the month pillar and labels each column by its last counted-age year', () => {
    expect(sheet.luck).toHaveLength(10);
    expect(sheet.luck[0]).toEqual({ year: 1996, age: 7, stem: '辛', tenGod: '敗財', branch: '巳', stage: '長生' });
    expect(sheet.luck[1]).toEqual({ year: 2006, age: 17, stem: '壬', tenGod: '食神', branch: '午', stage: '沐浴' });
    expect(sheet.luck[9]).toEqual({ year: 2086, age: 97, stem: '庚', tenGod: '比肩', branch: '寅', stage: '絶' });

    const reverse = buildBaziSheet({ ...summer, sex: 'female' }, november2024);
    expect(reverse.luck.slice(0, 3).map(column => `${column.year}~${column.age}${column.stem}${column.branch}`)).toEqual(['1992~3辛巳', '2002~13庚辰', '2012~23己卯']);
  });

  it('lists fifteen annual pillars with counted age and void-branch years', () => {
    expect(sheet.years).toHaveLength(15);
    expect(sheet.years[0]).toEqual({ year: 2024, age: 35, stem: '甲', tenGod: '偏財', branch: '辰', stage: '養', void: false });
    expect(sheet.years.filter(column => column.void).map(column => `${column.year}${column.stem}${column.branch}`)).toEqual(['2028戊申', '2029己酉']);
    expect(sheet.years.at(-1)).toMatchObject({ year: 2038, stem: '戊', branch: '午' });

    const unborn = buildBaziSheet({ ...summer, year: 2030 }, november2024);
    expect(unborn.years.slice(5, 7).map(column => column.age)).toEqual([null, 1]);
  });

  it('builds the daily calendar with weekdays, day pillars and the month pillar of that month', () => {
    const { calendar } = sheet;
    expect(`${calendar.stem}${calendar.branch}`).toBe('乙亥');
    expect(calendar.days).toHaveLength(30);
    expect(calendar.days[0]).toEqual({ day: 1, weekday: 5, stem: '己', branch: '巳', tenGod: '印綬' });
    expect(calendar.days[29]).toMatchObject({ day: 30, weekday: 6, stem: '戊', branch: '戌' });
    const january = buildBaziSheet(summer, { ...november2024, calendarYear: 2025, calendarMonth: 1 }).calendar;
    const february = buildBaziSheet(summer, { ...november2024, calendarYear: 2025, calendarMonth: 2 }).calendar;
    expect([`${january.stem}${january.branch}`, `${february.stem}${february.branch}`]).toEqual(['丁丑', '戊寅']);
    expect(buildBaziSheet(summer, { ...november2024, calendarYear: 2024, calendarMonth: 2 }).calendar.days).toHaveLength(29);
  });

  it('rejects out-of-range sheet options', () => {
    expect(() => buildBaziSheet(summer, { ...november2024, calendarMonth: 13 })).toThrow(RangeError);
    expect(() => buildBaziSheet(summer, { ...november2024, firstYear: 1800 })).toThrow(RangeError);
    expect(() => buildBaziSheet(summer, { ...november2024, calendarYear: Number.NaN })).toThrow(RangeError);
  });
});

describe('AI review in the memo box', () => {
  it('states the judgement in order: strength, which approach, then the actual yongshen', () => {
    const memo = buildSheetMemo(circuitFixture());
    const lines = memo.split('\n');
    expect(memo.length).toBeLessThanOrEqual(MEMO_CAPACITY.withCalendar);
    expect(lines[0]).toBe('① 強さ：（決め手に欠けるが）身強。夏の金で熱に押されるが、同じ金の仲間と土の支えがあり折れていない');
    expect(lines[1]).toBe('② 用神の取り方：調候。季節の偏り（夏の熱）を冷ますのが先。強弱の調整は決め手に欠けるため後回し');
    expect(lines[2]).toContain('③ 用神：壬・戊（一部ある）。');
    expect(lines[3]).toContain('④ 助けになるもの：金・水／避けたいもの：火。');
    expect(lines[4]).toContain('⑤ 生活では：1) 涼しい時間帯に予定を寄せる');
    expect(memo).toContain('参考にした古典：『窮通宝鑑』四月庚金');
    expect(memo).not.toMatch(/【旺衰】|【取用法】/);
  });

  it('adds the appraiser-facing breakdown after the conclusion when the technical option is on', () => {
    const memo = buildSheetMemo(circuitFixture(), { maxChars: MEMO_CAPACITY.memoOnly, technical: true });
    expect(memo.length).toBeLessThanOrEqual(MEMO_CAPACITY.memoOnly);
    expect(memo.indexOf('① 強さ')).toBeLessThan(memo.indexOf('【旺衰】'));
    expect(memo).toContain('【用神】壬・戊・丙（調候）');
    expect(memo).toContain('【取用法】格局:条件付き 丙');
    expect(memo).toContain('　（他の取り方：扶抑：強弱が決まらないので採らない）');
  });

  it('keeps the earlier steps rather than the later ones when the box is tight, and still works without the conclusion stage', () => {
    const tight = buildSheetMemo(circuitFixture(), { maxChars: 150 });
    expect(tight.length).toBeLessThanOrEqual(150);
    expect(tight).toContain('① 強さ');
    expect(tight).toContain('② 用神の取り方');
    expect(tight).not.toContain('⑤ 生活では');
    const partial = circuitFixture();
    const withoutPlain = buildSheetMemo({ ...partial, stages: { strength: partial.stages.strength } }, { technical: true });
    expect(withoutPlain).toContain('【旺衰】');
    expect(withoutPlain).not.toContain('① 強さ');
  });
});

describe('memo sizing', () => {
  it('writes a fuller review when the calendar is dropped and the box takes the whole bottom row', () => {
    const narrow = buildSheetMemo(circuitFixture());
    const wide = buildSheetMemo(circuitFixture(), { maxChars: MEMO_CAPACITY.memoOnly });
    expect(narrow.length).toBeLessThanOrEqual(MEMO_CAPACITY.withCalendar);
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length);
    expect(wide).toContain('まだ決まっていないこと：');
  });

  it('steps the printed font down as the memo grows, and further in the narrow box', () => {
    expect(memoFontSize(400, true)).toBe(10);
    expect(memoFontSize(520, true)).toBe(9);
    expect(memoFontSize(650, true)).toBe(8);
    expect(memoFontSize(780, true)).toBe(7.5);
    expect(memoFontSize(280, false)).toBe(8.5);
    expect(memoFontSize(370, false)).toBe(8);
    expect(memoFontSize(430, false)).toBe(7.5);
    expect(memoFontSize(600, false)).toBe(7);
  });
});
