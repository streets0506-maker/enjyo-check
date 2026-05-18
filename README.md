# 炎上チェック（enjyo-check）

X（旧Twitter）への投稿前に炎上リスクをAIが自動チェックするChrome拡張機能。

## 構成

```
extension/   # Chrome拡張機能（Manifest V3）
api/         # バックエンドAPI（Next.js / Vercel）
```

## 動かし方

### API
```bash
cd api
npm install
cp .env.local.example .env.local
# .env.local に GEMINI_API_KEY を記入
npm run dev
```

### 拡張機能（ローカルテスト）
1. `extension/content.js` の `API_URL` を `http://localhost:3000/api/check` に変更
2. Chrome → `chrome://extensions` → デベロッパーモード ON
3. 「パッケージ化されていない拡張機能を読み込む」→ `extension/` フォルダを選択
4. X（x.com）を開いてツイート入力欄に文章を入力

## デプロイ
- `api/` を Vercel にデプロイ
- `GEMINI_API_KEY` を Vercel 環境変数に設定
- `extension/content.js` の `API_URL` を本番URLに変更
