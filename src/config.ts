export const config = {
  /** tus アップロード先 endpoint（Upload 画面の初期値） */
  tusEndpoint: "http://localhost:8080/files/",
  /**
   * Files API の baseUrl（nginx リバースプロキシ経由）。
   * 同一オリジンにすることで CORS の問題を回避している。
   * nginx.conf の `location /api/` と一致させる必要がある。
   */
  filesApiBaseUrl: "/api",
  /**
   * オブジェクトストレージの baseUrl（nginx リバースプロキシ経由）。
   * 同一オリジンにすることで <a download="…"> のファイル名指定が有効になる。
   * nginx.conf の `location /storage/` と一致させる必要がある。
   */
  storageBaseUrl: "/storage",
} as const;
