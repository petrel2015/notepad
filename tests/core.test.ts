import { describe, it, expect } from "vitest";
import { scanFile, readWindow } from "../src/large-core";
import { jsonTool, lineEnding, statistics } from "../src/text";
import { validateTheme, builtins } from "../src/themes";
import { findMatches } from "../src/search-core";
describe("streaming literal pipeline", () => {
  it("matches independent split/join oracle across byte boundaries", async () => {
    for (const text of [
      "abcabcab",
      "中文😀ab中文😀ab",
      "aaa",
      "\ufefffirst\r\nsecond\r\n",
      "x😀x😀x",
      "needle".repeat(300),
    ])
      for (const query of [
        "ab",
        "中文😀",
        "aa",
        "\r\n",
        "x",
        "needle",
        "absent",
      ])
        for (const chunkSize of [1, 2, 3, 5, 17, 256]) {
          const writes: Uint8Array[] = [];
          const r = await scanFile(new Blob([text]), {
            query,
            replacement: "🚀替换",
            chunkSize,
            write: async (s) => {
              writes.push(new TextEncoder().encode(s));
            },
          });
          const bytes = await new Blob(writes as BlobPart[]).arrayBuffer();
          const actual = new TextDecoder("utf-8", {
            ignoreBOM: true,
            fatal: true,
          }).decode(bytes);
          expect(actual).toBe(text.split(query).join("🚀替换"));
          expect(r.count).toBe(text.split(query).length - 1);
        }
  }, 20000);
  it("supports deletion and search terms longer than chunks", async () => {
    let out = "";
    const r = await scanFile(new Blob(["a long needle a long needle"]), {
      query: "long needle",
      replacement: "",
      chunkSize: 2,
      write: async (s) => {
        out += s;
      },
    });
    expect(out).toBe("a  a ");
    expect(r.count).toBe(2);
  });
  it("preserves BOM and does not re-match generated content", async () => {
    let out = "";
    await scanFile(new Blob(["\ufeffaaa"]), {
      query: "aa",
      replacement: "aaaa",
      chunkSize: 1,
      write: async (s) => {
        out += s;
      },
    });
    expect(out).toBe("\ufeffaaaaa");
  });
  it("rejects invalid input and empty query", async () => {
    await expect(
      scanFile(new Blob([new Uint8Array([0xff])]), { query: "x" }),
    ).rejects.toThrow();
    await expect(scanFile(new Blob(["ok"]), { query: "" })).rejects.toThrow();
  });
  it("honors cancellation and write errors", async () => {
    const c = new AbortController();
    let calls = 0;
    await expect(
      scanFile(new Blob(["abc".repeat(100)]), {
        query: "a",
        chunkSize: 3,
        signal: c.signal,
        write: async () => {
          calls++;
          c.abort();
        },
      }),
    ).rejects.toThrow("已取消");
    expect(calls).toBe(1);
    await expect(
      scanFile(new Blob(["abc"]), {
        query: "a",
        write: async () => {
          throw Error("disk full");
        },
      }),
    ).rejects.toThrow("disk full");
  });
  it("bounds writes on a long line and counts dense matches", async () => {
    let max = 0;
    const r = await scanFile(new Blob(["a".repeat(100000)]), {
      query: "a",
      replacement: "bb",
      chunkSize: 1024,
      write: async (s) => {
        max = Math.max(max, s.length);
      },
    });
    expect(r.count).toBe(100000);
    expect(max).toBeLessThanOrEqual(2048);
  });
  it("does not drop characters between adjacent windows", async () => {
    const blob = new Blob(["a".repeat(65535) + "😀中文"]);
    const a = await readWindow(blob, 0),
      b = await readWindow(blob, 65536);
    expect(a.text + b.text).toBe(await blob.text());
    expect(a.end).toBe(b.start);
  });
  it("presents independently bounded UTF-8 windows", async () => {
    const blob = new Blob(["中😀".repeat(30000)]);
    for (const offset of [0, 65536, 131072]) {
      const w = await readWindow(blob, offset);
      expect(w.text).not.toContain("\ufffd");
      expect(w.end - w.start).toBeLessThanOrEqual(65539);
    }
  });
});
describe("JSON and text semantics", () => {
  it("preserves numeric lexemes and strings", () => {
    const input =
      '{"id":900719925474099312345,"n":1.234567890123456789,"str":"a  b"}';
    expect(jsonTool(jsonTool(input, "format"), "minify")).toBe(input);
  });
  it("rejects escaped duplicate keys and comments", () => {
    expect(() => jsonTool('{"a":1,"\\u0061":2}', "format")).toThrow("重复");
    expect(() => jsonTool('{/*x*/"a":1}', "format")).toThrow();
    expect(() => jsonTool('{"a":1,}', "format")).toThrow();
  });
  it("counts codepoints and selection endpoint correctly", () => {
    expect(statistics("😀a\nb", 0, 4)).toMatchObject({
      line: 2,
      column: 1,
      chars: 4,
      selected: 3,
      selectedLines: 1,
    });
    expect(lineEnding("a\r\nb\nc")).toMatchObject({ mixed: true });
  });
});
describe("theme contracts", () => {
  it("resolves defaults and retains format", () => {
    const t = validateTheme({
      version: 1,
      id: "custom",
      name: "Custom",
      base: "dark",
      colors: { "editor.background": "#112233" },
    });
    expect(t.colors["editor.background"]).toBe("#112233");
    expect(t.colors["ui.panel"]).toBe(builtins[1].colors["ui.panel"]);
    expect(validateTheme(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
  it("rejects unsafe and unknown data", () => {
    for (const colors of [
      { "editor.background": "url(https://example.com)" },
      { unknown: "#112233" },
      JSON.parse('{"__proto__":"#112233"}'),
    ])
      expect(() =>
        validateTheme({
          version: 1,
          id: "test",
          name: "test",
          base: "dark",
          colors,
        }),
      ).toThrow();
    expect(() => validateTheme({ ...builtins[0], version: 2 })).toThrow();
  });
});
describe("normal search", () => {
  const defaults = {
    query: "a",
    replacement: "b",
    caseSensitive: true,
    wholeWord: false,
    regex: false,
  };
  it("literal escaping and unicode boundaries", () => {
    expect(findMatches("a.b a+b", { ...defaults, query: "a.b" }).count).toBe(1);
    expect(
      findMatches("cat scatter 猫cat cat猫 cat", {
        ...defaults,
        query: "cat",
        wholeWord: true,
      }).count,
    ).toBe(2);
  });
  it("supports captures and zero-width termination", () => {
    expect(
      findMatches("ab ab", {
        ...defaults,
        query: "(a)(b)",
        replacement: "$2$1",
        regex: true,
      }).matches[0].replacement,
    ).toBe("ba");
    expect(
      findMatches("😀", { ...defaults, query: "(?:)", regex: true }).count,
    ).toBe(2);
  });
  it("caps result storage but counts total", () => {
    expect(findMatches("aaaa", defaults, 2)).toMatchObject({
      count: 4,
      truncated: true,
      matches: [
        { from: 0, to: 1, replacement: "b" },
        { from: 1, to: 2, replacement: "b" },
      ],
    });
  });
});
