# tusd-bridge-client

GLB形式のファイルをアップロードし、結果を一覧形式で取得できるWebアプリケーションです。
tusdやtusd-bridgeやAirflowと連携します。

- **[tusd](https://tus.github.io/tusd/)**: [TUSプロトコル](https://tus.io/)対応のファイルアップロードサーバー
- **[tusd-bridge](https://github.com/uraitakahito/tusd-bridge)**: tusdのgRPCフックから呼び出され、ファイルのアップロードイベントやメタ情報を永続化したり、tusd-bridge-clientに通知したりする

## 開発環境のセットアップ (Docker)

Please download the required files by following these steps:

```
curl -L -O https://raw.githubusercontent.com/uraitakahito/hello-javascript/refs/heads/main/Dockerfile
curl -L -O https://raw.githubusercontent.com/uraitakahito/hello-javascript/refs/heads/main/docker-entrypoint.sh
chmod 755 docker-entrypoint.sh
```

Detailed environment setup instructions are described at the beginning of the `Dockerfile`.

コンテナ内で依存パッケージをインストール:

```sh
npm ci
```

## 開発コマンド

```sh
npm run build      # Rollupでビルド (dist/bundle.js を生成)
npm run lint:fix   # ESLintで自動修正
npm run docs       # TypeDocでAPIドキュメント生成
```

## ホストOSでNginxを起動

```console
% docker run -d --init --rm -p 80:80 --mount type=bind,src=`pwd`,dst=/usr/share/nginx/html --mount type=bind,src=`pwd`/nginx.conf,dst=/etc/nginx/conf.d/default.conf --name nginx-container nginx
% docker network connect tusd-bridge_default nginx-container
```

`nginx.conf` はオブジェクトストレージ（MinIO）へのリバースプロキシにコンテナ名 `minio` を使用しているため、
nginx コンテナを tusd-bridge の Docker Compose ネットワークに接続する必要があります。

## Debugging with Chrome DevTools

This project generates source maps (`sourcemap: true` in `rollup.config.ts`), so you can step through the original TypeScript source in Chrome DevTools.

1. Open http://localhost:80/ in Google Chrome
2. Open DevTools with **F12** (or **⌘ + Option + I** on Mac)
3. Go to the **Sources** tab
4. In the left pane file tree, locate the original `.ts` files mapped via source maps
5. Click a line number to set a **breakpoint**
6. Reload the page (**⌘ + R** / **Ctrl + R**) — execution will pause at the breakpoint

### Step execution shortcuts

| Action | Shortcut |
|---|---|
| Resume | F8 |
| Step over (next line) | F10 |
| Step into (enter function) | F11 |
| Step out (exit function) | Shift + F11 |

## tusd並びにtusd-bridgeの起動

[tusd-bridge](https://github.com/uraitakahito/tusd-bridge)の[README.md](https://raw.githubusercontent.com/uraitakahito/tusd-bridge/refs/heads/main/README.md)を参考にしてください。

