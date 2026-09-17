import { loadClassicsCorpus } from '../server/shichusuimei/classics/load';
import { prepareCircuit, runYongshenCircuit, seedPassages, stagePrompt } from '../server/shichusuimei/circuit/pipeline';
import { createAgentSdkStageRunner, createApiStageRunner } from '../server/shichusuimei/circuit/runners';
import { STAGES, type StageName } from '../src/lib/shichusuimeiCircuit';

// 用神判定回路を端末から試す。--dry はモデルを呼ばず、第0段の候補と各段に渡す資料だけを表示する。
// 例: npm run shichusuimei:circuit -- 1990-05-15T14:30 male --dry
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const [when, sex] = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.match(/^--(offset|classics|stage|effort)$/));
const match = when?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
if (!match || (sex !== 'male' && sex !== 'female')) {
  console.error('使い方: npm run shichusuimei:circuit -- YYYY-MM-DDTHH:MM male|female [--offset 9] [--classics DIR] [--stage strength|pattern|methods|integration] [--effort low|medium|high] [--dry]');
  process.exit(1);
}
const person = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]), utcOffset: Number(value('offset') ?? 9), sex };
const corpus = loadClassicsCorpus(value('classics') ?? process.env.SHICHUSUIMEI_CLASSICS_DIR);
const stopAfter = value('stage') as StageName | undefined;
if (stopAfter && !STAGES.includes(stopAfter)) throw new Error(`--stage は ${STAGES.join(' / ')} のいずれか`);

if (flag('dry')) {
  const { context, facts } = prepareCircuit(person);
  console.log(JSON.stringify({
    corpus: { origin: corpus.origin, books: corpus.books },
    pillars: context.person.pillars.map(pillar => pillar.ganzhi), facts,
    seeds: Object.fromEntries(STAGES.map(stage => [stage, seedPassages(stage, facts, corpus).map(passage => `${passage.id} ${passage.book}「${passage.title}」(${passage.kind})`)])),
    strengthPromptChars: stagePrompt('strength', context, facts, seedPassages('strength', facts, corpus), {}, corpus).length,
  }, null, 2));
} else {
  const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const model = process.env.SHICHUSUIMEI_CIRCUIT_MODEL;
  const effort = (value('effort') ?? process.env.SHICHUSUIMEI_CIRCUIT_EFFORT) as 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined;
  const run = key ? createApiStageRunner({ apiKey: key, model, effort }) : createAgentSdkStageRunner({ model, effort });
  const result = await runYongshenCircuit(person, { run, corpus, stopAfter, signal: AbortSignal.timeout(20 * 60_000) });
  console.log(JSON.stringify(result, null, 2));
}
