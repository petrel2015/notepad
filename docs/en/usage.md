# Usage

Start the local app using [README](../../README.md).

1. **Edit:** New creates a tab. Open uses native handles when available; Import provides a compatible chooser; dropping files also works. Dirty closes warn. Save targets the active editor pane. Fallback downloads retain dirty state because only dispatch, not disk completion, is known.
2. **Search:** Open the panel (Cmd/Ctrl+F), set query/replacement and click Search before replacing. Select text before enabling selection-only mode. Source/condition changes require another search. Above 20,000 matches, partial replace-all is refused. Regex timeout terminates its Worker.
3. **Display:** Markers jointly show spaces/tabs/endings without saving them. Wrap affects display only. Jump accepts line or line:column. Character counts use code points and columns are one-based.
4. **Tools:** Format/minify/validate JSON or clean lines. Undo is available; syntax/duplicate-key errors preserve source and numeric lexemes remain exact.
5. **Compare:** Open two normal files, enter comparison and choose the right tab. Center arrows merge one difference; direction switches left/right. Undo and Save target the most recently edited/focused pane.
6. **Themes:** Toggle black/white or open settings. Duplicate, edit name/colors in JSON, apply/export. Built-ins require a new ID before customization; replacing an existing custom ID asks confirmation. Rejected storage gives session-only application with a warning; export for backup.
7. **Large files:** Above 16 MiB, browse read-only windows. Global search scans everything but lists only the first 200 byte locations. Cancel stops the task. Replacement export requires a native-open source handle and a different output. Compatible import lacks identity guarantees; no unlimited in-memory export fallback exists.

Mixed endings open read-only until explicit LF conversion. UTF-8 only; decoding failures are errors. Draft text is not persisted and reload loses it. See [current limits/evidence](implementation.md).

[简体中文](../zh/usage.md)
