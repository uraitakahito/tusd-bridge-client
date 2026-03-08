import type { UploadEvent } from "./upload-state";

export type UploadEventHandler = (event: UploadEvent) => void;

export interface UploadParams {
  file: File;
  endpoint: string;
  token: string;
  chunkSize: number;
}

export interface OriginalFile {
  filename: string | null;
  filetype: string | null;
  url: string;
  size: number | null;
}

export interface UploadRecord {
  upload_id: string;
  display_status: string;
  original: OriginalFile;
  converted: unknown; // TODO: ConvertedFile[] 型を定義して置き換える
  file_offset: number | null;
  updated_at: string;
}

export interface FilesResponse {
  files: UploadRecord[];
  last_event_id: number;
  next_cursor: string | null;
}
