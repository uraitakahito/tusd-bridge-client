import type { UploadEvent } from "./upload-state";

export type UploadEventHandler = (event: UploadEvent) => void;

export interface UploadParams {
  file: File;
  endpoint: string;
  token: string;
  chunkSize: number;
}

export interface FileEntry {
  role: "original" | "converted";
  filename: string;
  filetype: string;
  url: string | null;
  size: number;
}

export interface UploadRecord {
  upload_id: string;
  display_status: string;
  files: FileEntry[];
  file_offset: number | null;
  updated_at: string;
}

export interface FilesResponse {
  files: UploadRecord[];
  last_event_id: number;
  next_cursor: string | null;
}
