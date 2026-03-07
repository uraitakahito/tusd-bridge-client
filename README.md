# tusd-bridge-client

[tusd-bridge](https://github.com/uraitakahito/tusd-bridge) と連携するフロントエンドWebアプリケーション。
[tus-js-client](https://github.com/tus/tus-js-client) を使用した resumable upload クライアント。

## 技術スタック

- TypeScript
- Rollup (バンドラー)
- ESLint (リンター)
- tus-js-client (TUSプロトコルクライアント)
- @formatjs/intl (国際化)

## 開発環境のセットアップ (Docker)

Dockerfileの先頭コメントを参照して、コンテナを起動してください。

コンテナ内で依存パッケージをインストール:

```sh
npm ci
```

## 開発コマンド

```sh
npm run build      # Rollupでビルド (dist/bundle.js を生成)
npm run lint       # ESLintでコード検査
npm run lint:fix   # ESLintで自動修正
npm run docs       # TypeDocでAPIドキュメント生成
```

## 連携先

- **tusd**: TUSプロトコル対応のファイルアップロードサーバー
- **tusd-bridge**: tusdのgRPCフックを受け取り、アップロードイベントを永続化するブリッジサーバー
