import excerpts from '../../../knowledge/shichusuimei/sources.json';
import type { SourceExcerpt } from '../../../src/lib/shichusuimeiInterpretation';

// 古典の和訳Markdownを見出し単位の節に分け、回路のツールから検索・参照できるようにする。
// 本文はリポジトリへ複製せず、ローカルのファイルから実行時に組み立てる。

export interface Passage {
  id: string; book: string; title: string; kind: string;
  stem: string | null; month: string | null;
  text: string; origin: string; lineStart: number; lineEnd: number;
}
export interface ClassicsCorpus { origin: 'local-files' | 'bundled-excerpts'; passages: Passage[]; books: Record<string, number> }
export interface SearchHit { id: string; book: string; title: string; kind: string; lines: string; snippet: string; score: number }

const BOOKS: readonly { match: RegExp; book: string; prefix: string }[] = [
  { match: /滴天[髄髓]/, book: '滴天髄', prefix: 'dt' },
  { match: /[窮穷]通[宝寶][鑑鉴]/, book: '窮通宝鑑', prefix: 'qt' },
  { match: /子平真[詮诠]/, book: '子平真詮', prefix: 'zp' },
];
const MONTHS: Readonly<Record<string, string>> = {
  正月: '寅', 二月: '卯', 三月: '辰', 四月: '巳', 五月: '午', 六月: '未', 七月: '申', 八月: '酉', 九月: '戌', 十月: '亥', 十一月: '子', 十二月: '丑',
};
const MAX_PASSAGE_CHARS = 2400;

export function identifyBook(fileName: string): { book: string; prefix: string } {
  const known = BOOKS.find(entry => entry.match.test(fileName));
  if (known) return known;
  const book = fileName.replace(/\.md$/, '').replace(/_和訳$/, '');
  return { book, prefix: `src${[...book].reduce((hash, char) => (hash * 31 + char.codePointAt(0)!) % 9973, 7)}` };
}

function kindOf(path: string[]): string {
  const joined = path.join(' ');
  if (/要約/.test(joined)) return 'ローカル要約（原文ではない）';
  const last = path.at(-1) ?? '';
  if (last === '原文') return '原文';
  if (/評析/.test(last)) return '現代評析の和訳';
  if (/命例/.test(last)) return '命例の和訳';
  if (/訳文|任氏/.test(last)) return '任氏注の和訳';
  if (/注釈|原注/.test(last)) return '原注の和訳';
  return '和訳';
}

function stemAndMonth(title: string): { stem: string | null; month: string | null } {
  const month = Object.keys(MONTHS).sort((a, b) => b.length - a.length).find(name => title.startsWith(name));
  const stem = title.match(/([甲乙丙丁戊己庚辛壬癸])[木火土金水]/)?.[1] ?? null;
  return { stem, month: month ? MONTHS[month]! : null };
}

/** Markdown本文を節に分ける。見出し（#）と太字だけの行で区切り、長い節は段落で分割する。 */
export function parseClassic(fileName: string, markdown: string): Passage[] {
  const { book, prefix } = identifyBook(fileName);
  const lines = markdown.split(/\r?\n/);
  const headingPath: string[] = [];
  const passages: Passage[] = [];
  let current: { start: number; path: string[]; body: string[] } | null = null;

  const flush = (endLine: number) => {
    if (!current) return;
    const paragraphs: { start: number; text: string }[] = [];
    let buffer: string[] = []; let bufferStart = current.start;
    current.body.forEach((line, offset) => {
      const lineNumber = current!.start + 1 + offset;
      if (line.trim() === '' || line.trim() === '---') {
        if (buffer.length) paragraphs.push({ start: bufferStart, text: buffer.join('\n') });
        buffer = []; return;
      }
      if (!buffer.length) bufferStart = lineNumber;
      buffer.push(line);
    });
    if (buffer.length) paragraphs.push({ start: bufferStart, text: buffer.join('\n') });
    const title = current.path.filter(Boolean).slice(-2).join(' / ');
    const { stem, month } = stemAndMonth(current.path.at(-1) ?? '');
    const kind = kindOf(current.path);
    let chunk: { start: number; parts: string[]; size: number } | null = null;
    const emit = (lineEnd: number) => {
      if (!chunk || !chunk.parts.length) return;
      const id = passages.some(p => p.id === `${prefix}-${chunk!.start}`) ? `${prefix}-${chunk.start}-b` : `${prefix}-${chunk.start}`;
      passages.push({ id, book, title, kind, stem, month, text: chunk.parts.join('\n\n'), origin: fileName, lineStart: chunk.start, lineEnd });
    };
    paragraphs.forEach((paragraph, index) => {
      if (!chunk) chunk = { start: index === 0 ? current!.start : paragraph.start, parts: [], size: 0 };
      if (chunk.size + paragraph.text.length > MAX_PASSAGE_CHARS && chunk.parts.length) {
        emit(paragraph.start - 1);
        chunk = { start: paragraph.start, parts: [], size: 0 };
      }
      chunk.parts.push(paragraph.text); chunk.size += paragraph.text.length;
    });
    emit(endLine);
    current = null;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const heading = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    const bold = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (heading || bold) {
      flush(lineNumber - 1);
      if (heading) {
        const depth = heading[1]!.length;
        headingPath.length = depth - 1;
        headingPath[depth - 1] = heading[2]!;
        current = { start: lineNumber, path: [...headingPath], body: [] };
      } else {
        const base = headingPath.filter(Boolean);
        current = { start: lineNumber, path: [...base, bold![1]!], body: [] };
      }
      return;
    }
    if (current) current.body.push(line);
  });
  flush(lines.length);
  return passages.filter(passage => passage.text.trim().length >= 20);
}

function tally(passages: Passage[]): Record<string, number> {
  return passages.reduce<Record<string, number>>((counts, passage) => ({ ...counts, [passage.book]: (counts[passage.book] ?? 0) + 1 }), {});
}

export function corpusFromFiles(files: readonly { name: string; text: string }[]): ClassicsCorpus {
  const passages = files.flatMap(file => parseClassic(file.name, file.text));
  if (!passages.length) throw new Error('古典資料から節を取り出せませんでした');
  // ローカルに無い書物（現状は子平真詮）は、同梱の抜粋で補う。
  const localBooks = new Set(passages.map(passage => passage.book));
  const supplements = bundledCorpus().passages.filter(passage => !localBooks.has(passage.book));
  const merged = [...passages, ...supplements];
  return { origin: 'local-files', passages: merged, books: tally(merged) };
}

/** ローカル資料が無い環境では、リポジトリ同梱の抜粋139件を同じ形で使う。 */
export function bundledCorpus(): ClassicsCorpus {
  const passages = (excerpts as SourceExcerpt[]).map(excerpt => ({
    id: excerpt.id, book: excerpt.book, title: excerpt.title, kind: excerpt.kind, stem: excerpt.stem, month: excerpt.month,
    text: excerpt.text, origin: excerpt.origin, lineStart: excerpt.lineStart, lineEnd: excerpt.lineEnd,
  }));
  return { origin: 'bundled-excerpts', passages, books: tally(passages) };
}

const VARIANTS: Readonly<Record<string, string>> = { 應: '応', 從: '従', 氣: '気', 煞: '殺', 寶: '宝', 髓: '髄', 诠: '詮', 鉴: '鑑', 穷: '窮', 轉: '転', 濕: '湿', 煖: '暖', 關: '関', 祿: '禄', 衝: '冲', 沖: '冲' };
const normalize = (value: string) => [...value.normalize('NFKC')].map(char => VARIANTS[char] ?? char).join('').replace(/[\s\u3000、。，．・「」『』（）()［］[\]：:；;！!？?]/g, '');

export function searchPassages(corpus: ClassicsCorpus, query: string, options: { book?: string; stem?: string; month?: string; limit?: number } = {}): SearchHit[] {
  const terms = query.split(/[\s\u3000,、]+/).map(normalize).filter(term => term.length > 0);
  if (!terms.length) return [];
  const bigrams = new Set(terms.flatMap(term => term.length === 1 ? [term] : [...term].slice(0, -1).map((char, i) => char + term[i + 1])));
  const limit = Math.min(Math.max(options.limit ?? 6, 1), 10);
  return corpus.passages
    .filter(passage => (!options.book || passage.book === options.book) && (!options.stem || passage.stem === options.stem) && (!options.month || passage.month === options.month))
    .map(passage => {
      const text = normalize(passage.text); const title = normalize(passage.title);
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 15;
        score += Math.min(text.split(term).length - 1, 5) * (term.length >= 2 ? 6 : 1);
      }
      const matched = [...bigrams].filter(gram => text.includes(gram) || title.includes(gram)).length;
      score += (matched / bigrams.size) * 8;
      return { passage, score };
    })
    .filter(item => item.score >= 6)
    .sort((a, b) => b.score - a.score || a.passage.lineStart - b.passage.lineStart)
    .slice(0, limit)
    .map(({ passage, score }) => {
      const first = terms.map(term => passage.text.indexOf(term)).filter(index => index >= 0).sort((a, b) => a - b)[0] ?? 0;
      const start = Math.max(0, first - 60);
      return { id: passage.id, book: passage.book, title: passage.title, kind: passage.kind, lines: `${passage.origin}:${passage.lineStart}-${passage.lineEnd}`,
        snippet: `${start > 0 ? '…' : ''}${passage.text.slice(start, start + 180).replace(/\s+/g, ' ')}…`, score: Math.round(score * 10) / 10 };
    });
}

export function readPassage(corpus: ClassicsCorpus, id: string): Passage | null {
  return corpus.passages.find(passage => passage.id === id) ?? null;
}

/** 引用が本文の抜き出しになっているか（空白・句読点の差は無視）。 */
export function quoteAppearsIn(passage: Passage, quote: string): boolean {
  const needle = normalize(quote);
  return needle.length >= 2 && normalize(passage.text).includes(needle);
}
