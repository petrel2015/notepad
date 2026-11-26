import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HANDOFF_TTL,
  MAX_SELECTION,
  receiveSelection,
  acknowledgeSelection,
  validHandoff,
} from "../src/extension-handoff";
afterEach(() => vi.unstubAllGlobals());
describe("extension selection handoff", () => {
  it("rejects stale, future, oversized and malformed payloads", () => {
    expect(validHandoff({ text: "中文🚀", created: 100 }, 101)).toBe(true);
    for (const v of [
      null,
      {},
      { text: 3, created: 100 },
      { text: "x", created: Infinity },
      { text: "x", created: 102 },
      { text: "x", created: 100 - HANDOFF_TTL },
      { text: "x".repeat(MAX_SELECTION + 1), created: 100 },
    ])
      expect(validHandoff(v, 101)).toBe(false);
  });
  it("never touches extension APIs in the web app", async () => {
    vi.stubGlobal("location", {
      protocol: "https:",
      hash: "#selection=anything",
    });
    expect(await receiveSelection()).toBeUndefined();
  });
  it("keeps payload until import acknowledgement, then removes it and the URL token", async () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    const get = vi.fn().mockResolvedValue({
      ["selection:" + id]: {
        text: "<script>中文🚀</script>",
        created: Date.now(),
      },
    });
    const remove = vi.fn().mockResolvedValue(undefined),
      replaceState = vi.fn();
    vi.stubGlobal("location", {
      protocol: "chrome-extension:",
      hash: "#selection=" + id,
      pathname: "/index.html",
    });
    vi.stubGlobal("chrome", { storage: { session: { get, remove } } });
    vi.stubGlobal("history", { replaceState });
    expect(await receiveSelection()).toBe("<script>中文🚀</script>");
    expect(remove).not.toHaveBeenCalled();
    await acknowledgeSelection();
    expect(remove).toHaveBeenCalledWith("selection:" + id);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/index.html");
  });
  it("reports an expired request without silently importing an empty document", async () => {
    vi.stubGlobal("location", {
      protocol: "chrome-extension:",
      hash: "#selection=12345678-1234-1234-1234-123456789abc",
    });
    vi.stubGlobal("chrome", {
      storage: { session: { get: vi.fn().mockResolvedValue({}) } },
    });
    await expect(receiveSelection()).rejects.toThrow("已过期");
  });
});
