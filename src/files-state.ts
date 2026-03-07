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

import { type TransitionResult, accepted, rejected } from "./fsm";
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

export function transition(
  state: FilesState,
  event: FilesEvent,
): TransitionResult<FilesState, FilesEvent> {
  switch (event.type) {
    case "FILES_LOADED":
      if (state.kind !== "loading") return rejected(state, event);
      return accepted({
        kind: "connected",
        files: event.files,
        lastEventId: event.lastEventId,
      });
    case "LOAD_ERROR":
      if (state.kind !== "loading") return rejected(state, event);
      return accepted({ kind: "error", message: event.message, files: [] });
    case "FILE_EVENT":
      if (state.kind !== "connected") return rejected(state, event);
      return accepted({
        kind: "connected",
        files: upsertFile(state.files, event.file),
        lastEventId: event.eventId,
      });
    case "SSE_DISCONNECT":
      if (state.kind !== "connected") return rejected(state, event);
      return accepted({
        kind: "reconnecting",
        files: state.files,
        lastEventId: state.lastEventId,
      });
    case "SSE_RECONNECT":
      if (state.kind !== "reconnecting") return rejected(state, event);
      return accepted({
        kind: "connected",
        files: state.files,
        lastEventId: state.lastEventId,
      });
    case "RECONNECT_FAILED":
      if (state.kind !== "reconnecting") return rejected(state, event);
      return accepted({
        kind: "error",
        message: event.message,
        files: state.files,
      });
    case "RETRY":
      if (state.kind !== "error") return rejected(state, event);
      return accepted({ kind: "loading" });
  }
}
