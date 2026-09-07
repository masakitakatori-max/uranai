# 四柱推命 AI解説 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent implementation and review. Continue without additional user checkpoints; implementation is authorized.

**Goal:** 生年月日時から命式と大運を算出し、古典に基づく用神論・二人の相性をSDKで解説する。
**Architecture:** 純粋なTypeScript命式計算をクライアントとNodeで共有し、Nodeが原典の節を選択してClaude Agent SDKへ渡す。Reactは構造化結果と同じ命式IDから図と説明を描画する。
**Tech Stack:** Existing React/Vite/TypeScript/Vitest, Claude Agent SDK, Zod, tsx.
**Spec:** docs/superpowers/specs/2026-09-07-shichusuimei-design.md

## Global Constraints

- 課金・決済は後回し。機能完成後にmainへマージ・公開デプロイする（ユーザー追加承認）。
- 日主、全蔵干、天干の根、大運、二人の命式の相性を含める。
- 用神は格局・扶抑・調候・病薬・通関を区別し、根拠と成立条件を必須にする。
- 相手の命式で本人の出生時の根を作らない。出生月令を大運で変えない。
- SDKはツールなし。検証できない応答を成功扱いしない。
- 既存の6占術を保持する。個人履歴の共有APIは使わない。

### Task 1: Shared chart and relationship engine

**Files:** create `src/lib/shichusuimei.ts`, `src/lib/shichusuimei.test.ts`, optional `src/lib/shichusuimeiCalendar.ts`; consume `src/lib/shichusuimeiTypes.ts` without changing its public types.
**Interfaces:** export `STEMS`, `BRANCHES`, `ELEMENTS`, `HIDDEN_STEMS`, `elementOf(stem)`, `tenGod(day, stem)`, `buildBaziChart(input, id = 'a')`, `rootsForStem(chart, stem, luck?)`, `buildBaziContext(request)`.

- [x] Test a known sample `{year:1990,month:5,day:15,hour:14,minute:30,utcOffset:9,sex:'male'}` gives `庚午 辛巳 庚辰 癸未` and first luck `壬午` at approximately `7.24` years. Sample winter 1990-01-15 gives `己巳 丁丑 庚辰 癸未`, reverse, first `丙子` about `3.208`. 2000-01-01 day is 戊午; verify late 子 hour and leap dates independently.
- [x] Port the locally available Python calendar algorithm, declaring approximate solar longitude and calendar conventions; validate real dates, 1900..2100, integer clock, offset -12..14, and sex.
- [x] Give pillars IDs `a-year`, `a-month`, `a-day`, `a-hour` and hidden IDs `${pillarId}-h-${stem}`. Add stem/branch fact IDs `${pillarId}-s` and `${pillarId}-b`; luck IDs `a-luck-${index}`. Use those IDs in relation endpoints.
- [x] Enumerate natal and incoming luck/partner relations with scope and conditional effects; distinguish a detected combination from established transformation, storage opening or uprooting. Three-branch combinations must require all three; two-branch刑 should remain候補. Keep partner charts separate.
- [x] Return traceable conventional strength evidence with conservative labels and versioned caveats, not unsupported exact numeric strength. Root location and main qi classification are separate from final旺衰.
- [x] Run `npm run test:run -- src/lib/shichusuimei.test.ts`; check invalid input, source sample parity, opposite sex reversal, IDs and no mutation of natal chart when adding luck/partner.

### Task 2: Source-grounded SDK service

**Files:** create `server/shichusuimei/{sources,contract,service,http}.ts`, `server/shichusuimei/*.test.ts`, `knowledge/shichusuimei/` source excerpts with hashes; update package scripts and dev proxy.
**Interfaces:** service accepts `InterpretationRequest`, recomputes `BaziContext`, and returns schema-validated interpretation plus source and usage metadata. Browser never sends authoritative chart facts or custom system prompts.

- [x] Reject an unknown fact/source ID, invalid output, missing purpose, wrong partner direction, malformed dates, or oversized question in boundary tests. SDK calls use an injected external runner only in tests; real runtime uses official SDK.
- [x] Select source text by day stem and month with stable source IDs and citations. Include separate general旺衰/用神/相性 cautions. Do not turn source-pack summaries or missing子平真詮 material into invented primary text.
- [x] Bound turns/time/budget and disable tools, project settings and sessions. Treat provider errors, missing structured output and validation failures as errors. Keep SDK usage and cost distinct from charged fees (no billing).
- [x] Bind Node server to 127.0.0.1, validate Origin and request size, limit concurrent jobs, cancel on request loss, expose readiness and explicit error states. Proxy through Vite for the local app.
- [x] Exercise real SDK on a synthetic birth sample once connected; keep assertions separate from provider fixtures.

### Task 3: Working user interface

**Files:** create `src/components/shichusuimei/` input/chart/landscape/interpretation components, `src/components/workspaces/ShichusuimeiWorkspace.tsx`, frontend client and tests; edit `src/App.tsx`, mode types, SEO route/build scripts.

- [x] Add `/shichusuimei/` and navigation. Birth inputs are not reset to current time. Validate invalid date and missing partner before AI calls.
- [x] Display日主, full蔵干, root-derived sizes, season and strength factors; distinguish戊/己 and四墓. Implement tabs 用神 / 組み合わせ / 大運 / 二人の相性.
- [x] Show before/after luck landscapes; partner gets their own chart. Use directly labelled relationship buttons with fact highlights.
- [x] Render purpose-specific use/reason/conditions, references and both compatibility directions. Invalidate stale results when input changes and cancel outstanding request. No automatic AI call on sliders/tab changes.
- [x] Test asynchronous response staleness, missing partner and error/retry, then inspect real desktop/mobile UI.

### Task 4: Integration review and handoff

- [x] Run targeted tests, full tests, lint and build; inspect changed route in production build.
- [x] Run browser through real inputs, luck switch and two-person comparison, and capture actual SDK explanation if auth permits.
- [x] Independent review of correctness, effect IDs, source grounding, provider permissions and stale requests. Fix material findings.
- [x] Document startup, calendar conventions, included sources, exact validation status and remaining interpretation limits.
- [ ] Merge to main and deploy after verification (explicit user authorization). Worker requires Cloudflare re-authentication.
