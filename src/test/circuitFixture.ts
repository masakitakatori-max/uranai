import { buildBaziChart } from '../lib/shichusuimei';
import { CIRCUIT_VERSION, type CircuitResult } from '../lib/shichusuimeiCircuit';
import { buildYongshenFacts } from '../lib/shichusuimeiYongshen';
import type { BirthInput } from '../lib/shichusuimeiTypes';

const person: BirthInput = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' };

/** 実行済みの回路の応答を模した検査用データ（本文は実際の古典から取った短い引用）。 */
export function circuitFixture(overrides: Partial<CircuitResult> = {}): CircuitResult {
  return {
    version: CIRCUIT_VERSION, input: person, facts: buildYongshenFacts(buildBaziChart(person)),
    stages: {
      strength: { verdict: '判定保留', scoreAssessment: '点数+3は身旺だが月令が扶けない側で拮抗する', reason: '月令巳の本気丙は日主庚を扶けない側にあり、通根は巳中の庚一つで軽い（dt-1202）。',
        citations: [{ passageId: 'dt-1202', quote: '令を得れば旺' }], factIds: ['a-month-b'], uncertainties: ['三会火局の成否が未判定'] },
      pattern: { pattern: { name: '七殺格', status: '条件付き', reason: '月令巳の本気丙は透干していない（zp-yongshen）。' },
        special: { kind: '従格', status: '否定', reason: '比劫が透干し根も残る。' },
        citations: [{ passageId: 'zp-yongshen', quote: '八字用神' }], factIds: ['a-month-b'], uncertainties: [] },
      methods: { methods: [
        { method: '格局', status: '条件付き', targets: ['丙'], reason: '三会の成否待ち', conditions: ['巳午未三会が成立するかの確認'], obstacles: [], citations: [{ passageId: 'zp-yongshen', quote: '八字用神' }], factIds: ['a-month-b'] },
        { method: '扶抑', status: '条件付き', targets: ['火', '水'], reason: '旺衰が保留のため向きを決められない', conditions: [], obstacles: [], citations: [{ passageId: 'dt-1202', quote: '令を得れば旺' }], factIds: ['a-day-s'] },
        { method: '病薬', status: '該当なし', targets: [], reason: '突出した一行がない', conditions: [], obstacles: [], citations: [], factIds: [] },
        { method: '調候', status: '採用候補', targets: ['壬', '戊', '丙'], reason: '夏の庚金は壬で中和する', conditions: [], obstacles: [], citations: [{ passageId: 'qt-590', quote: '四月の庚金' }], factIds: ['a-month-b'] },
        { method: '通関', status: '採用候補', targets: ['土'], reason: '火と金の間を土が取り持つ', conditions: [], obstacles: [], citations: [{ passageId: 'dt-1214', quote: '通関' }], factIds: ['a-year-b'] },
      ] },
      integration: { summary: '格局と扶抑が決まらないため調候をタイブレーカーに採る。', yongshen: { method: '調候', targets: ['壬', '戊', '丙'], reason: '窮通宝鑑「四月庚金」（qt-590）の壬・戊・丙を採る。' },
        xishen: ['庚', '辛'], jishen: ['木', '丁'], successFailure: { status: '保留', rescuers: ['癸'], reason: '制殺と資扶が拮抗する。' },
        conflicts: [{ methods: ['格局', '扶抑'], resolution: '両者とも条件付きのため優劣を決めない', ruleId: 'R5' }],
        appliedRuleIds: ['R1', 'R4', 'R5', 'R7'], confidence: '中',
        citations: [{ passageId: 'qt-590', quote: '四月の庚金' }], factIds: ['a-month-b'], uncertainties: ['三会火局の成否が未判定'] },
      plain: {
        strength: { verdict: '身強', confident: false, plain: '夏の金で熱に押されるが、同じ金の仲間と土の支えがあり折れていない' },
        approach: { method: '調候', plain: '季節の偏り（夏の熱）を冷ますのが先。強弱の調整は決め手に欠けるため後回し', alternatives: ['扶抑：強弱が決まらないので採らない'] },
        yongshen: { targets: ['壬', '戊'], inChart: '一部ある', plain: '熱を冷ます水（壬）と、その水を受ける土（戊）。水は表に出ておらず、代わりになる癸があるかを見る' },
        helpAvoid: { help: ['金', '水'], avoid: ['火'], plain: '水を生む金は助けになり、熱を足す火は避けたい' },
        daily: ['涼しい時間帯に予定を寄せる', '熱がこもる前に休む'],
        unsettled: '強い側か支えが要る側かは決め切れていません。',
      },
    },
    citedPassages: [
      { id: 'dt-1202', book: '滴天髄', title: '要約 / 第19章 衰旺（強弱の判定）', kind: 'ローカル要約（原文ではない）', origin: '滴天髄_和訳.md', lineStart: 1202, lineEnd: 1205 },
      { id: 'zp-yongshen', book: '子平真詮', title: '論用神', kind: '沈孝瞻本文・抜粋', origin: 'ziping', lineStart: 1, lineEnd: 2 },
      { id: 'qt-590', book: '窮通宝鑑', title: '庚金総論 / 四月庚金', kind: '和訳', origin: '穷通宝鉴_和訳.md', lineStart: 590, lineEnd: 593 },
      { id: 'dt-1214', book: '滴天髄', title: '要約 / 第22章 通関', kind: 'ローカル要約（原文ではない）', origin: '滴天髄_和訳.md', lineStart: 1214, lineEnd: 1217 },
    ],
    corpus: { origin: 'local-files', books: { 滴天髄: 203, 窮通宝鑑: 115, 子平真詮: 2 } },
    trace: [{ stage: 'integration', attempts: 1, ms: 42000, model: 'claude-sonnet-5', provider: 'Claude Agent SDK', usage: { inputTokens: 12, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedUsd: 0.18 }, seedPassageIds: ['qt-590'], toolCalls: [] }],
    generatedAt: '2026-09-17T00:00:00.000Z', ...overrides,
  };
}
