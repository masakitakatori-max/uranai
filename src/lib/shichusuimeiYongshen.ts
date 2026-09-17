import candidates from '../../knowledge/shichusuimei/seasonal-candidates.json';
import { ELEMENTS, STEMS, tenGod } from './shichusuimei';
import type { BaziChart, BaziPillar, Element, Stem } from './shichusuimeiTypes';

// 用神判定回路の第0段。AIに渡す前に、機械で出せる点数と見方ごとの候補を根拠ID付きで並べる。
// ここで出すのは仮説であり、採否は古典を参照する後段が決める。

export type YongshenMethod = '格局' | '扶抑' | '病薬' | '調候' | '通関';
export type ElementRole = '比劫' | '印' | '食傷' | '財' | '官殺';
export const YONGSHEN_RULE_VERSION = 'shichusuimei-yongshen-facts-1.0.0';

const GENERATES: Readonly<Record<Element, Element>> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Readonly<Record<Element, Element>> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const STEM_COMBINATIONS: Readonly<Record<string, Element>> = { 甲己: '土', 乙庚: '金', 丙辛: '水', 丁壬: '木', 戊癸: '火' };
const PATTERN_NAMES: Readonly<Record<string, string>> = {
  正官: '正官格', 七殺: '七殺格', 正財: '財格', 偏財: '財格', 正印: '印格', 偏印: '印格', 食神: '食神格', 傷官: '傷官格',
};

const DAY_MASTER_POINTS = 4;
const MONTH_BRANCH_WEIGHT = 3;
const STRENGTH_THRESHOLD = 3;
const EXCESS_THRESHOLD = 4;

export function roleOf(dayElement: Element, element: Element): ElementRole {
  if (element === dayElement) return '比劫';
  if (GENERATES[element] === dayElement) return '印';
  if (GENERATES[dayElement] === element) return '食傷';
  if (CONTROLS[dayElement] === element) return '財';
  return '官殺';
}

export function elementOfRole(dayElement: Element, role: ElementRole): Element {
  return ELEMENTS.find(element => roleOf(dayElement, element) === role)!;
}

export interface ScoreEntry { factId: string; label: string; element: Element; role: ElementRole; points: number }
export interface StrengthScore { total: number; label: '身旺' | '身弱' | '中和'; entries: ScoreEntry[]; rule: string }
export interface MethodCandidate { method: YongshenMethod; status: '候補' | '該当なし'; targets: string[]; reason: string; factIds: string[]; sourceId?: string }
export interface SpecialFlag { kind: '従弱の疑い' | '従旺の疑い' | '化格の疑い'; reason: string; factIds: string[] }
export interface PatternHypothesis { name: string; basis: string; factIds: string[] }
export interface YongshenFacts {
  dayMaster: Stem; dayElement: Element; monthBranch: BaziChart['monthBranch']; season: BaziChart['season'];
  elementCounts: Record<Element, number>; weightedCounts: Record<Element, number>;
  strength: StrengthScore; pattern: PatternHypothesis; candidates: MethodCandidate[]; flags: SpecialFlag[];
  ruleVersion: string;
}

function mainElement(pillar: BaziPillar): Element {
  return pillar.hidden.find(hidden => hidden.main)!.element;
}

function emptyCounts(): Record<Element, number> {
  return Object.fromEntries(ELEMENTS.map(element => [element, 0])) as Record<Element, number>;
}

export function buildYongshenFacts(chart: BaziChart): YongshenFacts {
  const dayElement = chart.element;
  const [yearPillar, monthPillar, dayPillar, hourPillar] = chart.pillars as [BaziPillar, BaziPillar, BaziPillar, BaziPillar];
  const visible = chart.pillars.flatMap(pillar => [
    { factId: `${pillar.id}-s`, label: `${pillar.label}干${pillar.stem}`, element: pillar.element, isDay: pillar === dayPillar, isMonthBranch: false },
    { factId: `${pillar.id}-b`, label: `${pillar.label}支${pillar.branch}`, element: mainElement(pillar), isDay: false, isMonthBranch: pillar === monthPillar },
  ]);

  const elementCounts = emptyCounts();
  const weightedCounts = emptyCounts();
  for (const item of visible) {
    elementCounts[item.element] += 1;
    weightedCounts[item.element] += item.isMonthBranch ? 2 : 1;
  }

  const entries = visible.map((item): ScoreEntry => {
    const role = roleOf(dayElement, item.element);
    const sign = role === '比劫' || role === '印' ? 1 : -1;
    const points = item.isDay ? DAY_MASTER_POINTS : sign * (item.isMonthBranch ? MONTH_BRANCH_WEIGHT : 1);
    return { factId: item.factId, label: item.label, element: item.element, role, points };
  });
  const total = entries.reduce((sum, entry) => sum + entry.points, 0);
  const strength: StrengthScore = {
    total, entries,
    label: total >= STRENGTH_THRESHOLD ? '身旺' : total <= -STRENGTH_THRESHOLD ? '身弱' : '中和',
    rule: `日干${DAY_MASTER_POINTS}点、月支は±${MONTH_BRANCH_WEIGHT}、他の6字は±1（印・比劫を＋、食傷・財・官殺を−）。±${STRENGTH_THRESHOLD}以上で身旺・身弱。鑑定票3件の点数と一致するよう置いた暫定規則で、古典の条文ではない。`,
  };

  const roleWeight = (role: ElementRole, excludeDay = true) => visible
    .filter(item => !(excludeDay && item.isDay) && roleOf(dayElement, item.element) === role)
    .reduce((sum, item) => sum + (item.isMonthBranch ? 2 : 1), 0);
  const roleFacts = (role: ElementRole) => visible.filter(item => !item.isDay && roleOf(dayElement, item.element) === role).map(item => item.factId);

  // 扶抑：強ければ強さの出どころを抑え、弱ければ弱らせている側に応じて扶ける。
  let support: MethodCandidate;
  if (strength.label === '身旺') {
    const byPeers = roleWeight('比劫') >= roleWeight('印');
    const roles: ElementRole[] = byPeers ? ['官殺', '食傷'] : ['財'];
    support = { method: '扶抑', status: '候補', targets: roles.map(role => elementOfRole(dayElement, role)),
      reason: byPeers ? `身旺で比劫（${roleWeight('比劫')}）が強さの主因。官殺で制するか食傷で洩らす。` : `身旺で印（${roleWeight('印')}）が強さの主因。財で印を制する。`,
      factIds: roleFacts(byPeers ? '比劫' : '印') };
  } else if (strength.label === '身弱') {
    const drains = (['官殺', '食傷', '財'] as const).map(role => ({ role, weight: roleWeight(role) })).sort((a, b) => b.weight - a.weight);
    const heaviest = drains[0]!.role;
    const role: ElementRole = heaviest === '財' ? '比劫' : '印';
    support = { method: '扶抑', status: '候補', targets: [elementOfRole(dayElement, role)],
      reason: `身弱で${heaviest}（${drains[0]!.weight}）が弱らせる主因。${role}で扶ける。`, factIds: roleFacts(heaviest) };
  } else {
    support = { method: '扶抑', status: '該当なし', targets: [], reason: `点数${total}は±${STRENGTH_THRESHOLD}未満で、扶抑の向きを機械では決めない。`, factIds: [] };
  }

  // 病薬：月支を2倍に数えて4以上に偏った五行を病とし、剋す五行を薬、洩らす五行を次善とする。
  const excess = ELEMENTS.filter(element => weightedCounts[element] >= EXCESS_THRESHOLD).sort((a, b) => weightedCounts[b] - weightedCounts[a]);
  const disease: MethodCandidate = excess.length
    ? { method: '病薬', status: '候補', targets: [ELEMENTS.find(element => CONTROLS[element] === excess[0])!, GENERATES[excess[0]!]],
      reason: `${excess[0]}が${weightedCounts[excess[0]!]}（月支2倍）に偏る。剋す五行を薬、洩らす五行を次善とする。`,
      factIds: visible.filter(item => item.element === excess[0]).map(item => item.factId) }
    : { method: '病薬', status: '該当なし', targets: [], reason: `月支2倍で${EXCESS_THRESHOLD}以上に偏る五行がない。`, factIds: [] };

  // 通関：剋し合う二つの五行がともに3以上なら、間を取り持つ五行を候補にする。
  const bridges = ELEMENTS.filter(attacker => weightedCounts[attacker] >= 3 && weightedCounts[CONTROLS[attacker]] >= 3)
    .map(attacker => ({ attacker, target: CONTROLS[attacker], bridge: GENERATES[attacker] }));
  const mediation: MethodCandidate = bridges.length
    ? { method: '通関', status: '候補', targets: bridges.map(item => item.bridge),
      reason: bridges.map(item => `${item.attacker}（${weightedCounts[item.attacker]}）と${item.target}（${weightedCounts[item.target]}）が対立し、${item.bridge}が取り持つ。`).join(''),
      factIds: visible.filter(item => bridges.some(b => b.attacker === item.element || b.target === item.element)).map(item => item.factId) }
    : { method: '通関', status: '該当なし', targets: [], reason: '月支2倍でともに3以上の剋し合う五行の組がない。', factIds: [] };

  const seasonal = candidates.find(candidate => candidate.stem === chart.dayMaster && candidate.months.includes(chart.monthBranch));
  const climate: MethodCandidate = seasonal
    ? { method: '調候', status: '候補', targets: seasonal.targets, reason: `『${seasonal.book}』${seasonal.title}：${seasonal.reason}`, factIds: [`${dayPillar.id}-s`, `${monthPillar.id}-b`], sourceId: seasonal.sourceId }
    : { method: '調候', status: '該当なし', targets: [], reason: '日主と月令に対応する窮通宝鑑の候補がない。', factIds: [] };

  // 格局（月令）：月支の蔵干のうち透干したものを優先し、なければ本気で仮に立てる。
  const otherStems = [yearPillar, monthPillar, hourPillar].map(pillar => pillar.stem);
  const transparent = monthPillar.hidden.filter(hidden => otherStems.includes(hidden.stem));
  const main = monthPillar.hidden.find(hidden => hidden.main)!;
  const mainGod = tenGod(chart.dayMaster, main.stem);
  const yang = STEMS.indexOf(chart.dayMaster) % 2 === 0;
  let pattern: PatternHypothesis;
  if (mainGod === '比肩' || mainGod === '劫財') {
    const name = mainGod === '比肩' ? '建禄格' : yang ? '陽刃格' : '月劫格';
    pattern = { name, basis: `月令${chart.monthBranch}の本気${main.stem}は${mainGod}。月令そのものは用神にならず、別に財・官・食傷を取る型。${transparent.length ? `透干した蔵干：${transparent.map(h => `${h.stem}（${tenGod(chart.dayMaster, h.stem)}）`).join('・')}。` : ''}`,
      factIds: [`${monthPillar.id}-b`, main.id, ...transparent.map(h => h.id)] };
  } else {
    // 比劫は格を成さないので、透干していても格の候補から外す。
    const formable = transparent.filter(hidden => !['比肩', '劫財'].includes(tenGod(chart.dayMaster, hidden.stem)));
    const chosen = formable.find(hidden => hidden.main) ?? formable[0] ?? main;
    const god = tenGod(chart.dayMaster, chosen.stem);
    pattern = { name: PATTERN_NAMES[god] ?? `${god}格`, basis: `月令${chart.monthBranch}の${chosen === main ? '本気' : '蔵干'}${chosen.stem}（${god}）${transparent.includes(chosen) ? 'が透干' : '。格を成す透干はない'}。`,
      factIds: [`${monthPillar.id}-b`, chosen.id] };
  }
  const structure: MethodCandidate = { method: '格局', status: '候補', targets: [], reason: `仮説：${pattern.name}。${pattern.basis}成否と相神は子平真詮で確認する。`, factIds: pattern.factIds };

  const flags: SpecialFlag[] = [];
  const hasPrintStem = [yearPillar, monthPillar, hourPillar].some(pillar => roleOf(dayElement, pillar.element) === '印');
  if (total <= -6 && chart.strength.roots.length === 0 && !hasPrintStem) {
    flags.push({ kind: '従弱の疑い', reason: `点数${total}、同五行の根なし、印の透干なし。`, factIds: [`${dayPillar.id}-s`, ...roleFacts('官殺'), ...roleFacts('財'), ...roleFacts('食傷')] });
  }
  if (total >= 9 && !visible.some(item => roleOf(dayElement, item.element) === '官殺')) {
    flags.push({ kind: '従旺の疑い', reason: `点数${total}、八字に官殺なし。`, factIds: [`${dayPillar.id}-s`, ...roleFacts('比劫'), ...roleFacts('印')] });
  }
  for (const neighbor of [monthPillar, hourPillar]) {
    const combined = STEM_COMBINATIONS[`${chart.dayMaster}${neighbor.stem}`] ?? STEM_COMBINATIONS[`${neighbor.stem}${chart.dayMaster}`];
    if (combined && mainElement(monthPillar) === combined) {
      flags.push({ kind: '化格の疑い', reason: `日干${chart.dayMaster}が${neighbor.label}${neighbor.stem}と合し、月令の本気が化す五行${combined}。`, factIds: [`${dayPillar.id}-s`, `${neighbor.id}-s`, `${monthPillar.id}-b`] });
    }
  }

  return {
    dayMaster: chart.dayMaster, dayElement, monthBranch: chart.monthBranch, season: chart.season,
    elementCounts, weightedCounts, strength, pattern,
    candidates: [structure, support, disease, climate, mediation], flags, ruleVersion: YONGSHEN_RULE_VERSION,
  };
}

