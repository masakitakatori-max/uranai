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
