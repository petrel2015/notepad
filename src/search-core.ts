export interface SearchOptions {
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}
export interface Match {
  from: number;
  to: number;
  replacement: string;
}
export function findMatches(
  text: string,
  o: SearchOptions,
  limit = 20000,
): { matches: Match[]; count: number; truncated: boolean } {
  if (!o.query) return { matches: [], count: 0, truncated: false };
  const pattern = o.regex
    ? o.query
    : o.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(pattern, "gu" + (o.caseSensitive ? "" : "i")),
    matches: Match[] = [];
  let count = 0,
    m: RegExpExecArray | null;
  const word = (s: string) => /[\p{L}\p{M}\p{N}_]/u.test(s);
  while ((m = re.exec(text))) {
    const from = m.index,
      to = from + m[0].length;
    const prev =
        Array.from(text.slice(Math.max(0, from - 2), from)).at(-1) ?? "",
      next = Array.from(text.slice(to, to + 2))[0] ?? "";
    if (!o.wholeWord || (!word(prev) && !word(next))) {
      count++;
      if (matches.length < limit) {
        const replacement = o.regex
          ? o.replacement.replace(/\$\$|\$&|\$(\d{1,2})/g, (v, n) =>
              v === "$$" ? "$" : v === "$&" ? m![0] : (m![Number(n)] ?? v),
            )
          : o.replacement;
        matches.push({ from, to, replacement });
      }
    }
    if (m[0].length === 0) {
      const cp = text.codePointAt(re.lastIndex);
      re.lastIndex += cp !== undefined && cp > 0xffff ? 2 : 1;
    }
  }
  return { matches, count, truncated: count > matches.length };
}
