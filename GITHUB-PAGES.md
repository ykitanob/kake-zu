# GitHub Pages 公開手順（A案: ローカル draw.io 同梱）

このプロジェクトは `index-serverless.html` を入口として、GitHub Pages にはサーバーレス資産のみを公開する構成です。

## 1) 事前準備

- 既定ブランチを `main` にする
- このリポジトリを GitHub に push する

## 2) GitHub Pages を有効化

1. GitHub のリポジトリ画面を開く
2. `Settings` → `Pages`
3. `Build and deployment` を `GitHub Actions` に設定

## 3) デプロイ

- `main` に push すると、`.github/workflows/pages.yml` が実行されます
- 成功後、`Actions` の `Deploy Pages` から公開 URL が表示されます

## 4) 公開URL

- 通常: `https://<your-user>.github.io/<repo>/index-serverless.html`

## 5) うまくいかない時

- `Actions` タブで `Deploy Pages` のログを確認
- 404 の場合は、公開URL末尾に `index-serverless.html` を付ける
- 反映遅延がある場合、数分待って再読み込み

## 公開対象（自動）

- `index-serverless.html`
- `family-shapes-library.xml`
- `GITHUB-PAGES.md`
- `drawio-webapp/`（同ページiframe表示用）

※ `server.py` / `server.js` / ルートの `drawio/` は Pages公開物に含めません。

## 備考

- 公開ページでは `drawio-webapp/` を同一オリジンで読み込むため、同ページiframe表示が可能です
- この構成は `app.diagrams.net` の iframe CSP 制約を回避します
