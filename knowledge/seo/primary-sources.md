# SEO 一次ソース方針

SEO 用のタイトル、ディスクリプション、FAQ、記事案は、必ず秘伝書 OCR を一次ソースとして読む。
検索向けに言い換えるのはよいが、書籍にない断定表現や、アプリに未実装の効能を先に約束しない。

## 一次ソース
- 断易・五行易:
  - `C:\fx_tool\output\danneki_ocr\summary.json`
  - `C:\fx_tool\output\danneki_ocr\manifest.jsonl`
  - `C:\fx_tool\output\danneki_ocr\ocr_clean\img_0001.txt`
- 金口訣:
  - `C:\fx_tool\output\kingoketsu_ocr_root\ocr_clean\img_0001.txt`
  - `knowledge/kingoketsu/summary.md`
  - `knowledge/kingoketsu/rules.md`

## 断易で最低限読むこと
- `img_0001` は「易占概説」で、`易占`、`断易`、`五行易` の語をどう説明するかの基礎になる。
- 断易の LP、FAQ、コラム案では、まず OCR から章題、用語、判断軸を拾ってから検索語に展開する。
- 相談文に対する解釈機能を SEO で押し出す場合も、「書籍上の断易」と「アプリ上の補助解釈」を混同しない。

## 金口訣で最低限読むこと
- OCR 本文か `knowledge/kingoketsu` の再編メモを読んで、地分、月将、貴神、将神、用爻の語義を揃える。
- 金口訣の説明文は、実装済みの立課要素に寄せ、上級判断を実装済みのようには書かない。

## 実務ルール
- モードごとの SEO 文言は、対応する書籍本文を読んだ上で作る。
- タイトルと description では、書籍語彙と検索語彙を両立させる。
- FAQ と記事見出しは、秘伝書の章立てや概説に沿って作る。
- AI フィードバックは別機能なので、占術本文そのものと混同させない。
- 断易、金口訣、六壬神課の各モードで、語彙を混線させない。

## 次にやるとよいこと
- `knowledge/danneki/summary.md` を OCR から切り出して作る。
- SEO 記事案を作る前に、OCR の章題と主要キーワードを一覧化する。
