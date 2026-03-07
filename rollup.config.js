import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    sourcemap: true,
  },
  // NOTE: @rollup/plugin-typescript の load() フックの注意点
  //
  // このプラグインの load() フックは、内部の filter() 関数がファイルを
  // 対象外と判定した場合や、findTypescriptOutput() が emit 結果を
  // 見つけられなかった場合に null を返す。
  // Rollup は null を「このプラグインでは変換しない」と解釈し、
  // .ts ファイルを素の JavaScript としてパースしようとする。
  // その結果、TypeScript 構文（import type 等）で
  // "Expected ',', got '{'" のような無関係な構文エラーが発生する。
  //
  // このエラーメッセージからはプラグインがファイルをスキップしたことを
  // 読み取れないため、原因特定が困難になる。
  // 例えば dist/ に tsc の出力が残っている場合、filter() の outDir
  // 除外ロジックが意図せず src/ 側のファイルにも影響しうる。
  //
  // 同種の問題は GitHub 上で繰り返し報告されている:
  //   https://github.com/rollup/plugins/issues/287
  //   https://github.com/rollup/plugins/issues/849
  //   https://github.com/rollup/plugins/issues/1083
  //
  // 該当するプラグインのソースコード:
  //   https://github.com/rollup/plugins/blob/master/packages/typescript/src/index.ts
  //   (load() フック内の filter(id) チェックと output.code != null チェック)
  plugins: [resolve({ browser: true }), commonjs(), json(), typescript()],

  // NOTE: @formatjs/ecma402-abstract の循環依存警告の抑制
  //
  // @formatjs/ecma402-abstract@3.1.1 の内部で以下の循環 import が存在する:
  //   types/number.js -> types/plural-rules.js -> types/number.js
  //
  // これは TypeScript ソース上の型のみの相互参照（import type）が、
  // トランスパイル後の .js ファイルに副作用 import として残ったものである。
  // 実際の .js ファイルは値のエクスポートを一切含まず、
  // ランタイムで循環参照による未定義値は発生しない。
  //
  // 型の相互参照の内容:
  //   - types/number.d.ts が types/plural-rules.d.ts から LDMLPluralRule 型を import
  //   - types/plural-rules.d.ts が types/number.d.ts から NumberFormatDigitInternalSlots 型を import
  //
  // @formatjs/ecma402-abstract をアップグレードした際は、
  // この循環が解消されているか再確認すること。
  onwarn(warning, defaultHandler) {
    if (
      warning.code === "CIRCULAR_DEPENDENCY" &&
      warning.ids?.some((id) => id.includes("@formatjs/ecma402-abstract"))
    ) {
      return;
    }
    defaultHandler(warning);
  },
};
