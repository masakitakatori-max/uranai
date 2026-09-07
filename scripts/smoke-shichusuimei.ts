import { writeFileSync, mkdirSync } from 'node:fs';
import { interpretBazi } from '../server/shichusuimei/service';
import { createAnthropicRunner } from '../server/shichusuimei/anthropic';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');
const person = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, utcOffset: 9, sex: 'male' as const };
const run = createAnthropicRunner(apiKey, process.env.SHICHUSUIMEI_MODEL);
mkdirSync('test-results/shichusuimei-live', { recursive: true });
for (const request of [
  { person, focus: 'yongshen' as const, luckIndex: 0, question: '' },
  { person, partner: { ...person, month: 1, sex: 'female' as const }, focus: 'compatibility' as const, question: '' },
]) {
  const result = await interpretBazi(request, run, AbortSignal.timeout(180_000));
  writeFileSync(`test-results/shichusuimei-live/${request.focus}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ focus: request.focus, validated: true, model: result.model, purposes: result.interpretation.yongshen.length, sources: result.sources.length, usage: result.usage }));
}
