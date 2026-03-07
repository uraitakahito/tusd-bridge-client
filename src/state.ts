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
    }
  | { kind: "paused"; bytesUploaded: number; bytesTotal: number }
  | { kind: "error"; message: string }
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
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "CANCEL" }
  | { type: "RESET" };

export type TransitionResult =
  | { ok: true; state: UploadState }
  | { ok: false; state: UploadState; from: UploadState["kind"]; eventType: UploadEvent["type"] };

function accepted(state: UploadState): TransitionResult {
  return { ok: true, state };
}

function rejected(state: UploadState, event: UploadEvent): TransitionResult {
  return { ok: false, state, from: state.kind, eventType: event.type };
}

export function transition(
  state: UploadState,
  event: UploadEvent,
): TransitionResult {
  switch (event.type) {
    case "START":
      if (state.kind !== "idle") return rejected(state, event);
      return accepted({ kind: "uploading", bytesUploaded: 0, bytesTotal: 0 });
    case "PROGRESS":
      if (state.kind !== "uploading") return rejected(state, event);
      return accepted({
        kind: "uploading",
        bytesUploaded: event.bytesUploaded,
        bytesTotal: event.bytesTotal,
      });
    case "RETRY":
      if (state.kind !== "uploading" && state.kind !== "retrying") return rejected(state, event);
      return accepted({
        kind: "retrying",
        attempt: event.attempt,
        maxRetries: event.maxRetries,
        delay: event.delay,
        reason: event.reason,
      });
    case "SUCCESS":
      if (state.kind !== "uploading") return rejected(state, event);
      return accepted({ kind: "success", url: event.url });
    case "ERROR":
      if (state.kind !== "uploading" && state.kind !== "retrying") return rejected(state, event);
      return accepted({ kind: "error", message: event.message });
    case "MANUAL_RETRY":
      if (state.kind !== "error") return rejected(state, event);
      return accepted({ kind: "uploading", bytesUploaded: 0, bytesTotal: 0 });
    case "PAUSE":
      if (state.kind === "uploading")
        return accepted({ kind: "paused", bytesUploaded: state.bytesUploaded, bytesTotal: state.bytesTotal });
      if (state.kind === "retrying")
        return accepted({ kind: "paused", bytesUploaded: 0, bytesTotal: 0 });
      return rejected(state, event);
    case "RESUME":
      if (state.kind !== "paused") return rejected(state, event);
      return accepted({ kind: "uploading", bytesUploaded: state.bytesUploaded, bytesTotal: state.bytesTotal });
    case "CANCEL":
      if (state.kind === "uploading" || state.kind === "retrying" || state.kind === "paused")
        return accepted({ kind: "idle" });
      return rejected(state, event);
    case "RESET":
      if (state.kind === "uploading" || state.kind === "retrying")
        return rejected(state, event);
      return accepted({ kind: "idle" });
  }
}
