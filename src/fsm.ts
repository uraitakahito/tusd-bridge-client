/**
 * FSM の共通型定義と dispatch ファクトリ。
 *
 * 各画面の state モジュール（upload-state, files-state）と
 * エントリポイント（upload, files）が共通で使用する。
 *
 * @module
 */

/** FSM の状態は kind で識別される */
export interface StateBase {
  kind: string;
}

/** FSM のイベントは type で識別される */
export interface EventBase {
  type: string;
}

export type TransitionResult<S extends StateBase, E extends EventBase> =
  | { ok: true; state: S }
  | { ok: false; state: S; from: S["kind"]; eventType: E["type"] };

export function accepted<S extends StateBase, E extends EventBase>(
  state: S,
): TransitionResult<S, E> {
  return { ok: true, state };
}

export function rejected<S extends StateBase, E extends EventBase>(
  state: S,
  event: E,
): TransitionResult<S, E> {
  return { ok: false, state, from: state.kind, eventType: event.type };
}

export type TransitionFn<S extends StateBase, E extends EventBase> =
  (state: S, event: E) => TransitionResult<S, E>;

export function createDispatch<S extends StateBase, E extends EventBase>(
  initialState: S,
  transitionFn: TransitionFn<S, E>,
  render: (state: S) => void,
): { dispatch: (event: E) => TransitionResult<S, E>; getState: () => S } {
  let state = initialState;
  return {
    getState: () => state,
    dispatch(event: E): TransitionResult<S, E> {
      const result = transitionFn(state, event);
      if (!result.ok) {
        console.warn(
          `Invalid transition: event "${result.eventType}" in state "${result.from}"`,
        );
      }
      state = result.state;
      render(state);
      return result;
    },
  };
}
