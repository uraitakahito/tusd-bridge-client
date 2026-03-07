/**
 * ファイル一覧画面の接続状態とデータを管理する有限状態機械（FSM）。
 *
 * ```mermaid
 * stateDiagram-v2
 *     [*] --> loading
 *     loading --> connected : FILES_LOADED
 *     loading --> error : LOAD_ERROR
 *     connected --> connected : FILE_EVENT
 *     connected --> reconnecting : SSE_DISCONNECT
 *     reconnecting --> connected : SSE_RECONNECT
 *     reconnecting --> error : RECONNECT_FAILED
 *     error --> loading : RETRY
 * ```
 *
 * @module
 */

import type { TransitionTable } from "./fsm";
import { createTransition } from "./fsm";
import type { FileInfo } from "./types";

export type FilesState =
  | { kind: "loading" }
  | { kind: "connected"; files: FileInfo[]; lastEventId: number }
  | { kind: "reconnecting"; files: FileInfo[]; lastEventId: number }
  | { kind: "error"; message: string; files: FileInfo[] };

export type FilesEvent =
  | { type: "FILES_LOADED"; files: FileInfo[]; lastEventId: number }
  | { type: "LOAD_ERROR"; message: string }
  | { type: "FILE_EVENT"; file: FileInfo; eventId: number }
  | { type: "SSE_DISCONNECT" }
  | { type: "SSE_RECONNECT" }
  | { type: "RECONNECT_FAILED"; message: string }
  | { type: "RETRY" };

function upsertFile(files: FileInfo[], file: FileInfo): FileInfo[] {
  const index = files.findIndex((f) => f.upload_id === file.upload_id);
  if (index >= 0) {
    const updated = [...files];
    updated[index] = file;
    return updated;
  }
  return [file, ...files];
}

const table: TransitionTable<FilesState, FilesEvent> = {
  loading: {
    FILES_LOADED: (_s, e) => ({
      kind: "connected", files: e.files, lastEventId: e.lastEventId,
    }),
    LOAD_ERROR: (_s, e) => ({
      kind: "error", message: e.message, files: [],
    }),
  },
  connected: {
    FILE_EVENT: (s, e) => ({
      kind: "connected",
      files: upsertFile(s.files, e.file),
      lastEventId: e.eventId,
    }),
    SSE_DISCONNECT: (s) => ({
      kind: "reconnecting", files: s.files, lastEventId: s.lastEventId,
    }),
  },
  reconnecting: {
    SSE_RECONNECT: (s) => ({
      kind: "connected", files: s.files, lastEventId: s.lastEventId,
    }),
    RECONNECT_FAILED: (s, e) => ({
      kind: "error", message: e.message, files: s.files,
    }),
  },
  error: {
    RETRY: () => ({ kind: "loading" }),
  },
};

export const transition = createTransition(table);
