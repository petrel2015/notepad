import {
  HANDOFF_PREFIX,
  MAX_SELECTION,
  validHandoff,
} from "./extension-handoff";
const MENU = "notepad-edit-selection";
async function setupMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU,
    title: "在 Notepad 中编辑选中文字",
    contexts: ["selection"],
  });
}
chrome.runtime.onInstalled.addListener(() => {
  void setupMenu().catch(console.error);
});
chrome.action.onClicked.addListener(() => {
  void chrome.tabs
    .create({ url: chrome.runtime.getURL("index.html") })
    .catch(console.error);
});
async function openSelection(text: string) {
  // Serialize menu events to keep cleanup and the storage quota bounded.
  const old = await chrome.storage.session.get(null);
  const expired = Object.keys(old).filter(
    (key) => key.startsWith(HANDOFF_PREFIX) && !validHandoff(old[key]),
  );
  if (expired.length) await chrome.storage.session.remove(expired);
  if (text.length > MAX_SELECTION)
    throw Error("选中文字超过 1 Mi 字符，请保存为文件后打开");
  const id = crypto.randomUUID();
  const key = HANDOFF_PREFIX + id;
  await chrome.storage.session.set({ [key]: { text, created: Date.now() } });
  try {
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`index.html#selection=${id}`),
    });
  } catch (error) {
    await chrome.storage.session.remove(key);
    throw error;
  }
}
let queue = Promise.resolve();
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU || !info.selectionText) return;
  queue = queue
    .then(() => openSelection(info.selectionText!))
    .catch(async (error) => {
      console.error("Notepad selection import failed", error);
      await chrome.tabs.create({
        url: chrome.runtime.getURL("index.html#import-error=1"),
      });
    });
});
