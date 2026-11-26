export const HANDOFF_PREFIX = "selection:";
export const MAX_SELECTION = 1024 * 1024;
export const HANDOFF_TTL = 10 * 60 * 1000;
export function validHandoff(
  value: unknown,
  now = Date.now(),
): value is { text: string; created: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === "string" &&
    v.text.length <= MAX_SELECTION &&
    typeof v.created === "number" &&
    Number.isFinite(v.created) &&
    v.created <= now &&
    now - v.created <= HANDOFF_TTL
  );
}
export async function receiveSelection(): Promise<string | undefined> {
  if (location.protocol !== "chrome-extension:") return;
  const id = new URLSearchParams(location.hash.slice(1)).get("selection");
  if (!id) return;
  if (!/^[0-9a-f-]{36}$/.test(id)) throw Error("无效的选中文字请求");
  const key = HANDOFF_PREFIX + id;
  const stored = (await chrome.storage.session.get(key))[key];
  if (!validHandoff(stored)) throw Error("选中文字已过期，请返回网页重新发送");
  // Remove only after the caller has received the text; hash stays until import finishes.
  return stored.text;
}
export async function acknowledgeSelection() {
  const id = new URLSearchParams(location.hash.slice(1)).get("selection");
  if (id) await chrome.storage.session.remove(HANDOFF_PREFIX + id);
  history.replaceState(null, "", location.pathname);
}
