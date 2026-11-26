import {
  parseTree,
  format,
  applyEdits,
  printParseErrorCode,
  type Node,
  type ParseError,
} from "jsonc-parser";
export function jsonTool(text: string, mode: "format" | "minify" | "validate") {
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });
  if (errors.length || !tree) {
    const e = errors[0];
    throw new Error(
      `JSON ${e ? printParseErrorCode(e.error) : "为空"} · 位置 ${(e?.offset ?? 0) + 1}`,
    );
  }
  const walk = (n: Node) => {
    if (n.type === "object") {
      const keys = new Set<string>();
      for (const p of n.children ?? []) {
        const k = p.children![0];
        if (keys.has(k.value))
          throw new Error(
            `重复字段 ${JSON.stringify(k.value)} · 位置 ${k.offset + 1}`,
          );
        keys.add(k.value);
      }
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  if (mode === "validate") return text;
  if (mode === "format")
    return applyEdits(
      text,
      format(text, undefined, { insertSpaces: true, tabSize: 2, eol: "\n" }),
    );
  // Remove whitespace only outside strings; retain every numeric and string lexeme.
  let out = "",
    inside = false,
    escape = false;
  for (const c of text) {
    if (inside) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inside = false;
    } else if (c === '"') {
      inside = true;
      out += c;
    } else if (!/\s/.test(c)) out += c;
  }
  return out;
}
export function lineEnding(text: string) {
  const ends = text.match(/\r\n|\r|\n/g) ?? [];
  const types = new Set(ends);
  return {
    mixed: types.size > 1,
    eol: ends[0] ?? "\n",
    label:
      types.size > 1
        ? "混合"
        : ends[0] === "\r\n"
          ? "CRLF"
          : ends[0] === "\r"
            ? "CR"
            : "LF",
  };
}
export function statistics(text: string, anchor: number, head: number) {
  const before = text.slice(0, head),
    lo = Math.min(anchor, head),
    hi = Math.max(anchor, head),
    selected = text.slice(lo, hi);
  return {
    line: before.split("\n").length,
    column: Array.from(before.slice(before.lastIndexOf("\n") + 1)).length + 1,
    chars: Array.from(text).length,
    lines: text.split("\n").length,
    selected: Array.from(selected).length,
    selectedLines: selected
      ? selected.split("\n").length - (selected.endsWith("\n") ? 1 : 0)
      : 0,
  };
}
export function cleanText(text: string, mode: string) {
  const rows = text.split("\n");
  switch (mode) {
    case "trim":
      return rows.map((s) => s.replace(/[\t ]+$/, "")).join("\n");
    case "blank":
      return rows.filter((s) => s.trim()).join("\n");
    case "unique":
      return [...new Set(rows)].join("\n");
    case "sort":
      return [...rows].sort().join("\n");
    default:
      return text;
  }
}
