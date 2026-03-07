/**
 * アップロードの状態遷移を管理する有限状態機械（FSM）。
 *
 * ```mermaid
 * stateDiagram-v2
 *     [*] --> idle
 *     idle --> uploading : START
 *     uploading --> uploading : PROGRESS
 *     uploading --> retrying : RETRY
 *     uploading --> paused : PAUSE
 *     uploading --> success : SUCCESS
 *     uploading --> error : ERROR
 *     retrying --> retrying : RETRY
 *     retrying --> paused : PAUSE
 *     retrying --> error : ERROR
 *     paused --> uploading : RESUME
 *     error --> uploading : MANUAL_RETRY
 *     success --> uploading : RESTART
 *     error --> uploading : RESTART
 *     uploading --> idle : CANCEL
 *     retrying --> idle : CANCEL
 *     paused --> idle : CANCEL
 *     idle --> idle : RESET
 *     paused --> idle : RESET
 *     error --> idle : RESET
 *     success --> idle : RESET
 * ```
 *
 * @module
 */

export type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; bytesUploaded: number; bytesTotal: number }
  | {
      kind: "retrying";
      attempt: number;
      maxRetries: number;
      delay: number;
      reason: string;
      bytesUploaded: number;
      bytesTotal: number;
    }
  | { kind: "paused"; bytesUploaded: number; bytesTotal: number }
  | { kind: "error"; message: string; bytesUploaded: number; bytesTotal: number }
  | { kind: "success"; url: string };

export type UploadEvent =
  | { type: "START" }
  | { type: "PROGRESS"; bytesUploaded: number; bytesTotal: number }
  | {
      type: "RETRY";
      attempt: number;
      maxRetries: number;
      delay: number;
      reason: string;
    }
  | { type: "SUCCESS"; url: string }
  | { type: "ERROR"; message: string }
  | { type: "MANUAL_RETRY" }
  | { type: "RESTART" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "CANCEL" }
  | { type: "RESET" };

import type { TransitionTable } from "./fsm";
import { createTransition } from "./fsm";

const toIdle = (): UploadState => ({ kind: "idle" });
const toUploading = (bytesUploaded: number, bytesTotal: number): UploadState =>
  ({ kind: "uploading", bytesUploaded, bytesTotal });

const table: TransitionTable<UploadState, UploadEvent> = {
  idle: {
    START: () => toUploading(0, 0),
    RESET: toIdle,
  },
  uploading: {
    PROGRESS: (_s, e) => toUploading(e.bytesUploaded, e.bytesTotal),
    RETRY: (s, e) => ({
      kind: "retrying",
      attempt: e.attempt, maxRetries: e.maxRetries,
      delay: e.delay, reason: e.reason,
      bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal,
    }),
    PAUSE:   (s) => ({ kind: "paused", bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal }),
    SUCCESS: (_s, e) => ({ kind: "success", url: e.url }),
    ERROR:   (s, e) => ({
      kind: "error", message: e.message,
      bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal,
    }),
    CANCEL: toIdle,
  },
  retrying: {
    RETRY: (s, e) => ({
      kind: "retrying",
      attempt: e.attempt, maxRetries: e.maxRetries,
      delay: e.delay, reason: e.reason,
      bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal,
    }),
    PAUSE: (s) => ({ kind: "paused", bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal }),
    ERROR: (s, e) => ({
      kind: "error", message: e.message,
      bytesUploaded: s.bytesUploaded, bytesTotal: s.bytesTotal,
    }),
    CANCEL: toIdle,
  },
  paused: {
    RESUME: (s) => toUploading(s.bytesUploaded, s.bytesTotal),
    CANCEL: toIdle,
    RESET:  toIdle,
  },
  error: {
    MANUAL_RETRY: () => toUploading(0, 0),
    RESTART:      () => toUploading(0, 0),
    RESET:        toIdle,
  },
  success: {
    RESTART: () => toUploading(0, 0),
    RESET:   toIdle,
  },
};

export const transition = createTransition(table);
