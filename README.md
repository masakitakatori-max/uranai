# Uranai

六壬神課・断易などを 1 つの UI で扱う Vite/React アプリです。  
静的フロントは GitHub Pages、AI と決済 API は別ホストに切り出す前提です。

## Local

```bash
npm install
npm run dev
```

API 単体をローカルで確認する場合（Cloudflare Worker をローカル実行）:

```bash
npm run api:dev
```

ローカルD1へのスキーマ適用:

```bash
npx wrangler d1 execute uranai-ai-sessions --local --file=workers/schema.sql
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

API 用（Cloudflare Worker の secrets/vars。`wrangler secret put <name>` で設定）:

- `AI_FEEDBACK_MODE`（`disabled` / `preview` / `paid`。`wrangler.toml` の `[vars]` で設定）
- `AI_FEEDBACK_CHECKOUT_URL`（`paid` モードで未エンタイトルメント時にクライアントへ返す静的リンク）
- `AI_FEEDBACK_MEMBER_TOKEN_SECRET`（エンタイトルメントJWTの署名鍵。32文字以上のランダム文字列を推奨）
- `AI_FEEDBACK_MAX_TOKENS`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_API_KEY`
- `SITE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`（Stripe Dashboard の Webhook 設定画面で発行される署名検証用シークレット）

## GitHub Pages

`main` へ push すると `.github/workflows/deploy-pages.yml` から GitHub Pages にデプロイされます。  
Pages build は GitHub Actions Variables を使います。

必要な Variables:

- `VITE_SITE_URL=https://uranai.mozule.co.jp`
- `VITE_API_BASE_URL=https://api.uranai.mozule.co.jp`
- `VITE_AI_FEEDBACK_MODE=paid`
- `VITE_AI_CHECKOUT_URL=https://api.uranai.mozule.co.jp/api/create-checkout-session`

## 課金エンタイトルメント（Stripe / Apple StoreKit 統合基盤）

Web(Stripe) と iOS(Apple StoreKit) の両方を、Cloudflare D1 に持つ1つのエンタイトルメント状態に集約する設計です。詳細設計は `docs/design/mobile-redesign/README.md` に近い運用ドキュメントとして今後追記予定。現時点の実装状況:

- **D1スキーマ**: `entitlement_accounts` / `entitlement_devices` / `entitlements` / `billing_webhook_events`（`workers/schema.sql`）
- **識別モデル**: クライアント生成の匿名 `deviceId`（`src/lib/aiFeedback.ts` の `getOrCreateDeviceId`）を起点に、決済成立時の恒久アンカー（Stripeの email、Apple の originalTransactionId）へ紐付ける。ログイン/サインアップは作らない。
- **エンタイトルメントトークン**: `POST /api/entitlement/token`（`workers/routes/entitlement.js`）が deviceId から有効な entitlement を引き、24時間TTLの署名付きJWT（HS256、`jose`、`AI_FEEDBACK_MEMBER_TOKEN_SECRET`で署名）を発行。クライアントは `Authorization: Bearer <jwt>` を `/api/ai-feedback` に付けて送る（旧来の cookie ベース `/api/member-session` は廃止）。
- **Stripe**: `POST /api/billing/stripe/checkout-session`（Checkout Session作成）、`POST /api/billing/stripe/webhook`（`checkout.session.completed` / `customer.subscription.updated` / `deleted` を処理、Stripe イベントIDで冪等性担保）。実装は `workers/routes/billingStripe.js`。
- **`/api/ai-feedback` のゲート**: `paid` モード時、`Authorization` ヘッダのJWTを検証。無効/欠如なら従来通り402 + `checkoutUrl`（+ 新規 `appleProductId`）を返す。`disabled`/`preview` モードは無変更。
- **Apple StoreKit / iOS ネイティブ購入UI**: 未実装（Phase 2）。App Store Connect でのサブスクリプション商品作成、Apple Developer Portal での App Store Server API 用キー発行など、ユーザー側の手動作業が前提となるため別途着手。
- **既存の `AiFeedbackPanel.tsx` の「購入」導線**: 現状は `VITE_AI_CHECKOUT_URL` の静的リンクへ飛ぶのみで、`/api/billing/stripe/checkout-session` への動的な呼び出しはまだUIに配線されていない（フォローアップ）。

ローカル検証: `npm run api:dev`（`wrangler dev`）でWorkerを起動し、`npx wrangler d1 execute uranai-ai-sessions --local --command "..."` で entitlement テーブルへ直接テストデータを入れることで、トークン発行〜ゲート通過まで確認できる。

## Legal

- 利用規約: `/terms/`
- プライバシーポリシー: `/privacy/`

## SEO Source Policy

- 一次情報メモ: [knowledge/seo/primary-sources.md](./knowledge/seo/primary-sources.md)
- 断易 OCR: `C:\fx_tool\output\danneki_ocr`
