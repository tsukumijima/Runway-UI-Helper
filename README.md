# Runway UI Helper

Runway のセッション生成画面に、完了済みタスクの生成時間と実行中タスクの経過時間を表示する Chrome 拡張機能です。  
Runway が取得するセッション API の `createdAt` と `updatedAt` を読み、各生成カードの上部へ表示します。

## 開発

Node.js 20.19.0 以降と npm 10.9.2 を使用します。

```bash
npm install
npm run dev
```

WXT が表示する案内に従って、開発用拡張機能を Chrome に読み込んでください。  
拡張機能の読み込み後に Runway の生成画面を再読み込みすると、生成カードへ時刻が追加されます。

## ビルド

```bash
npm run typecheck
npm run build
npm run zip
```

成果物は `.output/` に生成されます。

## 構成

機能ごとに `entrypoints/` 配下へ WXT のコンテンツスクリプトを追加する構成です。  
現在の生成時間表示は `entrypoints/runway-generation.content/` 内で完結しているため、今後の機能は別のエントリーポイントとして追加できます。
