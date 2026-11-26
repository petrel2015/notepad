# Architecture draft

For Chrome packaging, installation and validation limits, see the [extension guide](extension.md).

> A local initial implementation now exists. This document retains the target design; [current implementation and acceptance](implementation.md) is authoritative for status/deviations. “Unimplemented/pending” below describes the original planning baseline, not current code.

Proposed, not implemented. See [requirements](requirements.md). Editor, UI framework and bundler are undecided; validate IME, visible markers, diff integration, bundle size and maintenance first.

## Layers and flow

```text
UI: tabs / editor / compare / search / status / themes
                         ↓ intents
Application: sessions / commands and undo / tasks / capability detection
          ↓                     ↓                       ↓
Normal editor adapter      Large-file Worker         Theme service
In-memory model/diff       Decode/sparse index       JSON validation
JSON and text tools        Search/replace            Token mapping
          ↓                     ↓                       ↓
File service: read / save / streaming output         localStorage
```

Use a mature component behind an adapter for normal files. Large mode supplies only visible windows, never a whole-file editor model. Share metadata, themes, search UI and task state while exposing different capabilities.

## Proposed modules (not existing paths)

| Module | Responsibility |
| --- | --- |
| `src/app` | Sessions/mode/commands, no full scans |
| `src/editor` | Component adapter, coordinate conversion, markers, normal undo |
| `src/files` | Reading/encoding/endings/destination checks/output lifecycle |
| `src/large` | Chunk decoding, sparse index, window reads, search/replace Worker |
| `src/diff` | Options, asynchronous diff, transactional directional merges |
| `src/text-tools` | Testable JSON and text transformations |
| `src/themes` | Versioned validation, defaults, persistence, token mapping |
| `src/diagnostics` | Content-free errors, phases, progress, measurements |

## State and protocol

Document state holds stable ID, name, source reference, mode, encoding, BOM, endings, revision, dirty flag and viewport. Byte offsets and decoded positions are different coordinate systems; index checkpoints must allow safe decoding and retain logical line numbers.

Normal lifecycle: opening → ready → dirty → saving → ready, or retain dirty state on failure. Clear dirty only after successful save. Never discard edits when switching modes.

Task lifecycle: idle → running → cancelling → cancelled, or running → completed/failed. Messages include taskId, documentId, revision, operation, phase, processed bytes and total bytes. Ignore stale tasks/revisions. Progress, completion and failure are distinct: 100% scanned does not prove output was successfully closed.

## Memory and correctness

Bound input blocks, output queues, viewport caches and result windows. Use output backpressure. Sparse index sampling has a budget; do not append an unlimited entry per line. Segment very long lines rather than buffering an entire line.

Literal matching retains necessary boundary state. Replacement is left-to-right, non-overlapping, without rescanning replacement text. Progress measures input bytes; output size may differ. Cancellation stops I/O and cleans incomplete output; residue is never reported as complete. See [large files](features/large-files.md).

## Normal tools and diff

Heavy calculations run in terminable tasks; uncontrolled regex must not block the main thread. Apply merges only to the compared revisions, otherwise recompute. Each merge is one undo transaction. Ignore options affect comparison, not source normalization.

JSON formatting must preserve large integers and precise numeric tokens; parse/stringify is not automatically lossless. Detect duplicate keys and define policy; initially prefer preserving source and reporting an error to silently discarding keys. Failed formatting never replaces source.

## Storage and compatibility

Whitelist theme values and map them to UI/editor tokens; reject scripts, arbitrary CSS and remote resources. localStorage stores themes/small preferences, not file contents. Draft recovery needs a separate design.

Gate huge exports on streaming disk-output capability. Other browsers may download only size-bounded small outputs. Permission, disk and encoding failures preserve the source. Actual browser/API support is pending validation.

## Open decisions

Editor choice, mode thresholds, Unicode word rules, output encodings, index spacing, long-line rendering, regex limits and theme editor UI. After validation record choice, evidence, alternatives and reconsideration criteria. No technical choice or failed experiment has yet been validated.


---
[简体中文](../zh/architecture.md)

## Current choices

Vite + TypeScript + CodeMirror 6; see the [actual module map](development.md). CodeMirror supplies state/history/merge; large files never enter its whole-document model. Regex runs in a terminable Worker. Initial large browsing uses byte windows, deferring unvalidated sparse line-index overhead.

References consulted during implementation: [CodeMirror API](https://codemirror.net/docs/ref/), [File System standard](https://fs.spec.whatwg.org/). Actual support is bounded by project acceptance.
