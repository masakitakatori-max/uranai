# Failure Taxonomy

このプロジェクトでは、失敗を「分類できる事故」として扱う。  
Pareto を測るには、まず失敗を同じ語彙で記録できるようにする必要がある。

## Categories

| Category | What it captures | Why it matters | Repo examples |
| --- | --- | --- | --- |
| `silent_fallback` | 壊れた入力を既定値で読んでしまう事故 | 最悪の誤鑑定を作る | `src/lib/engine.ts`, `src/lib/danneki.ts`, `src/lib/kingoketsu.ts`, `src/lib/location.ts` |
| `book_knowledge_gap` | 書籍 fixture や rule table の薄さ | 精度の上限を決める | `src/lib/data/dannekiRules.ts`, `src/lib/data/dannekiBookKnowledge.ts`, `knowledge/danneki/*`, `knowledge/kingoketsu/*` |
| `contract_mismatch` | UI / API / env の契約ズレ | 「押せるのに失敗」を生む | `src/components/AiFeedbackPanel.tsx`, `api/ai-feedback.js`, `src/lib/aiContract.js` |
| `missing_guard` | null / undefined / 空配列の防御不足 | 画面全体のクラッシュに直結 | `src/components/HelperPanel.tsx`, `src/components/DannekiHelperPanel.tsx`, `src/components/KingoketsuHelperPanel.tsx` |
| `auth_boundary` | token / session / cookie の漏えい境界 | 課金・会員に直撃する | `src/lib/aiFeedback.ts`, `api/member-session.js`, `api/stripe-member-pass.js` |
| `performance` | 初回 bundle や重い同期計算 | UX と拡張性を削る | `src/App.tsx`, `src/components/workspaces/*`, `src/lib/engine.ts` |

## Measurement rule

1. 失敗イベントを `category`, `severity`, `surface`, `message` で記録する
2. `severity` を重み付けして累積比率を見る
3. 80% を超える上位カテゴリを先に潰す
4. 1回の修正で複数カテゴリを減らせるものを優先する

CLI で例を見るなら、`npm run pareto:failures -- knowledge/quality/failure-events.example.json` を実行する。

## Logging contract

失敗が起きたら、次の情報を残す。

- `category`
- `severity`
- `surface`
- `module`
- `message`
- `source` or `trace`

## Current use

この taxonomy は、現在のコードレビューで見つかった `silent fallback`, `contract mismatch`, `missing guard`, `book knowledge gap` を優先的に潰すために使う。
