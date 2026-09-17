import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bundledCorpus, corpusFromFiles, type ClassicsCorpus } from './corpus';

/** SHICHUSUIMEI_CLASSICS_DIR の *.md を読み込む。未設定なら同梱の抜粋に切り替える。 */
export function loadClassicsCorpus(directory = process.env.SHICHUSUIMEI_CLASSICS_DIR): ClassicsCorpus {
  if (!directory) return bundledCorpus();
  if (!statSync(directory, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`古典資料のフォルダが見つかりません: ${directory}`);
  const files = readdirSync(directory).filter(name => name.endsWith('.md')).sort()
    .map(name => ({ name, text: readFileSync(join(directory, name), 'utf8') }));
  if (!files.length) throw new Error(`古典資料（.md）がありません: ${directory}`);
  return corpusFromFiles(files);
}
