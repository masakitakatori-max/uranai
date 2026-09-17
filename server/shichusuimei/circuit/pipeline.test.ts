import { describe, expect, it } from 'vitest';
import { bundledCorpus } from '../classics/corpus';
import { CircuitValidationError, runYongshenCircuit, type StageRunner, type StageTask } from './pipeline';
import type { StageName } from '../../../src/lib/shichusuimeiCircuit';

const person = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' as const };
const corpus = bundledCorpus();
type Seed = { id: string; text: string };
type Prompt = { stage: StageName; seedPassages: Seed[]; rules?: unknown[]; retry?: { issues: string[] } };
type Behavior = (task: StageTask, prompt: Prompt, attempt: number) => unknown;

const cite = (passage: Seed) => ({ passageId: passage.id, quote: passage.text.replace(/\s+/g, '').slice(0, 12) });
const tool = (task: StageTask, name: string) => task.tools.find(item => item.name === name)!;
const empty = (method: string) => ({ method, status: '該当なし', targets: [], reason: '当てはまらない', conditions: [], obstacles: [], citations: [], factIds: [] });

const defaults: Record<StageName, Behavior> = {
  strength: (_task, prompt) => ({ verdict: '身旺', scoreAssessment: '点数3の身旺に同意する', reason: '月令と通根から身旺寄り', citations: [cite(prompt.seedPassages[0]!)], factIds: ['a-day-s', 'a-month-b'], uncertainties: [] }),
  pattern: (_task, prompt) => ({ pattern: { name: '七殺格', status: '条件付き', reason: '月令巳の本気丙' }, special: { kind: '通常格', status: '否定', reason: '根がある' },
    citations: [cite(prompt.seedPassages[0]!)], factIds: ['a-month-b'], uncertainties: ['子平真詮は抜粋のみ'] }),
  methods: async (task, prompt) => {
    const hits = JSON.parse(await tool(task, 'search_classics').run({ query: '四月庚金', book: '窮通宝鑑' })) as { id: string }[];
    const passage = JSON.parse(await tool(task, 'read_passage').run({ id: hits[0]!.id })) as Seed;
    return { methods: [
      { ...empty('格局'), status: '保留', reason: '子平真詮の本文が不足' },
      { method: '扶抑', status: '条件付き', targets: ['火', '水'], reason: '身旺を抑える', conditions: ['火が金を傷めない'], obstacles: [], citations: [cite(prompt.seedPassages[0]!)], factIds: ['a-day-s'] },
      empty('病薬'),
      { method: '調候', status: '採用候補', targets: ['壬'], reason: '夏の金を潤す', conditions: [], obstacles: [], citations: [cite(passage)], factIds: ['a-month-b'] },
      empty('通関'),
    ] };
  },
  plain: () => ({
    strength: { verdict: '身強', confident: false, plain: '夏の金だが仲間の金と土の支えがあり折れていない' },
    approach: { method: '調候', plain: '季節の熱を冷ますのが先', alternatives: ['扶抑：強弱が決まらないので採らない'] },
    yongshen: { targets: ['壬'], inChart: '命式にない', plain: '熱を冷ます水。表には出ていない' },
    helpAvoid: { help: ['金'], avoid: ['火'], plain: '水を生む金は助けになる' },
    daily: ['涼しい時間に予定を寄せる', '熱がこもる前に休む'], unsettled: '強い側かは決め切れていません。',
  }),
  integration: (_task, prompt) => ({
    summary: '調候の壬を用神とし、扶抑の火は条件付きで併記する。', yongshen: { method: '調候', targets: ['壬'], reason: '夏の庚金を潤す' },
    xishen: ['金'], jishen: ['火'], successFailure: { status: '救応あり', rescuers: ['壬'], reason: '壬が火を制する' },
    conflicts: [{ methods: ['扶抑', '調候'], resolution: '格局が定まらないため調候を優先', ruleId: 'R4' }], appliedRuleIds: ['R4', 'R5'], confidence: '中',
    citations: [cite(prompt.seedPassages[0]!)], factIds: ['a-day-s'], uncertainties: [],
  }),
};

function fakeRunner(overrides: Partial<Record<StageName, Behavior>> = {}) {
  const calls: StageTask[] = [];
  const run: StageRunner = async task => {
    calls.push(task);
    const attempt = calls.filter(call => call.stage === task.stage).length;
    const output = await (overrides[task.stage] ?? defaults[task.stage])(task, JSON.parse(task.prompt) as Prompt, attempt);
    return { output, model: 'fake-model', provider: 'test', usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 2, cacheWriteTokens: 1, estimatedUsd: 0.01 } };
  };
  return { run, calls };
}

describe('yongshen circuit', () => {
  it('runs the five stages in order with the same system prompt and records seeds, tool calls and cited passages', async () => {
    const { run, calls } = fakeRunner();
    const result = await runYongshenCircuit(person, { run, corpus });
    expect(calls.map(call => call.stage)).toEqual(['strength', 'pattern', 'methods', 'integration', 'plain']);
    expect(new Set(calls.map(call => call.system)).size).toBe(1);
    expect(Object.keys(result.stages)).toEqual(['strength', 'pattern', 'methods', 'integration', 'plain']);
    expect(result.stages.plain?.strength.verdict).toBe('身強');
    expect(result.trace.every(entry => entry.ms >= 0)).toBe(true);
    expect(result.facts.strength).toMatchObject({ total: 3, label: '身旺' });
    const methods = result.trace.find(entry => entry.stage === 'methods')!;
    expect(methods.seedPassageIds).toContain('qt-590');
    expect(methods.toolCalls.map(call => call.name)).toEqual(['search_classics', 'read_passage']);
    expect(methods.usage).toMatchObject({ inputTokens: 10, estimatedUsd: 0.01 });
    expect(result.citedPassages.map(passage => passage.id)).toContain('qt-590');
    expect(result.citedPassages[0]).not.toHaveProperty('text');
    expect(result.corpus.origin).toBe('bundled-excerpts');
  });

  it('passes earlier conclusions forward and gives the integration stage the fixed rules and the cited passages', async () => {
    const { run, calls } = fakeRunner();
    await runYongshenCircuit(person, { run, corpus });
    const [strength, , , integration, plain] = calls.map(call => JSON.parse(call.prompt) as Prompt & { previous: Record<string, unknown> });
    expect(Object.keys(plain!.previous)).toEqual(['strength', 'pattern', 'methods', 'integration']);
    expect(plain!.seedPassages).toEqual([]);
    expect(strength!.rules).toBeUndefined();
    expect(Object.keys(integration!.previous)).toEqual(['strength', 'pattern', 'methods']);
    expect(integration!.rules).toHaveLength(7);
    expect(integration!.seedPassages.map(seed => seed.id)).toContain('qt-590');
  });

  it('retries once with the validation issues when a passage was cited without being read', async () => {
    const { run, calls } = fakeRunner({
      strength: async (task, prompt, attempt) => {
        const unread = { id: 'qt-606', text: corpus.passages.find(passage => passage.id === 'qt-606')!.text };
        if (attempt === 2) await tool(task, 'read_passage').run({ id: 'qt-606' });
        return { ...(defaults.strength(task, prompt, attempt) as object), citations: [cite(unread)] };
      },
    });
    const result = await runYongshenCircuit(person, { run, corpus, stopAfter: 'strength' });
    expect(result.trace[0]).toMatchObject({ stage: 'strength', attempts: 2 });
    expect((JSON.parse(calls[1]!.prompt) as Prompt).retry?.issues.join()).toContain('本文を読んでいない節 qt-606');
    expect(calls).toHaveLength(2);
  });

  it('fails the stage when a quote does not appear in the passage or the output shape is invalid', async () => {
    const badQuote = fakeRunner({ strength: (task, prompt, attempt) => ({ ...(defaults.strength(task, prompt, attempt) as object), citations: [{ passageId: prompt.seedPassages[0]!.id, quote: '本文に存在しない引用句' }] }) });
    const error = await runYongshenCircuit(person, { run: badQuote.run, corpus }).catch(caught => caught);
    expect(error).toBeInstanceOf(CircuitValidationError);
    expect(error).toMatchObject({ stage: 'strength' });
    expect(error.issues.join()).toContain('見つからない');
    expect(badQuote.calls).toHaveLength(2);

    const badShape = fakeRunner({ strength: () => ({ verdict: '最強' }) });
    const shapeError = await runYongshenCircuit(person, { run: badShape.run, corpus }).catch(caught => caught);
    expect(shapeError.issues.join()).toContain('verdict');
  });

  it('enforces R7 while the 子平真詮 text is only excerpted', async () => {
    const { run } = fakeRunner({ pattern: (task, prompt, attempt) => ({ ...(defaults.pattern(task, prompt, attempt) as object), pattern: { name: '七殺格', status: '成立', reason: '断定' } }) });
    const error = await runYongshenCircuit(person, { run, corpus }).catch(caught => caught);
    expect(error).toMatchObject({ stage: 'pattern' });
    expect(error.issues.join()).toContain('R7');
  });

  it('requires the chosen yongshen method to be active in the methods stage and R5 for recorded conflicts', async () => {
    const inactive = fakeRunner({ integration: (task, prompt, attempt) => ({ ...(defaults.integration(task, prompt, attempt) as object), yongshen: { method: '病薬', targets: ['水'], reason: '偏りを制する' } }) });
    const inactiveError = await runYongshenCircuit(person, { run: inactive.run, corpus }).catch(caught => caught);
    expect(inactiveError.issues.join()).toContain('病薬は、前段で採用候補・条件付きになっていない');

    const withoutR5 = fakeRunner({ integration: (task, prompt, attempt) => ({ ...(defaults.integration(task, prompt, attempt) as object), appliedRuleIds: ['R4'] }) });
    const ruleError = await runYongshenCircuit(person, { run: withoutR5.run, corpus }).catch(caught => caught);
    expect(ruleError.issues.join()).toContain('R5');
  });

  it('sends the plain-language stage back when it still speaks in technical terms', async () => {
    const { run } = fakeRunner({ plain: (task, prompt, attempt) => ({ ...(defaults.plain(task, prompt, attempt) as object),
      strength: { verdict: '身弱', confident: true, plain: '日主が月令に通根せず蔵干も薄い' } }) });
    const error = await runYongshenCircuit(person, { run, corpus }).catch(caught => caught);
    expect(error).toMatchObject({ stage: 'plain' });
    expect(error.issues.join()).toContain('専門用語が残っている（日主・月令・蔵干・通根）');
  });

  it('rejects invalid birth input and an aborted request before calling the model', async () => {
    const { run, calls } = fakeRunner();
    await expect(runYongshenCircuit({ ...person, month: 13 }, { run, corpus })).rejects.toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(runYongshenCircuit(person, { run, corpus, signal: controller.signal })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});
