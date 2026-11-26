import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
const root = "dist-extension/";
const manifest = JSON.parse(await readFile(root + "manifest.json", "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["contextMenus", "storage"]);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts, undefined);
for (const path of [
  manifest.background.service_worker,
  manifest.options_ui.page,
  ...Object.values(manifest.icons),
])
  assert((await stat(root + path)).size > 0, path);
const html = await readFile(root + "index.html", "utf8");
for (const [, path] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert(!/^(https?:|\/)/.test(path), path);
  await stat(root + path.replace(/^\.\//, ""));
}
const assets = await readdir(root + "assets");
assert(assets.some((n) => n.startsWith("search.worker-")));
assert(assets.some((n) => n.startsWith("large.worker-")));
for (const file of assets.filter((n) => n.endsWith(".js"))) {
  const source = await readFile(root + "assets/" + file, "utf8");
  assert(!/\beval\s*\(|new Function\s*\(/.test(source), file);
}
console.log(
  "PASS: manifest, permissions, entrypoints, bundled assets, both Workers, no eval/new Function",
);
