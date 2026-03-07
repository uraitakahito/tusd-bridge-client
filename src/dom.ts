/**
 * 軽量 DOM 構築ヘルパー。
 *
 * @module
 */

/**
 * HTML 要素を生成し、プロパティの設定と子要素の追加を一括で行う。
 *
 * - `class` キーは `className` にマッピングされる
 * - 文字列の子要素はテキストノードとして追加される
 *
 * @example
 * ```ts
 * const input = h("input", { type: "text", class: "my-input" });
 * const label = h("label", { class: "my-label" }, "Name:", input);
 * ```
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, string | boolean> | null,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") {
        el.className = value as string;
      } else {
        (el as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  for (const child of children) {
    el.append(child);
  }

  return el;
}
