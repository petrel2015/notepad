import { scanFile } from "./large-core";
let controller: AbortController | undefined;
self.onmessage = async (e) => {
  const d = e.data;
  if (d.type === "cancel") {
    controller?.abort();
    return;
  }
  controller = new AbortController();
  const signal = controller.signal;
  let writer: any;
  try {
    if (d.target) writer = await d.target.createWritable();
    const positions: number[] = [];
    let last = 0;
    const result = await scanFile(d.file, {
      query: d.query,
      replacement: d.replacement,
      signal,
      onMatch: (_p, byte) => {
        if (positions.length < 200) positions.push(byte);
      },
      onProgress: (bytes, count) => {
        if (performance.now() - last > 80 || bytes === d.file.size) {
          self.postMessage({ id: d.id, type: "progress", bytes, count });
          last = performance.now();
        }
      },
      write: writer
        ? async (text) => {
            await writer.write(text);
          }
        : undefined,
    });
    if (signal.aborted) throw new DOMException("已取消", "AbortError");
    if (writer) await writer.close();
    self.postMessage({ id: d.id, type: "done", ...result, positions });
  } catch (err) {
    if (writer)
      try {
        await writer.abort();
      } catch {}
    self.postMessage({
      id: d.id,
      type: "error",
      error: String(err),
      cancelled: signal.aborted,
    });
  }
};
