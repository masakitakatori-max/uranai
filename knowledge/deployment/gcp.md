# GCP Cloud Run 運用メモ

このアプリは次の分離が素直です。

- フロント: GitHub Pages
- API: Cloud Run
- DNS: お名前.comで `uranai.mozule.co.jp` と `api.uranai.mozule.co.jp` を管理

## 先に必要なもの

- Google Cloud プロジェクト
- 有効な Billing Account
- Artifact Registry
- Cloud Run
- Secret Manager
- `api.uranai.mozule.co.jp` を追加できる DNS 権限
- Stripe の `STRIPE_SECRET_KEY`
- Stripe の `STRIPE_PRICE_ID`
- Claude の `ANTHROPIC_API_KEY` または `CLAUDE_API_KEY`

## 追加したファイル

- [server.mjs](../../server.mjs)
- [Dockerfile](../../Dockerfile)
- [deploy/gcp/deploy-cloud-run.ps1](../../deploy/gcp/deploy-cloud-run.ps1)
- [deploy/gcp/cloud-run.service.template.yaml](../../deploy/gcp/cloud-run.service.template.yaml)

## Cloud Run へ載せる最短手順

1. Google Cloud SDK を入れる
2. `gcloud auth login`
3. `gcloud auth configure-docker REGION-docker.pkg.dev`
4. Secret Manager に以下を登録
   - `AI_FEEDBACK_MEMBER_TOKEN_SECRET`
   - `ANTHROPIC_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
5. リポジトリ直下で PowerShell から実行

```powershell
.\deploy\gcp\deploy-cloud-run.ps1 `
  -ProjectId YOUR_PROJECT_ID `
  -Region asia-northeast1
```

このスクリプトがやること:

- Artifact Registry の作成確認
- Docker build
- Cloud Build への submit
- Cloud Run `uranai-api` への deploy
- `SITE_URL` / `ALLOWED_ORIGINS` / `AI_FEEDBACK_MODE` などの env 設定
- Secret Manager からの secret 注入

## カスタムドメイン

Cloud Run サービスができたら、Google Cloud 側で `api.uranai.mozule.co.jp` を紐付けます。  
そのとき Google 側から提示される DNS レコードを、お名前.com に追加します。

フロント側の `VITE_API_BASE_URL` はすでに `https://api.uranai.mozule.co.jp` を想定しています。

## 必須 env

フロント:

- `VITE_SITE_URL=https://uranai.mozule.co.jp`
- `VITE_API_BASE_URL=https://api.uranai.mozule.co.jp`
- `VITE_AI_FEEDBACK_MODE=paid`
- `VITE_AI_CHECKOUT_URL=https://api.uranai.mozule.co.jp/api/create-checkout-session`

API:

- `SITE_URL=https://uranai.mozule.co.jp`
- `ALLOWED_ORIGINS=https://uranai.mozule.co.jp,https://masakitakatori-max.github.io`
- `AI_FEEDBACK_MODE=paid`
- `AI_FEEDBACK_CHECKOUT_URL=https://api.uranai.mozule.co.jp/api/create-checkout-session`
- `AI_FEEDBACK_MEMBER_TOKEN_SECRET`
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_CHECKOUT_MODE=subscription`

## 補足

- Cloud Run 側では `server.mjs` が `/api/*` と `/healthz` を公開する
- CORS は `ALLOWED_ORIGINS` と `SITE_URL` を基準に返す
- GitHub Pages と Cloud Run は別 origin なので、CORS 設定は必須
