import type { UploadEvent } from "./state";

export type UploadEventHandler = (event: UploadEvent) => void;

export interface UploadParams {
  file: File;
  endpoint: string;
  token: string;
  chunkSize: number;
}
