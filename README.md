# kake-zu — 家系図作成ツール

ブラウザで動く家系図作成ツールです。

## 機能

- 人物の追加（氏名・性別・生没年月日・メモ）
- 親子関係・配偶者関係の登録
- Canvas によるビジュアル家系図表示（パン・ズーム対応）
- ノードをクリックすると詳細情報を表示
- JSON による保存・読み込み
- LocalStorage への自動保存

## 使い方

`index.html` をブラウザで開いてください（サーバー不要）。

```bash
# ローカルで素早く確認する場合
npx serve .
# または
python3 -m http.server 8080
```

## テスト

Node.js (v18 以上) が必要です。

```bash
npm test
```

## ファイル構成

```
index.html              # メイン画面
style.css               # スタイル
src/
  family-tree.js        # データモデル（Node.js / ブラウザ共用）
  family-tree-ui.js     # UI ロジック（ブラウザ専用）
tests/
  family-tree.test.js   # ユニットテスト
```