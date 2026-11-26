import { build } from "vite";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
await build({
  base: "./",
  build: { outDir: "dist-extension", emptyOutDir: true },
});
await build({
  publicDir: false,
  build: {
    outDir: "dist-extension",
    emptyOutDir: false,
    lib: {
      entry: "src/extension-background.ts",
      formats: ["es"],
      fileName: () => "background.js",
    },
  },
});
await copyFile("extension/manifest.json", "dist-extension/manifest.json");
// Deterministic PNG icon generator; no image dependency or remote asset.
function crc32(b) {
  let c = 0xffffffff;
  for (const n of b) {
    c ^= n;
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    c = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, c]);
}
await mkdir("dist-extension/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        ink =
          v > 0.23 &&
          v < 0.77 &&
          ((u > 0.23 && u < 0.34) ||
            (u > 0.66 && u < 0.77) ||
            (Math.abs(u - v) < 0.065 && u > 0.28 && u < 0.72));
      const p = y * (size * 4 + 1) + 1 + x * 4;
      raw.set(ink ? [255, 255, 255, 255] : [47, 104, 91, 255], p);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  await writeFile(
    `dist-extension/icons/${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
console.log("Chrome extension ready: dist-extension/");
