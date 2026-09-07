# Uranai

六壬神課・断易などを 1 つの UI で扱う Vite/React アプリです。  
静的フロントは GitHub Pages、AI と決済 API は別ホストに切り出す前提です。

## Local

```bash
npm install
npm run dev
```

API 単体をローカルで確認する場合:

```bash
npm run api:dev
```

## Test / Build

```bash
npm run test:run
npm run build
```

## Native iOS アプリ (Capacitor)

同じ React/Vite コードを Capacitor で iOS ネイティブアプリとして配布します。
占術ロジックはすべてクライアント側で動くため、AI/決済 API なしでもアプリは完全に機能します（AI はデフォルト無効）。

- Bundle ID: `jp.co.mozule.uranai`
- 表示名: `占術ワークスペース`（`ios/App/App/Info.plist` の `CFBundleDisplayName` で変更可）
- 設定: `capacitor.config.ts`（`webDir: dist`）
- ネイティブプロジェクト: `ios/`（Swift Package Manager 構成。CocoaPods 不要）

### Windows でできること（作成済み）

```bash
npm run build        # dist を生成
npx cap sync ios     # dist と設定を ios/ へ反映
```

アイコン/スプラッシュを作り直す場合:

```bash
node scripts/gen-app-assets.mjs        # favicon.svg から assets/ の元画像を生成
npx @capacitor/assets generate --ios   # ios のアセットカタログへ反映
```

### Mac で必要なこと（実機ビルド・App Store 申請）

iOS の実機ビルドと App Store 申請には **Mac + Xcode** が必須です。

```bash
npm ci
npm run ios          # build → cap sync ios → Xcode で開く
# （= npm run build && npx cap sync ios && npx cap open ios）
```

Xcode 側:

1. `Signing & Capabilities` で Apple Developer アカウント（Team）を設定
2. 実機 or シミュレータを選んで Run で動作確認
3. `Product > Archive` → App Store Connect へアップロード

Mac がない場合は Codemagic / Ionic Appflow などのクラウド Mac CI でも同手順をビルドできます。

### AI フィードバックを有効化する場合

ネイティブのアプリ原点は `capacitor://localhost` のため、相対パスの API 呼び出しは解決できません。

- `.env`（native ビルド時）に絶対 URL を設定: `VITE_API_BASE_URL=https://api.uranai.mozule.co.jp`
- API 側の `ALLOWED_ORIGINS` に `capacitor://localhost` を追加
- iOS の App Store 審査では、アプリ内デジタルコンテンツ課金は Apple IAP が原則（外部 Stripe checkout はガイドライン要確認）

## Public URLs

- フロント: `https://uranai.mozule.co.jp`
- GitHub Pages origin: `https://masakitakatori-max.github.io`
- API 想定ホスト: `https://api.uranai.mozule.co.jp`

## Environment Variables

`.env.example` をベースに設定します。

フロント用:

- `VITE_SITE_URL`
- `VITE_API_BASE_URL`
- `VITE_AI_FEEDBACK_MODE`
- `VITE_AI_CHECKOUT_URL`

API 用:

- `AI_FEEDBACK_MODE`
- `AI_FEEDBACK_CHECKOUT_URL`
- `AI_FEEDBACK_MEMBER_KEYS`
- `AI_FEEDBACK_MEMBER_TOKEN_SECRET`
- `AI_FEEDBACK_MEMBER_PASS_TTL_DAYS`
- `AI_FEEDBACK_MAX_TOKENS`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_API_KEY` または `CLAUDE_API_KEY`
- `SITE_URL`
- `ALLOWED_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_CHECKOUT_MODE`

## GitHub Pages

`main` へ push すると `.github/workflows/deploy-pages.yml` から GitHub Pages にデプロイされます。  
Pages build は GitHub Actions Variables を使います。

必要な Variables:

- `VITE_SITE_URL=https://uranai.mozule.co.jp`
- `VITE_API_BASE_URL=https://api.uranai.mozule.co.jp`
- `VITE_AI_FEEDBACK_MODE=paid`
- `VITE_AI_CHECKOUT_URL=https://api.uranai.mozule.co.jp/api/create-checkout-session`

## Paid API Gate

AI API は `paid` モード時に `x-ai-member-key` を必須にします。

- 旧方式: `AI_FEEDBACK_MEMBER_KEYS`
- 本命: Stripe Checkout 後に `/api/stripe-member-pass` で署名付き会員パスを発行

`/api/ai-feedback` は会員パスを検証し、Stripe が設定されている場合は Stripe 側の支払い状態も再確認します。

## Deployment

### GCP Cloud Run

Cloud Run 用の entrypoint と deploy 資材は以下です。

- [server.mjs](./server.mjs)
- [Dockerfile](./Dockerfile)
- [deploy/gcp/deploy-cloud-run.ps1](./deploy/gcp/deploy-cloud-run.ps1)
- [deploy/gcp/cloud-run.service.template.yaml](./deploy/gcp/cloud-run.service.template.yaml)
- [knowledge/deployment/gcp.md](./knowledge/deployment/gcp.md)

### お名前.com レンタルサーバ

PHP 版 API は以下にあります。

- [deploy/onamae/README.md](./deploy/onamae/README.md)

## Legal

- 利用規約: `/terms/`
- プライバシーポリシー: `/privacy/`

## SEO Source Policy

- 一次情報メモ: [knowledge/seo/primary-sources.md](./knowledge/seo/primary-sources.md)
- 断易 OCR: `C:\fx_tool\output\danneki_ocr`

## 四柱推命・用神と相性

`/shichusuimei/` で命式・蔵干・日主の根・組み合わせ・8期の大運・二人の命式を表示します。立春換年、12節による月柱、23時の日界、入力された現地時計時とUTC差を採用。真太陽時補正は行わず、節入りと起運年齢は概算です。通常格を前提にした旺衰は暫定評価として根拠と一緒に表示します。

AI解説は格局・扶抑・調候・病薬・通関を区別し、用いる干、条件、妨げ、命式の根拠、古典資料を返します。二人の相性は両方向を検討し、相手の命式を本人の通根へ混入させません。AIはボタンを押した時だけ実行し、入力変更時に古い結果を破棄します。同じ画面内の同一依頼は直近10件までメモリで再利用し、鑑定履歴を公開DBや共有RAGには保存しません。

### ローカルAI

Node 22以降で、別ターミナルからそれぞれ起動します。ローカルAPIは `.env` も読み込みます。

```bash
npm run api:shichusuimei
npm run dev
```

`ANTHROPIC_API_KEY`（または `CLAUDE_API_KEY`）があればAnthropic SDKを使います。未設定ならClaude Agent SDKを使い、PATH上の認証済みClaude CLIを優先します。実行ファイルは `CLAUDE_EXECUTABLE`、モデルは `SHICHUSUIMEI_MODEL` で変更できます。ローカルAPIは127.0.0.1:8788だけにbindし、Viteが `/api/shichusuimei/` をproxyします。モデルのファイル操作・外部ツール・ユーザーMCP読み込みは無効です。

### 公開API

Cloudflare Workerの `/api/shichusuimei/status` と `/api/shichusuimei/interpret` を使用します。`ANTHROPIC_API_KEY` と `SHICHUSUIMEI_ACCESS_TOKEN` をWorker secretに設定し、フロントの `VITE_API_BASE_URL` をWorkerに向けてください。限定公開用アクセスコードはブラウザのAI入力欄で入力し、VITE変数やGitへ埋め込みません。コード未設定の公開APIは閉鎖されます。課金導線は今回の対象外です。

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SHICHUSUIMEI_ACCESS_TOKEN
npx wrangler deploy
```

SDKのJSONスキーマ変換は[公式のstructured outputs仕様](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)に従い、受信後も元のスキーマ・命式ID・資料IDを再検証します。参照資料の出所は [knowledge/shichusuimei/README.md](knowledge/shichusuimei/README.md) を参照してください。
