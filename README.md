# Divination Workspace

六壬神課、金口訣、断易を 1 つの UI で扱う Vite/React アプリです。相談文の入力から盤面、解説、解釈までを整理できます。

## Local

```bash
npm install
npm run dev
```

## Test / Build

```bash
npm run test:run
npm run build
```

## GitHub Pages

`main` ブランチへ push すると `.github/workflows/deploy-pages.yml` から GitHub Pages にデプロイされます。

- 公開 URL: `https://masakitakatori-max.github.io`
- Pages 版は静的配信です
- `Claude` の AI フィードバックは Pages 単体では動かないため、現状は無効化しています
- AI を本番で有効にする場合は、Vercel などのサーバーレス API と組み合わせてください

## Claude Feedback

環境変数は [.env.example](./.env.example) を参照してください。

- `VITE_AI_FEEDBACK_MODE=preview`: 管理画面的に AI ボタンを有効化
- `VITE_AI_FEEDBACK_MODE=paid`: 公開版で paywall UI を表示
- `ANTHROPIC_API_KEY`: Vercel Functions などサーバー側に設定
