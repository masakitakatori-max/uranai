import { describe, expect, it } from 'vitest';
import { bundledCorpus, corpusFromFiles, parseClassic, quoteAppearsIn, readPassage, searchPassages } from './corpus';

const ditian = [
  '# 滴天髄 和訳',
  '',
  '## 第十一页 上篇第09章 干支総論',
  '',
  '**原文**',
  '',
  '天干の気は動いて専一であり、地支の気は静かで雑である。',
  '',
  '**評析（現代注釈）**',
  '',
  '月令は命局の綱要であり、通根の軽重を合わせて旺衰を見る。',
  '',
  '## 要約：第14〜23章（判断ロジックの整理）',
  '',
  '### 第19章 衰旺（強弱の判定）',
  '',
  '令を得れば旺、令を失えば衰という図式は粗い。根の有無と通根の軽重を見る。',
].join('\n');
const qiongtong = [
  '# 穷通宝鉴 和訳',
  '',
  '### 庚金総論',
  '',
  '庚金は剛健であり、丁火に煉られて器となる。水に洗われれば清らかに輝く。',
  '',
  '**四月庚金**',
  '',
  '四月の庚金は、巳に長生し、巳の内に戊がある。丙は金を熔かさない。まず壬水を用いる。',
  '',
  '**七月庚金**',
  '',
  '七月の庚金は、剛鋭が極まる。専ら丁火をもって煅錬し、次に甲木を取って丁を引く。用神の成敗は救應による。',
].join('\n');

describe('local classics corpus', () => {
  it('splits sections at headings and bold labels with line-number ids, kinds and stem-month metadata', () => {
    const passages = parseClassic('滴天髄_和訳.md', ditian);
    expect(passages.map(passage => [passage.id, passage.kind])).toEqual([
      ['dt-5', '原文'], ['dt-9', '現代評析の和訳'], ['dt-15', 'ローカル要約（原文ではない）'],
    ]);
    expect(passages[1]).toMatchObject({ book: '滴天髄', title: '第十一页 上篇第09章 干支総論 / 評析（現代注釈）', lineStart: 9, lineEnd: 12, origin: '滴天髄_和訳.md' });
    const months = parseClassic('穷通宝鉴_和訳.md', qiongtong);
    expect(months.map(passage => [passage.id, passage.book, passage.stem, passage.month])).toEqual([
      ['qt-3', '窮通宝鑑', '庚', null], ['qt-7', '窮通宝鑑', '庚', '巳'], ['qt-11', '窮通宝鑑', '庚', '申'],
    ]);
  });

  it('splits an overlong section into paragraph chunks with distinct ids', () => {
    const paragraph = '通根の軽重を見る。'.repeat(150);
    const passages = parseClassic('滴天髄_和訳.md', ['## 第19章 衰旺', '', paragraph, '', paragraph].join('\n'));
    expect(passages.map(passage => passage.id)).toEqual(['dt-1', 'dt-5']);
    expect(passages.every(passage => passage.text.length <= 2400)).toBe(true);
  });

  it('ranks title matches first, filters by book, stem and month, and folds variant characters', () => {
    const corpus = corpusFromFiles([{ name: '滴天髄_和訳.md', text: ditian }, { name: '穷通宝鉴_和訳.md', text: qiongtong }]);
    expect(searchPassages(corpus, '衰旺')[0]!.id).toBe('dt-15');
    expect(searchPassages(corpus, '丁 煉', { book: '窮通宝鑑', stem: '庚', month: '申' }).map(hit => hit.id)).toEqual(['qt-11']);
    expect(searchPassages(corpus, '救応', { book: '窮通宝鑑' }).map(hit => hit.id)).toEqual(['qt-11']);
    expect(searchPassages(corpus, '存在しない語句の組み合わせ')).toEqual([]);
    const hit = searchPassages(corpus, '通根', { book: '滴天髄', limit: 1 })[0]!;
    expect(hit.lines).toMatch(/^滴天髄_和訳\.md:\d+-\d+$/);
    expect(hit.snippet).toContain('通根');
  });

  it('supplements books missing locally from the bundled excerpts and keeps bundled ids unique', () => {
    const corpus = corpusFromFiles([{ name: '滴天髄_和訳.md', text: ditian }]);
    expect(corpus.origin).toBe('local-files');
    // ローカルにある滴天髄は同梱抜粋と重複させず、無い窮通宝鑑・子平真詮だけを補う。
    expect(corpus.books).toEqual({ 滴天髄: 3, 窮通宝鑑: 113, 子平真詮: 2 });
    const bundled = bundledCorpus();
    expect(new Set(bundled.passages.map(passage => passage.id)).size).toBe(bundled.passages.length);
    expect(readPassage(bundled, 'zp-rescue')?.book).toBe('子平真詮');
  });

  it('accepts only quotes that appear in the passage apart from spacing and punctuation', () => {
    const passage = parseClassic('穷通宝鉴_和訳.md', qiongtong)[1]!;
    expect(quoteAppearsIn(passage, '丙は金を熔かさない')).toBe(true);
    expect(quoteAppearsIn(passage, '丙は 金を熔かさない。')).toBe(true);
    expect(quoteAppearsIn(passage, '丙は金を熔かす')).toBe(false);
    expect(quoteAppearsIn(passage, '。')).toBe(false);
  });
});
