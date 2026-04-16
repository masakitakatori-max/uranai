# Quality Roadmap

## Current hotspots

- `src/lib/kingoketsu.ts`
- `src/lib/danneki.ts`
- `src/lib/engine.ts`
- `src/App.tsx`
- `src/components/AiFeedbackPanel.tsx`

現状は「占術ロジック」「説明生成」「UI 統合」が大きい単位で同居している。  
テストは通っているが、書籍再現の golden case と UI 回帰がまだ薄く、将来のモード追加や細則追加で壊しやすい。

## Test strategy

優先順位は固定する。

1. Engine unit tests
2. Book-backed golden tests
3. Regression tests for known runtime failures
4. API contract tests with mocked Stripe / Anthropic
5. App-level smoke tests

各 engine では次の2系統を分けて維持する。

- Golden tests: 書籍や既知表の具体例が再現されること
- Invariant tests: 節境界、空亡、月破、補正時刻、欠損補完など、壊れてはいけない性質

## Debug strategy

- 失敗は必ず engine 単体で最小入力を再現してから UI に上げる
- まず `input -> basis -> intermediate trace -> chart` の順に見る
- screenshot gap や OCR 補完は、通常ルールとは分けた「出典付き例外」として扱う
- API は外部通信を切り、contract test を先に通す

## Refactor direction

次の分割単位を目標にする。

- calendar: 暦計算、補正時刻、節境界
- relations: 五行、生剋、六親、冲合刑害破
- rules: 書籍由来の typed rule tables
- explanation: narrative / interpretation builder
- engines: `buildLiurenChart`, `buildKingoketsuChart`, `buildDannekiChart`
- app-mode registry: 各モードの metadata, route, input factory, panel bindings

UI 側は `chart` の描画に徹し、計算や推定を抱え込まない形へ寄せる。

## Near-term tasks

- 六壬神課の golden case をさらに増やす
- 断易の用神選定を質問対象ベースに寄せる
- 金口訣の explanation builder を trace ベースに分離する
- `App.tsx` の mode 分岐を registry 化する
