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

function accepted<S extends StateBase, E extends EventBase>(
  state: S,
): TransitionResult<S, E> {
  return { ok: true, state };
}

function rejected<S extends StateBase, E extends EventBase>(
  state: S,
  event: E,
): TransitionResult<S, E> {
  return { ok: false, state, from: state.kind, eventType: event.type };
}

export type TransitionFn<S extends StateBase, E extends EventBase> =
  (state: S, event: E) => TransitionResult<S, E>;

/**
 * 遷移テーブルの型。
 *
 * `[状態のkind][イベントのtype]` に対応するハンドラ関数を格納する。
 * テーブルにエントリがない組み合わせは自動的に rejected（遷移拒否）となる。
 */
export type TransitionTable<S extends StateBase, E extends EventBase> = {
  [K in S["kind"]]?: {
    [T in E["type"]]?: (
      state: Extract<S, { kind: K }>,
      event: Extract<E, { type: T }>,
    ) => S;
  };
};

/**
 * 遷移テーブルから TransitionFn を生成する。
 *
 * テーブルに該当ハンドラがあれば accepted、なければ rejected を返す。
 */
export function createTransition<S extends StateBase, E extends EventBase>(
  table: TransitionTable<S, E>,
): TransitionFn<S, E> {
  return (state: S, event: E): TransitionResult<S, E> => {
    const handlers = table[state.kind as S["kind"]];
    const handler = handlers?.[event.type as E["type"]] as
      | ((s: S, e: E) => S)
      | undefined;
    if (!handler) return rejected(state, event);
    return accepted(handler(state, event));
  };
}

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
