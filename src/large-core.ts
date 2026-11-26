export interface StreamOptions {
  query: string;
  replacement?: string;
  chunkSize?: number;
  signal?: AbortSignal;
  onProgress?: (bytes: number, count: number) => void;
  onMatch?: (offset: number, byteOffset: number) => void;
  write?: (text: string) => Promise<void>;
}
export async function scanFile(file: Blob, o: StreamOptions) {
  if (!o.query) throw new Error("查找内容不能为空");
  if (o.query.length > 65536 || (o.replacement?.length ?? 0) > 65536)
    throw new Error("查找或替换内容不得超过 65536 个 UTF-16 单元");
  for (const value of [o.query, o.replacement ?? ""])
    for (const char of value) {
      const c = char.charCodeAt(0);
      if (char.length === 1 && c >= 0xd800 && c <= 0xdfff)
        throw new Error("查找或替换内容包含不完整的 Unicode 字符");
    }
  const size = o.chunkSize ?? 256 * 1024;
  if (!Number.isInteger(size) || size < 1 || size > 1024 * 1024)
    throw Error("无效读取块大小");
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }),
    encoder = new TextEncoder();
  let carry = "",
    base = 0,
    byteBase = 0,
    count = 0,
    lastYield = performance.now();
  const check = () => {
    if (o.signal?.aborted) throw new DOMException("已取消", "AbortError");
  };
  let pieces: string[] = [],
    outputLength = 0;
  const flush = async () => {
    if (o.write && outputLength) {
      check();
      await o.write(pieces.join(""));
      check();
      pieces = [];
      outputLength = 0;
    }
  };
  const append = (s: string) => {
    if (o.write) {
      pieces.push(s);
      outputLength += s.length;
    }
  };
  for (let pos = 0; pos < file.size || pos === 0; pos += size) {
    check();
    const end = Math.min(pos + size, file.size),
      last = end === file.size;
    const bytes = await file.slice(pos, end).arrayBuffer();
    check();
    carry += decoder.decode(bytes, { stream: !last });
    const safe = last
      ? carry.length
      : Math.max(0, carry.length - o.query.length + 1);
    let cursor = 0,
      found: number;
    while ((found = carry.indexOf(o.query, cursor)) !== -1 && found < safe) {
      count++;
      if (count <= 200)
        o.onMatch?.(
          base + found,
          byteBase + encoder.encode(carry.slice(0, found)).length,
        );
      append(carry.slice(cursor, found));
      append(o.replacement ?? "");
      cursor = found + o.query.length;
      if (outputLength >= 65536) await flush();
    }
    let consumed = Math.max(cursor, safe);
    if (
      consumed < carry.length &&
      consumed > 0 &&
      carry.charCodeAt(consumed) >= 0xdc00 &&
      carry.charCodeAt(consumed) <= 0xdfff &&
      carry.charCodeAt(consumed - 1) >= 0xd800 &&
      carry.charCodeAt(consumed - 1) <= 0xdbff
    )
      consumed--;
    append(carry.slice(cursor, consumed));
    await flush();
    byteBase += encoder.encode(carry.slice(0, consumed)).length;
    carry = carry.slice(consumed);
    base += consumed;
    o.onProgress?.(end, count);
    if (last) break;
    if (performance.now() - lastYield > 16) {
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }
  }
  return { count };
}
export async function readWindow(file: Blob, offset: number, size = 65536) {
  const requested = Math.max(0, Math.min(offset, file.size)),
    base = Math.max(0, requested - 3);
  const bytes = new Uint8Array(
    await file
      .slice(base, Math.min(file.size, requested + size + 4))
      .arrayBuffer(),
  );
  let a = requested - base;
  while (a > 0 && (bytes[a] & 0xc0) === 0x80) a--;
  let b = Math.min(requested - base + size, bytes.length);
  if (base + b < file.size) {
    while (b > a && (bytes[b] & 0xc0) === 0x80) b--;
  }
  return {
    text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(a, b),
    ),
    start: base + a,
    end: base + b,
  };
}
