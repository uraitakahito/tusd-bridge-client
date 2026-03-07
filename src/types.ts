import type { UploadEvent } from "./state";

export type UploadEventHandler = (event: UploadEvent) => void;

export interface UploadParams {
  file: File;
  endpoint: string;
  token: string;
  chunkSize: number;
}

export interface FileInfo {
  upload_id: string;
  display_status: string;
  file_size: number | null;
  file_offset: number | null;
  filename: string | null;
  filetype: string | null;
  conversion_summary: unknown;
  updated_at: string;
}

export interface FilesResponse {
  files: FileInfo[];
  last_event_id: number;
  next_cursor: string | null;
}
