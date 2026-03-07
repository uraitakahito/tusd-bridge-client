import * as tus from "tus-js-client";
import type { UploadEventHandler, UploadParams } from "./types";

export interface Uploader {
  startUpload(params: UploadParams): void;
  abortUpload(): void;
  retryUpload(): void;
}

export function createUploader(
  onEvent: UploadEventHandler,
  formatErrorReason: (statusCode: number) => string,
): Uploader {
  let currentUpload: tus.Upload | null = null;

  return {
    startUpload(params: UploadParams) {
      const headers: Record<string, string> = {};
      if (params.token) {
        headers["Authorization"] = `Bearer ${params.token}`;
      }

      currentUpload = new tus.Upload(params.file, {
        endpoint: params.endpoint,
        headers,
        chunkSize: params.chunkSize,
        retryDelays: [0, 3000, 5000],
        metadata: {
          filename: params.file.name,
          filetype: params.file.type,
        },
        onShouldRetry(error, retryAttempt, options) {
          const maxRetries = options.retryDelays?.length ?? 0;
          const delay = options.retryDelays?.[retryAttempt] ?? 0;
          const statusCode = error.originalResponse?.getStatus() ?? 0;
          const reason = formatErrorReason(statusCode);

          onEvent({
            type: "RETRY",
            attempt: retryAttempt,
            maxRetries,
            delay,
            reason,
          });
          return true;
        },
        onError(error) {
          onEvent({ type: "ERROR", message: error.message });
        },
        onProgress(bytesUploaded, bytesTotal) {
          onEvent({ type: "PROGRESS", bytesUploaded, bytesTotal });
        },
        onSuccess() {
          onEvent({ type: "SUCCESS", url: currentUpload?.url ?? "" });
        },
      });

      currentUpload.start();
    },

    abortUpload() {
      if (!currentUpload) return;
      void currentUpload.abort();
    },

    retryUpload() {
      if (!currentUpload) return;
      currentUpload.start();
    },
  };
}
