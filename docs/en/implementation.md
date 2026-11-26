# Current implementation and acceptance

For Chrome packaging, installation and validation limits, see the [extension guide](extension.md).

2026-10-28: local initial implementation, unreleased. This page describes current code; requirement/architecture drafts retain the broader target.

## Implemented

- Multiple tabs, UTF-8 open/drop/compatible import, save-as, dirty warnings and undo/redo.
- Cursor/selection/document code-point counts and UTF-8 bytes, wrap, line/column jump, space/tab/line-ending markers.
- Normal literal/regex search, Unicode word and case options, selection scope, highlights/navigation/replacement. Search runs in a Worker with a two-second timeout.
- JSON format/minify/validate preserving numeric lexemes and rejecting duplicate keys; sort/deduplicate/remove blank lines/trim trailing whitespace.
- CodeMirror side-by-side line/inline diff, synchronized scrolling, navigation, switchable merge direction, undo and history preservation on exit.
- Black/white JSON themes, custom JSON editing/import/export/duplicate/rename/delete, validation and localStorage.
- Files over 16 MiB use bounded approximately 64 KiB windows; full literal scans, first 200 byte locations, progress/cancel and a streaming replacement Worker.

## Limits

UTF-8 only. Normal files preserve BOM and uniform LF/CRLF/CR. Mixed endings are read-only until explicit conversion to LF; original bytes are not silently normalized on save.

Large mode is literal and case-sensitive only: no whole-word/regex, global line index/exact character totals, arbitrary editing, diff or JSON formatting. Match navigation opens a byte window, not a full virtual line editor. Query/replacement each cap at 65,536 UTF-16 units. Input chunks are 256 KiB; output flushes with awaited writes. Extreme expansion can still exhaust disk; failures attempt abort.

Native saving requires picker/writable-handle capability. Large replacement requires opening the source through the native Open action to verify a different destination. Import/drop supports browsing/search but cannot directly provide identity-safe replacement export.

Normal search stores at most 20,000 matches and refuses truncated replace-all. Regex replacements support `$$`, `$&`, `$1`–`$99`, not named groups or prefix/suffix substitutions. Selection edges are search boundaries. Normal replacement output caps at 16 Mi UTF-16 units; saves cap at 32 MiB. JSON/cleanup run on the main thread; large normal-file responsiveness remains unqualified.

Diff ignore options and unchanged-region collapse are pending; wide-file diff performance is unqualified. Draft recovery, encoding conversion, dedicated multicursor UI, separate marker switches and tab-width controls remain pending. Theme tokens are defined by src/themes/light.json; a separate JSON Schema, independent preview and migrations are not implemented. Unknown versions are rejected.

## Evidence

- Typecheck and production build pass. 16 deterministic unit tests cover boundary decoding/matching, BOM/non-overlap/deletion, cancellation/write failure, long lines, adjacent UTF-8 windows, JSON/themes/search.
- Independent disk-backed 100 MiB algorithm test passes: 104,857,638 input bytes, 1,978,446 replacements, 100,900,746 output bytes. Re-reading output verifies SHA-256 `b5d9ad67e78f39ab15e194b26409964c042cfbbf9fa3914fe41839003d8d8132` against an independent oracle.
- Actual browser 100 MiB search returns 1,978,446 matches; the viewport renders only about 64 KiB.
- Actual browser 1 GiB search (1,073,741,840 bytes) returns 20,259,280 matches, matching the generator; cancellation passes.
- Browser checks pass for precise JSON, Chinese replacement, selection boundaries/undo, markers, black/white, custom persistence, invalid-theme rejection and two-file merge/undo/edit-after-exit.

Environment: local macOS, Node 22.22.3, Codex in-app browser. Peak browser memory, first-visible/scroll latency, physical IME composition and broad browser compatibility are unmeasured. These runs do not establish a capacity ceiling or SLA. Native picker automation was unavailable; browser-native saving/replacement output is not end-to-end verified. Node disk tests do not establish native browser writes.

## Corrections and execution history

Unconditional per-chunk task yielding timed out fine-grained tests; time-budgeted yielding resolved it while retaining cancellation checks. UTF-8 pagination could drop a split character; backward boundary alignment and adjacent-window regression now cover it. View transitions strip retired merge extensions while retaining history; editing/undo after exit was verified.

Hermes delegation encountered dependency-download errors and then a prolonged no-code gateway run. The session was interrupted through its control API and Codex implemented this version. No global Hermes configuration was changed; this is not a general assessment of Hermes availability.

[Reproduction](development.md) · [Target requirements](requirements.md) · [简体中文](../zh/implementation.md)

## Actual screenshots

[Light](../img/editor-light.png) · [Dark](../img/editor-dark.png) · [Large-file search](../img/large-file.png)

Production build browser checks also passed normal and 100 MiB search. A pathological regex was terminated after two seconds while the main UI remained responsive to theme switching.
