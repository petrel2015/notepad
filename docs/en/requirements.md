# Requirements

> A local initial implementation now exists. This document retains the target design; [current implementation and acceptance](implementation.md) is authoritative for status/deviations. “Unimplemented/pending” below describes the original planning baseline, not current code.

Planning baseline dated 2026-10-28; nothing is implemented. Confirmed means explicitly requested by the user; proposed details remain candidate scope.

| ID | Scope | Source and priority | Requirement |
| --- | --- | --- | --- |
| EDIT | Normal files | Editing confirmed; details proposed, initial | Paste/open/edit/save/undo, drag/drop, tabs, indentation, wrap, position navigation |
| SEARCH | Normal files | Search/highlight/replace confirmed; options proposed, initial | Counts/navigation, selection/global replacement, case/word options, regex captures |
| STATUS | Both modes | Position/count details confirmed, initial | Line/column, selection chars/lines, document counts, file bytes, dirty state |
| VISIBLE | Normal first | Spaces/endings confirmed; other markers proposed | Spaces, tabs, LF/CRLF/CR, trailing spaces, indent guides; zero-width markers later |
| DIFF | Normal files | Comparison confirmed; merge details proposed, initial | Side-by-side, line/inline changes, sync scroll, navigation, reversible directional merges, ignore options |
| JSON | Normal files | Formatting confirmed; other tools proposed, initial | Indentation, validation, minification, accurate numbers; tree/structural diff later |
| THEME | Entire UI | Confirmed, initial | Black/white, JSON customization, import/export, localStorage |
| LARGE | Large files | Streaming confirmed; global replacement added | Chunked browse/navigation, global literal search and replacement export, progress/cancel |
| TOOLS | Normal files | Proposed, incremental initial scope | Deduplicate/sort/remove blank lines/trim/case; filtering and prefixes later |
| RECOVERY | Normal files | Proposed, later | Draft recovery requires separate capacity/storage/privacy policy |

## Proposed counting rules

One-based lines/columns; an empty document has one line; a trailing terminator creates a final empty line. CRLF is one logical terminator. Visual wrapping does not add logical lines. Character counts use Unicode code points, separately from bytes; grapheme counting is not promised. Tabs count as one character with configurable display width. Distinguish logical and visual columns and convert editor UTF-16 offsets. Selection line counts exclude a final line touched only at column one. Visual markers never enter copied or saved content.

Incomplete large-file counts must say scanning and identify scanned scope. Word/Chinese counts, multicolor keyword highlights, multiple cursors and rectangular selections are later candidates.

## Boundaries

Initial large mode excludes arbitrary interactive edits, full diff, full JSON formatting and unbounded multiline regex. Normal regex requires cancellation or timeout. Freeze Unicode whole-word rules after validation. Preserve mixed line endings unless explicitly converted.

Validate UTF-8 first. UTF-16 and GBK/GB18030 detection, decoding and output encoding require separate acceptance. Mode thresholds, browser matrix and performance targets remain unverified.

See [architecture](architecture.md) and [roadmap](roadmap.md).


---
[简体中文](../zh/requirements.md)
