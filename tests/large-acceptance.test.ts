import { it, expect } from "vitest";
import { openAsBlob } from "node:fs";
import { open, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { scanFile } from "../src/large-core";
it.skipIf(process.env.NOTEPAD_LARGE_ACCEPTANCE !== "1")(
  "100 MiB disk-backed streaming replacement matches independent digest",
  async () => {
    const manifest = JSON.parse(
      await readFile(".local/fixtures/manifest.json", "utf8"),
    );
    const input = manifest.find((x: any) => x.file === "large-100mb.txt");
    const blob = await openAsBlob(".local/fixtures/" + input.file);
    const output = ".local/fixtures/replaced-100mb.txt";
    const handle = await open(output, "w");
    const hash = createHash("sha256");
    let outputBytes = 0,
      maxWriteBytes = 0;
    const started = performance.now();
    let result;
    try {
      result = await scanFile(blob, {
        query: "token-needle",
        replacement: "替换🚀",
        write: async (text) => {
          const bytes = Buffer.from(text);
          hash.update(bytes);
          outputBytes += bytes.length;
          maxWriteBytes = Math.max(maxWriteBytes, bytes.length);
          await handle.writeFile(bytes);
        },
      });
    } finally {
      await handle.close();
    }
    const diskHash = createHash("sha256");
    const diskReader = (await openAsBlob(output)).stream().getReader();
    for (;;) {
      const part = await diskReader.read();
      if (part.done) break;
      diskHash.update(part.value);
    }
    const expected = createHash("sha256");
    const record = Buffer.from("2026-10-28 INFO 中文😀 替换🚀 sample text\r\n");
    let remaining = input.matches;
    while (remaining) {
      const n = Math.min(remaining, 10000);
      expected.update(Buffer.from(record.toString().repeat(n)));
      remaining -= n;
    }
    const digest = hash.digest("hex");
    expect(digest).toBe(expected.digest("hex"));
    expect(diskHash.digest("hex")).toBe(digest);
    expect(result!.count).toBe(input.matches);
    expect(outputBytes).toBe(record.length * input.matches);
    expect(maxWriteBytes).toBeLessThan(400000);
    const evidence = {
      inputBytes: input.bytes,
      matches: result!.count,
      outputBytes,
      sha256: digest,
      elapsedMs: Math.round(performance.now() - started),
      maxWriteBytes,
      node: process.version,
      platform: process.platform,
      kind: "Node disk-backed algorithm acceptance; not browser native-save verification",
    };
    await writeFile(
      ".local/large-acceptance.json",
      JSON.stringify(evidence, null, 2),
    );
    await rm(output);
    console.log(JSON.stringify(evidence));
  },
  30000,
);
