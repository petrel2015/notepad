import { receiveSelection, acknowledgeSelection } from "./extension-handoff";
import "./style.css";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { EditorView, Decoration, type DecorationSet } from "@codemirror/view";
import { undo, redo, historyField } from "@codemirror/commands";
import { MergeView } from "@codemirror/merge";
import {
  editorExtensions,
  wrapping,
  markers,
  markerExtensions,
} from "./editor";
import { jsonTool, lineEnding, statistics, cleanText } from "./text";
import {
  builtins,
  validateTheme,
  applyTheme,
  THEME_KEY,
  PREF_KEY,
  type Theme,
} from "./themes";
import { readWindow } from "./large-core";
import type { Match, SearchOptions } from "./search-core";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const LARGE_LIMIT = 16 * 1024 * 1024;
const MAX_NORMAL_OUTPUT = 32 * 1024 * 1024;
interface Doc {
  id: number;
  name: string;
  state?: EditorState;
  text: string;
  dirty: boolean;
  eol: string;
  bom: boolean;
  mixed: boolean;
  raw?: string;
  file?: File;
  handle?: any;
  large: boolean;
  offset: number;
}
let nextId = 0,
  docs: Doc[] = [],
  active = 0,
  view: EditorView | undefined,
  merge: MergeView | undefined,
  focused: EditorView | undefined,
  compareId: number | undefined,
  wrap = false,
  visible = false;
let custom: Theme[] = [],
  theme = builtins[0],
  storageProblem = "";
try {
  const saved = JSON.parse(localStorage.getItem(THEME_KEY) ?? "[]");
  if (!Array.isArray(saved)) throw Error("主题存储损坏");
  custom = saved
    .map(validateTheme)
    .filter((t) => !["light", "dark"].includes(t.id));
  const pref = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
  theme = [...builtins, ...custom].find((t) => t.id === pref.theme) ?? theme;
} catch {
  storageProblem = "本地主题数据无法读取，已回退到白昼主题。原数据未覆盖。";
}
applyTheme(theme);
$("#app").innerHTML =
  `<header class="topbar"><div class="brand"><span class="brand-icon">N</span><strong>Notepad</strong><span class="brand-caption">文本工作台</span></div><div class="top-actions"><span class="local-badge"><i></i> 本地处理</span><button id="theme-toggle" title="切换黑白主题">◐</button><button id="themes-open">主题设置</button></div></header>
<nav class="toolbar" aria-label="编辑工具"><div class="toolgroup"><button id="new" title="新建文本">＋ 新建</button><button id="open">打开文件</button><button id="import" title="兼容方式导入；大文件另存需要使用打开文件获取句柄">导入</button><button id="save" class="primary-soft">保存</button></div><div class="toolgroup"><button id="undo" title="撤销">↶</button><button id="redo" title="重做">↷</button><button id="search-open">查找 / 替换 <kbd>⌘ F</kbd></button></div><div class="toolgroup"><button id="compare">双文本对比</button><select id="tools" aria-label="文本工具"><option value="">文本工具</option><option value="format">JSON 格式化</option><option value="minify">JSON 压缩</option><option value="validate">JSON 校验</option><option value="trim">清理行尾空白</option><option value="blank">删除空行</option><option value="unique">按行去重</option><option value="sort">按行排序</option></select></div><div class="toolgroup right"><button id="visible" title="显示空格、Tab 和换行符">¶ 可见字符</button><button id="wrap">↵ 自动换行</button><button id="goto">跳转行</button></div></nav>
<div id="tabs" class="tabs" role="tablist"></div>
<section id="search-panel" class="search-panel" hidden><div class="search-fields"><input id="query" aria-label="查找文本" placeholder="查找文本"><input id="replacement" aria-label="替换为" placeholder="替换为（可以为空）"><button id="find" class="primary">查找</button><button id="previous">↑</button><button id="next">↓</button><button id="replace">替换当前</button><button id="replace-all">全部替换</button><button id="search-close" aria-label="关闭查找">×</button></div><div class="search-options"><label><input type="checkbox" id="case">区分大小写</label><label><input type="checkbox" id="whole">全词</label><label><input type="checkbox" id="regex">正则</label><label><input type="checkbox" id="scope">仅选区</label><span id="search-count">输入查找内容</span><button id="cancel-task" hidden>取消任务</button></div></section>
<div id="compare-bar" class="compare-bar" hidden><span>左侧：<strong id="left-name"></strong></span><label>右侧：<select id="compare-select"></select></label><button id="direction">合并方向：左 → 右</button><button id="diff-prev">↑ 上一差异</button><button id="diff-next">↓ 下一差异</button><button id="compare-close">退出对比</button></div>
<div id="file-note" class="file-note" hidden></div><main id="workspace"><div id="editor"></div><section id="large-view" hidden><div class="large-toolbar"><span class="mode-pill">大文件 · 分块只读</span><span id="large-range"></span><button id="page-prev">← 上一块</button><button id="page-next">下一块 →</button><button id="large-search">全局查找 / 替换</button></div><pre id="large-content" tabindex="0"></pre><div id="large-results" hidden></div><div id="large-hint">窗口最多显示 64 KiB。全局查找扫描完整文件（固定文本、区分大小写）；替换结果流式写入新文件。</div></section></main>
<footer class="statusbar"><div><span id="status-mode">文本</span><span id="position">第 1 行，第 1 列</span><span id="selection"></span></div><div><span id="counts"></span><span id="encoding">UTF-8</span><span id="ending">LF</span><span id="dirty">未修改</span></div></footer>
<div id="toast" role="status" hidden></div>
<dialog id="themes-dialog"><div class="dialog-head"><h2>主题设置</h2><button id="themes-close" aria-label="关闭主题设置">×</button></div><p class="muted">黑白之间，也可以有你的颜色。主题以 JSON 保存和分享。</p><div id="theme-cards"></div><div class="theme-actions"><button id="theme-import">导入 JSON</button><button id="theme-export">导出当前主题</button><button id="theme-copy">复制并编辑</button><button id="theme-delete">删除自定义主题</button></div><label class="field-label" for="theme-json">主题 JSON</label><textarea id="theme-json" spellcheck="false"></textarea><div class="dialog-footer"><span id="theme-error" role="status"></span><button id="theme-apply" class="primary">校验并应用</button></div></dialog>
<input type="file" id="file-input" hidden multiple><input type="file" id="theme-input" accept=".json,application/json" hidden>`;
let toastTimer: number;
function toast(s: string) {
  $("#toast").textContent = s;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => ($("#toast").hidden = true), 7000);
}
const current = () => docs.find((d) => d.id === active)!;
const textOf = (d: Doc) => d.state?.doc.toString() ?? d.text;
function newDoc(name = "未命名.txt", text = "") {
  const d: Doc = {
    id: ++nextId,
    name,
    text,
    dirty: false,
    eol: "\n",
    bom: false,
    mixed: false,
    large: false,
    offset: 0,
  };
  docs.push(d);
  return d;
}
function persistTheme() {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(custom));
    localStorage.setItem(PREF_KEY, JSON.stringify({ theme: theme.id }));
    storageProblem = "";
  } catch {
    storageProblem = "主题仅本次生效，未保存到浏览器";
    toast("主题仅本次生效：浏览器拒绝存储或存储空间已满。可导出 JSON 备份。");
  }
}
function selectTheme(t: Theme) {
  theme = t;
  applyTheme(t);
  persistTheme();
  renderThemeCards();
}
function renderThemeCards() {
  const box = $("#theme-cards");
  box.replaceChildren();
  for (const t of [...builtins, ...custom]) {
    const b = document.createElement("button");
    b.className = "theme-card" + (theme.id === t.id ? " selected" : "");
    const swatch = document.createElement("span");
    swatch.style.background = t.colors["editor.background"];
    swatch.style.color = t.colors["editor.foreground"];
    swatch.textContent = "Aa";
    b.append(swatch, document.createTextNode(t.name));
    b.onclick = () => {
      selectTheme(t);
      $("#theme-json").textContent = "";
      $<HTMLTextAreaElement>("#theme-json").value = JSON.stringify(t, null, 2);
    };
    box.append(b);
  }
}
function renderTabs() {
  const box = $("#tabs");
  box.replaceChildren();
  for (const d of docs) {
    const tab = document.createElement("div");
    tab.className = "tab" + (d.id === active ? " active" : "");
    const b = document.createElement("button");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(d.id === active));
    b.textContent =
      (d.large ? "▤ " : d.name.endsWith(".json") ? "{} " : "≡ ") +
      d.name +
      (d.dirty ? " •" : "");
    b.onclick = () => switchDoc(d.id);
    const close = document.createElement("button");
    close.className = "tab-close";
    close.textContent = "×";
    close.setAttribute("aria-label", `关闭 ${d.name}`);
    close.onclick = () => {
      if (d.dirty && !confirm(`${d.name} 尚未保存，确定关闭？`)) return;
      if (compareId === d.id) compareId = undefined;
      docs = docs.filter((x) => x !== d);
      if (!docs.length) newDoc();
      if (active === d.id) active = docs[0].id;
      render();
    };
    tab.append(b, close);
    box.append(tab);
  }
}
let statusTimer: number;
function updateStatus(v?: EditorView) {
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    const ev = v ?? focused ?? view;
    const d =
      merge && ev === merge.b
        ? docs.find((x) => x.id === compareId)!
        : current();
    if (d.large) {
      $("#position").textContent = "按字节分块浏览";
      $("#counts").textContent =
        `${(d.file!.size / 1024 / 1024).toFixed(1)} MiB`;
      $("#selection").textContent = "";
    } else {
      const t = ev?.state.doc.toString() ?? textOf(d),
        sel = ev?.state.selection.main;
      const s = statistics(t, sel?.anchor ?? 0, sel?.head ?? 0);
      $("#position").textContent =
        `第 ${s.line.toLocaleString()} 行，第 ${s.column.toLocaleString()} 列`;
      $("#selection").textContent = s.selected
        ? `已选 ${s.selected.toLocaleString()} 字符 / ${s.selectedLines} 行`
        : "";
      $("#counts").textContent =
        `${s.lines.toLocaleString()} 行 · ${s.chars.toLocaleString()} 字符 · ${new Blob([(d.bom ? "\ufeff" : "") + (d.mixed ? d.raw! : t.replaceAll("\n", d.eol))]).size.toLocaleString()} B`;
    }
    $("#ending").textContent = d.large
      ? "换行未统计"
      : d.mixed
        ? "混合"
        : d.eol === "\r\n"
          ? "CRLF"
          : d.eol === "\r"
            ? "CR"
            : "LF";
    $("#encoding").textContent = d.large
      ? "UTF-8 限定"
      : d.bom
        ? "UTF-8 BOM"
        : "UTF-8";
    $("#dirty").textContent = d.large
      ? "只读浏览"
      : d.dirty
        ? "● 已修改"
        : "未修改";
    $("#status-mode").textContent = d.large
      ? "大文件"
      : merge
        ? "对比"
        : "纯文本";
  }, 60);
}
function changed(d: Doc, v: EditorView) {
  const old = d.state;
  d.state = v.state;
  if (old?.doc !== v.state.doc) {
    d.dirty = true;
    renderTabs();
    invalidateSearch(false);
  }
  focused = v;
  updateStatus(v);
}
const matchesEffect = StateEffect.define<Match[]>();
const matchField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    if (tr.docChanged) value = Decoration.none;
    for (const e of tr.effects)
      if (e.is(matchesEffect))
        value = Decoration.set(
          e.value
            .filter((m) => m.to > m.from)
            .map((m) =>
              Decoration.mark({ class: "search-match" }).range(m.from, m.to),
            ),
          true,
        );
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});
function extensionsFor(d: Doc) {
  return [
    ...editorExtensions(
      (v) => changed(d, v),
      (v) => {
        if (focused !== v) invalidateSearch();
        focused = v;
        updateStatus(v);
      },
      wrap,
      visible,
      d.eol === "\r\n" ? "CRLF" : d.eol === "\r" ? "CR" : "LF",
      d.mixed,
    ),
    matchField,
  ];
}
function makeState(d: Doc) {
  const ext = extensionsFor(d);
  return d.state
    ? d.state.update({ effects: StateEffect.reconfigure.of(ext) }).state
    : EditorState.create({ doc: d.text, extensions: ext });
}
function mergeConfig(d: Doc) {
  const old = d.state;
  return {
    doc: textOf(d),
    selection: old?.selection,
    extensions: [
      ...extensionsFor(d),
      ...(old ? [historyField.init(() => old.field(historyField))] : []),
    ],
  };
}
function destroyEditors() {
  if (view) {
    current().state = view.state;
    view.destroy();
    view = undefined;
  }
  merge?.destroy();
  merge = undefined;
  focused = undefined;
  $("#editor").replaceChildren();
}
function switchDoc(id: number) {
  if (largeRunning) stopLarge();
  destroyEditors();
  active = id;
  compareId = undefined;
  render();
}
let largeWorker: Worker | undefined,
  largeTask = 0,
  largeRunning = false;
function stopLarge() {
  if (largeWorker && largeRunning) {
    largeWorker.postMessage({ type: "cancel" });
    $("#search-count").textContent = "正在取消…";
  }
}
function render() {
  invalidateSearch();
  if (view) {
    view.destroy();
    view = undefined;
  }
  merge?.destroy();
  merge = undefined;
  focused = undefined;
  $("#editor").replaceChildren();
  renderTabs();
  const d = current();
  $("#editor").hidden = d.large;
  $("#large-view").hidden = !d.large;
  $("#compare-bar").hidden = true;
  $("#file-note").hidden = !d.mixed;
  if (d.mixed) {
    $("#file-note").replaceChildren(
      document.createTextNode("文件包含混合换行，目前以只读方式保留原始内容。"),
    );
    const b = document.createElement("button");
    b.textContent = "转换为 LF 并编辑";
    b.onclick = () => {
      if (confirm("将全部换行转换为 LF？原文件不会自动覆盖。")) {
        d.text = textOf(d);
        d.state = undefined;
        d.mixed = false;
        d.raw = undefined;
        d.eol = "\n";
        d.dirty = true;
        render();
      }
    };
    $("#file-note").append(b);
  }
  if (d.large) {
    $("#large-results").hidden = true;
    void showPage();
    compareId = undefined;
  } else if (compareId) {
    const other = docs.find((x) => x.id === compareId);
    if (other && !other.large && !other.mixed && !d.mixed) {
      $("#compare-bar").hidden = false;
      $("#left-name").textContent = d.name;
      const sel = $<HTMLSelectElement>("#compare-select");
      sel.replaceChildren();
      for (const x of docs.filter(
        (x) => x.id !== d.id && !x.large && !x.mixed,
      )) {
        const opt = new Option(x.name, String(x.id), false, x.id === compareId);
        sel.add(opt);
      }
      merge = new MergeView({
        a: mergeConfig(d),
        b: mergeConfig(other),
        parent: $("#editor"),
        revertControls: direction,
        highlightChanges: true,
        gutter: true,
        renderRevertControl: () => {
          const b = document.createElement("button");
          b.textContent = direction === "a-to-b" ? "→" : "←";
          b.title = "合并此处差异";
          b.setAttribute("aria-label", "合并此处差异");
          return b;
        },
      });
      d.state = merge.a.state;
      other.state = merge.b.state;
      focused = merge.a;
      const a = merge.a.scrollDOM,
        b = merge.b.scrollDOM;
      a.addEventListener("scroll", () => {
        if (Math.abs(a.scrollTop - b.scrollTop) > 1) b.scrollTop = a.scrollTop;
      });
      b.addEventListener("scroll", () => {
        if (Math.abs(a.scrollTop - b.scrollTop) > 1) a.scrollTop = b.scrollTop;
      });
    } else compareId = undefined;
  }
  if (!d.large && !merge) {
    view = new EditorView({ state: makeState(d), parent: $("#editor") });
    d.state = view.state;
    focused = view;
  }
  for (const id of [
    "save",
    "undo",
    "redo",
    "tools",
    "visible",
    "wrap",
    "goto",
    "compare",
  ])
    $<HTMLButtonElement>("#" + id).disabled = d.large;
  for (const id of ["case", "whole", "regex", "scope"])
    $<HTMLInputElement>("#" + id).disabled = d.large;
  $("#replace").hidden = d.large;
  $("#previous").hidden = d.large;
  $("#next").hidden = d.large;
  $("#replace-all").textContent = d.large ? "替换并另存为" : "全部替换";
  updateStatus();
}
let direction: "a-to-b" | "b-to-a" = "a-to-b";
async function showPage() {
  const d = current();
  const id = d.id,
    offset = d.offset;
  try {
    const win = await readWindow(d.file!, offset);
    if (current().id !== id || d.offset !== offset) return;
    $("#large-content").textContent = win.text;
    $("#large-range").textContent =
      `${win.start.toLocaleString()} – ${win.end.toLocaleString()} / ${d.file!.size.toLocaleString()} 字节`;
    $<HTMLButtonElement>("#page-prev").disabled = d.offset === 0;
    $<HTMLButtonElement>("#page-next").disabled =
      d.offset + 65536 >= d.file!.size;
  } catch (err) {
    toast(`无法解码 UTF-8：${String(err)}`);
  }
}
async function addFile(file: File, handle?: any) {
  if (file.size > LARGE_LIMIT) {
    const d = newDoc(file.name);
    Object.assign(d, { file, handle, large: true });
    switchDoc(d.id);
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bom = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const endings = lineEnding(raw);
  const d = newDoc(file.name, raw.replace(/\r\n|\r/g, "\n"));
  Object.assign(d, {
    file,
    handle,
    bom,
    eol: endings.eol,
    mixed: endings.mixed,
    raw: endings.mixed ? raw : undefined,
  });
  switchDoc(d.id);
}
async function openFiles() {
  try {
    if ("showOpenFilePicker" in window) {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
      });
      for (const h of handles) await addFile(await h.getFile(), h);
    } else $<HTMLInputElement>("#file-input").click();
  } catch (err) {
    if ((err as Error).name !== "AbortError") toast("打开失败：" + String(err));
  }
}
function download(content: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
async function save() {
  const d =
    merge && focused === merge.b
      ? docs.find((x) => x.id === compareId)!
      : current();
  const savedDocument = d.state?.doc;
  const content =
    (d.bom ? "\ufeff" : "") +
    (d.mixed ? d.raw! : textOf(d).replaceAll("\n", d.eol));
  if (new Blob([content]).size > MAX_NORMAL_OUTPUT) {
    toast("结果超过普通模式输出限制");
    return;
  }
  try {
    if ("showSaveFilePicker" in window) {
      const h = await (window as any).showSaveFilePicker({
        suggestedName: d.name,
      });
      const w = await h.createWritable();
      try {
        await w.write(content);
        await w.close();
      } catch (e) {
        try {
          await w.abort();
        } catch {}
        throw e;
      }
      d.name = h.name;
      d.handle = h;
      d.dirty = d.state?.doc !== savedDocument;
      toast("文件已写入");
    } else {
      download(content, d.name);
      toast("已发起下载，请确认浏览器下载结果。修改标记保留。");
    }
    renderTabs();
    updateStatus();
  } catch (err) {
    if ((err as Error).name !== "AbortError")
      toast("保存失败，内容仍保留：" + String(err));
  }
}
let searchScope:
  { view: EditorView; doc: unknown; from: number; to: number } | undefined;
let searchWorker: Worker | undefined,
  searchTimer: number,
  searchVersion = 0,
  searchMatches: Match[] = [],
  matchIndex = -1,
  searchView: EditorView | undefined,
  searchDoc: any,
  searchTruncated = false;
function invalidateSearch(clearHighlights = true) {
  searchVersion++;
  searchWorker?.terminate();
  searchWorker = undefined;
  clearTimeout(searchTimer);
  searchMatches = [];
  matchIndex = -1;
  searchTruncated = false;
  for (const ev of clearHighlights
    ? merge
      ? [merge.a, merge.b]
      : view
        ? [view]
        : []
    : [])
    if (ev.state.field(matchField, false))
      ev.dispatch({ effects: matchesEffect.of([]) });
  $("#search-count").textContent = "输入条件后点击查找";
}
function options(): SearchOptions {
  return {
    query: $<HTMLInputElement>("#query").value,
    replacement: $<HTMLInputElement>("#replacement").value,
    caseSensitive: $<HTMLInputElement>("#case").checked,
    wholeWord: $<HTMLInputElement>("#whole").checked,
    regex: $<HTMLInputElement>("#regex").checked,
  };
}
function find() {
  if (current().large) {
    void runLarge(false);
    return;
  }
  const v = focused ?? view;
  if (!v) return;
  invalidateSearch();
  const id = searchVersion;
  searchView = v;
  searchDoc = v.state.doc;
  v.dispatch({ effects: matchesEffect.of([]) });
  const o = options();
  if (!o.query) return;
  let offset = 0,
    source = v.state.doc.toString();
  if ($<HTMLInputElement>("#scope").checked) {
    if (
      !searchScope ||
      searchScope.view !== v ||
      searchScope.doc !== v.state.doc
    ) {
      toast("选区已失效，请重新选择文字并勾选仅选区");
      return;
    }
    offset = searchScope.from;
    source = source.slice(offset, searchScope.to);
  }
  $("#search-count").textContent = "正在查找…";
  searchWorker = new Worker(new URL("./search.worker.ts", import.meta.url), {
    type: "module",
  });
  const worker = searchWorker;
  worker.onmessage = (e) => {
    if (id !== searchVersion || v.state.doc !== searchDoc) return;
    clearTimeout(searchTimer);
    worker.terminate();
    if (e.data.error) {
      $("#search-count").textContent = e.data.error;
      return;
    }
    searchMatches = e.data.matches.map((m: Match) => ({
      ...m,
      from: m.from + offset,
      to: m.to + offset,
    }));
    searchTruncated = e.data.truncated;
    $("#search-count").textContent =
      `${e.data.count.toLocaleString()} 处匹配` +
      (searchTruncated ? " · 仅列出前 20,000 处，缩小范围后替换" : "");
    v.dispatch({ effects: matchesEffect.of(searchMatches) });
    navigate(1);
  };
  worker.postMessage({ id, text: source, options: o });
  searchTimer = window.setTimeout(() => {
    worker.terminate();
    $("#search-count").textContent = "查找超时（2 秒），请简化正则或缩小文件";
    searchMatches = [];
  }, 2000);
}
function navigate(delta: number) {
  if (
    !searchMatches.length ||
    !searchView ||
    searchView.state.doc !== searchDoc
  )
    return;
  matchIndex =
    (matchIndex + delta + searchMatches.length) % searchMatches.length;
  const m = searchMatches[matchIndex];
  searchView.dispatch({
    selection: { anchor: m.from, head: m.to },
    scrollIntoView: true,
  });
  searchView.focus();
}
function replace(all: boolean) {
  if (current().large) {
    void runLarge(true);
    return;
  }
  if (
    !searchView ||
    searchView.state.doc !== searchDoc ||
    !searchMatches.length
  ) {
    toast("请先点击查找，再执行替换");
    return;
  }
  if (current().mixed) {
    toast("混合换行文件为只读");
    return;
  }
  if (searchTruncated) {
    toast("匹配超过 20,000 处，请缩小范围；未执行部分替换");
    return;
  }
  const matches = all
    ? [...searchMatches]
    : [searchMatches[Math.max(0, matchIndex)]];
  const v = searchView;
  const estimated =
    v.state.doc.length +
    matches.reduce((n, m) => n + m.replacement.length - (m.to - m.from), 0);
  if (estimated > 16 * 1024 * 1024) {
    toast("替换结果超过普通编辑容量限制，操作未执行");
    return;
  }
  v.dispatch({
    changes: matches.map((m) => ({
      from: m.from,
      to: m.to,
      insert: m.replacement,
    })),
    userEvent: "input.replace",
  });
  toast(`已替换 ${matches.length.toLocaleString()} 处，可撤销`);
}
async function runLarge(replacing: boolean) {
  if (largeRunning) {
    toast("已有大文件任务，请等待完成或取消");
    return;
  }
  const d = current(),
    query = options().query;
  if (!query) {
    toast("请输入查找文本");
    return;
  }
  let target: any;
  try {
    if (replacing) {
      if (!("showSaveFilePicker" in window)) {
        toast("此浏览器没有文件选择写入能力，无法流式导出大文件");
        return;
      }
      if (!d.handle) {
        toast(
          "请使用“打开文件”重新选择源文件，取得文件句柄后才能安全检查目标不同于源文件",
        );
        return;
      }
      target = await (window as any).showSaveFilePicker({
        suggestedName: d.name + ".replaced.txt",
      });
      if (await d.handle.isSameEntry(target)) {
        toast("替换结果必须另存为，不能选择原文件");
        return;
      }
      const fresh = await d.handle.getFile();
      if (
        fresh.size !== d.file!.size ||
        fresh.lastModified !== d.file!.lastModified
      ) {
        toast("源文件已被外部修改，请重新打开");
        return;
      }
    }
    const id = ++largeTask;
    largeRunning = true;
    largeWorker?.terminate();
    largeWorker = new Worker(new URL("./large.worker.ts", import.meta.url), {
      type: "module",
    });
    $("#cancel-task").hidden = false;
    $("#search-count").textContent = "开始扫描…";
    largeWorker.onmessage = (e) => {
      if (e.data.id !== largeTask) return;
      const m = e.data;
      if (current().id !== d.id) {
        if (m.type !== "progress") {
          largeRunning = false;
          $("#cancel-task").hidden = true;
          largeWorker?.terminate();
        }
        return;
      }
      if (m.type === "progress")
        $("#search-count").textContent =
          `${((m.bytes / d.file!.size) * 100).toFixed(1)}% · 已找到 ${m.count.toLocaleString()} 处`;
      else {
        largeRunning = false;
        $("#cancel-task").hidden = true;
        largeWorker?.terminate();
        if (m.type === "done") {
          $("#search-count").textContent =
            `${replacing ? "替换并写入完成" : "全局查找完成"} · ${m.count.toLocaleString()} 处`;
          toast(
            replacing
              ? "新文件已写入，原文件保持不变"
              : `扫描完成，共 ${m.count.toLocaleString()} 处匹配`,
          );
          if (!replacing && current().id === d.id) {
            const results = $("#large-results");
            results.hidden = false;
            results.replaceChildren(
              document.createTextNode("前 200 处匹配（点击定位字节窗口）："),
            );
            for (const pos of m.positions) {
              const b = document.createElement("button");
              b.textContent = pos.toLocaleString();
              b.onclick = () => {
                d.offset = pos;
                void showPage();
              };
              results.append(b);
            }
          }
        } else
          $("#search-count").textContent = m.cancelled
            ? "任务已取消，输出未提交"
            : "失败：" + m.error;
      }
    };
    largeWorker.onerror = (e) => {
      largeRunning = false;
      $("#cancel-task").hidden = true;
      toast("大文件任务失败：" + e.message);
    };
    largeWorker.postMessage({
      id,
      file: d.file,
      query,
      replacement: options().replacement,
      target,
    });
  } catch (err) {
    if ((err as Error).name !== "AbortError") toast(String(err));
  }
}
function showSearch() {
  $("#search-panel").hidden = false;
  $<HTMLInputElement>("#query").focus();
}
$("#import").onclick = () => $<HTMLInputElement>("#file-input").click();
$("#new").onclick = () => switchDoc(newDoc().id);
$("#open").onclick = () => void openFiles();
$("#save").onclick = () => void save();
$("#undo").onclick = () => {
  if (focused) undo(focused);
};
$("#redo").onclick = () => {
  if (focused) redo(focused);
};
$("#search-open").onclick = showSearch;
$("#search-close").onclick = () => {
  $("#search-panel").hidden = true;
  invalidateSearch();
};
$("#find").onclick = find;
$("#next").onclick = () => navigate(1);
$("#previous").onclick = () => navigate(-1);
$("#replace").onclick = () => replace(false);
$("#replace-all").onclick = () => replace(true);
$("#cancel-task").onclick = stopLarge;
for (const id of ["query", "replacement", "case", "whole", "regex"])
  $("#" + id).addEventListener("input", () => {
    if (largeRunning) stopLarge();
    invalidateSearch();
  });
$("#scope").onchange = () => {
  const v = focused;
  searchScope =
    v && v.state.selection.main.from !== v.state.selection.main.to
      ? {
          view: v,
          doc: v.state.doc,
          from: v.state.selection.main.from,
          to: v.state.selection.main.to,
        }
      : undefined;
  if (!searchScope && $<HTMLInputElement>("#scope").checked) {
    $<HTMLInputElement>("#scope").checked = false;
    toast("请先在编辑器里选择文字");
  }
  invalidateSearch();
};
$("#query").onkeydown = (e) => {
  if (e.key === "Enter" && !e.isComposing && e.keyCode !== 229) {
    e.preventDefault();
    find();
  }
};
$("#wrap").onclick = () => {
  wrap = !wrap;
  $("#wrap").classList.toggle("is-on", wrap);
  for (const v of merge ? [merge.a, merge.b] : view ? [view] : [])
    v.dispatch({
      effects: wrapping.reconfigure(wrap ? EditorView.lineWrapping : []),
    });
};
$("#visible").onclick = () => {
  visible = !visible;
  $("#visible").classList.toggle("is-on", visible);
  for (const v of merge ? [merge.a, merge.b] : view ? [view] : [])
    v.dispatch({
      effects: markers.reconfigure(
        markerExtensions(visible, $("#ending").textContent ?? "LF"),
      ),
    });
};
$("#goto").onclick = () => {
  const v = focused;
  if (!v) return;
  const raw = prompt("输入行号，或 行号:列号", "1");
  if (!raw) return;
  const [ln, col = 1] = raw.split(":").map(Number);
  if (
    !Number.isInteger(ln) ||
    ln < 1 ||
    ln > v.state.doc.lines ||
    !Number.isInteger(col) ||
    col < 1
  ) {
    toast("无效行列位置");
    return;
  }
  const line = v.state.doc.line(ln),
    pos =
      line.from +
      Array.from(line.text)
        .slice(0, col - 1)
        .join("").length;
  v.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
  v.focus();
};
$("#tools").onchange = () => {
  const el = $<HTMLSelectElement>("#tools"),
    mode = el.value;
  el.value = "";
  const v = focused;
  if (!v || !mode) return;
  if (v.state.readOnly) {
    toast("当前文档为只读");
    return;
  }
  try {
    const t = v.state.doc.toString(),
      out = ["format", "minify", "validate"].includes(mode)
        ? jsonTool(t, mode as any)
        : cleanText(t, mode);
    if (mode === "validate") {
      toast("JSON 语法正确，未发现重复字段");
      return;
    }
    v.dispatch({
      changes: { from: 0, to: v.state.doc.length, insert: out },
      userEvent: "input.format",
    });
    toast("处理完成，可撤销");
  } catch (err) {
    toast(String(err));
  }
};
$("#compare").onclick = () => {
  if (current().mixed) {
    toast("请先转换混合换行文档");
    return;
  }
  let other = docs.find((d) => d.id !== active && !d.large && !d.mixed);
  if (!other) other = newDoc("对比文本.txt", "");
  compareId = other.id;
  render();
};
$("#compare-close").onclick = () => {
  compareId = undefined;
  render();
};
$("#compare-select").onchange = () => {
  compareId = Number($<HTMLSelectElement>("#compare-select").value);
  render();
};
$("#direction").onclick = () => {
  direction = direction === "a-to-b" ? "b-to-a" : "a-to-b";
  $("#direction").textContent =
    direction === "a-to-b" ? "合并方向：左 → 右" : "合并方向：右 → 左";
  merge?.reconfigure({ revertControls: direction });
};
function jumpDiff(delta: number) {
  if (!merge) return;
  const v = focused ?? merge.a,
    side = v === merge.b ? "B" : "A",
    pos = v.state.selection.main.head;
  const chunks = merge.chunks;
  const positions = chunks.map((c) => (side === "A" ? c.fromA : c.fromB));
  const p =
    delta > 0
      ? (positions.find((p) => p > pos) ?? positions[0])
      : ([...positions].reverse().find((p) => p < pos) ?? positions.at(-1));
  if (p !== undefined) {
    v.dispatch({
      selection: { anchor: Math.min(p, v.state.doc.length) },
      scrollIntoView: true,
    });
    v.focus();
  }
}
$("#diff-next").onclick = () => jumpDiff(1);
$("#diff-prev").onclick = () => jumpDiff(-1);
$("#page-prev").onclick = () => {
  current().offset = Math.max(0, current().offset - 65536);
  void showPage();
};
$("#page-next").onclick = () => {
  current().offset += 65536;
  void showPage();
};
$("#large-search").onclick = showSearch;
$("#file-input").onchange = async () => {
  for (const f of $<HTMLInputElement>("#file-input").files ?? [])
    try {
      await addFile(f);
    } catch (err) {
      toast("无法打开：" + String(err));
    }
  $<HTMLInputElement>("#file-input").value = "";
};
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", async (e) => {
  e.preventDefault();
  for (const f of e.dataTransfer?.files ?? [])
    try {
      await addFile(f);
    } catch (err) {
      toast("无法打开：" + String(err));
    }
});
window.addEventListener("beforeunload", (e) => {
  if (docs.some((d) => d.dirty) || largeRunning) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("keydown", (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key === "f") {
    e.preventDefault();
    showSearch();
  }
  if (e.key === "s") {
    e.preventDefault();
    if (!current().large) void save();
  }
  if (e.key === "o") {
    e.preventDefault();
    void openFiles();
  }
});
$("#theme-toggle").onclick = () =>
  selectTheme(theme.base === "dark" ? builtins[0] : builtins[1]);
$("#themes-open").onclick = () => {
  renderThemeCards();
  $<HTMLTextAreaElement>("#theme-json").value = JSON.stringify(theme, null, 2);
  $<HTMLDialogElement>("#themes-dialog").showModal();
};
$("#themes-close").onclick = () =>
  $<HTMLDialogElement>("#themes-dialog").close();
$("#theme-export").onclick = () =>
  download(
    JSON.stringify(theme, null, 2),
    theme.id + ".json",
    "application/json",
  );
$("#theme-copy").onclick = () => {
  const t = {
    ...theme,
    id: "custom-" + Date.now(),
    name: theme.name + " · 自定义",
  };
  $<HTMLTextAreaElement>("#theme-json").value = JSON.stringify(t, null, 2);
  $("#theme-error").textContent = "修改名称和颜色后点击“校验并应用”";
};
function importTheme(raw: string) {
  if (raw.length > 65536) throw Error("主题 JSON 不得超过 64 KiB");
  const t = validateTheme(JSON.parse(raw));
  if (["light", "dark"].includes(t.id))
    throw Error("请修改 id，不能覆盖内置主题");
  const existing = custom.find((x) => x.id === t.id);
  if (existing && !confirm(`覆盖自定义主题“${existing.name}”？`)) return;
  custom = [...custom.filter((x) => x.id !== t.id), t];
  selectTheme(t);
  $("#theme-error").textContent = storageProblem || "主题已应用";
  $<HTMLTextAreaElement>("#theme-json").value = JSON.stringify(t, null, 2);
}
$("#theme-apply").onclick = () => {
  try {
    importTheme($<HTMLTextAreaElement>("#theme-json").value);
  } catch (err) {
    $("#theme-error").textContent = String(err);
  }
};
$("#theme-delete").onclick = () => {
  if (!custom.some((t) => t.id === theme.id)) {
    toast("内置主题不能删除");
    return;
  }
  if (!confirm(`删除主题“${theme.name}”？`)) return;
  custom = custom.filter((t) => t.id !== theme.id);
  selectTheme(builtins[0]);
  $<HTMLTextAreaElement>("#theme-json").value = JSON.stringify(theme, null, 2);
};
$("#theme-import").onclick = () => $<HTMLInputElement>("#theme-input").click();
$("#theme-input").onchange = async () => {
  const f = $<HTMLInputElement>("#theme-input").files?.[0];
  if (!f) return;
  try {
    if (f.size > 65536) throw Error("主题文件超过 64 KiB");
    importTheme(await f.text());
  } catch (err) {
    $("#theme-error").textContent = String(err);
  }
  $<HTMLInputElement>("#theme-input").value = "";
};
const welcome = newDoc(
  "欢迎.txt",
  "欢迎使用 Notepad\n\n一个安静、专注的文本工作台。\n\n  打开文件，或直接在这里开始输入。\n  使用 ⌘ / Ctrl + F 查找与替换。\n  在「文本工具」中格式化 JSON、整理文本。\n  打开「双文本对比」，逐处检查和合并差异。\n\n所有文本在浏览器本地处理。\n大于 16 MiB 的文件自动使用分块只读模式。\n",
);
active = welcome.id;
render();
if (storageProblem) toast(storageProblem);

if (location.protocol === "chrome-extension:") {
  if (location.hash === "#import-error=1") {
    toast("选中文字导入失败（内容过大或会话存储已满）。请保存为文件后打开。");
    history.replaceState(null, "", location.pathname);
  }
  void receiveSelection()
    .then(async (text) => {
      if (text === undefined) return;
      const doc = newDoc("网页选中文字.txt", text);
      doc.dirty = true;
      active = doc.id;
      render();
      await acknowledgeSelection();
    })
    .catch((error) => toast(String(error)));
}
