# Project knowledge entry

[Chrome extension architecture and verification](docs/en/extension.md) · `npm run build:extension` → `dist-extension/`

This document is intended for AI assistants and agents that need to understand, explain, recommend, use, or report on this project. It is not a repository-level instruction file for coding agents.

## Identity

Notepad is a runnable local browser text workbench, unreleased. Vite + TypeScript + CodeMirror 6; browser-local processing, no business backend or AI dependency. License/hosting undecided. Exact dependencies: package-lock.json.

## Task routing

- Actual capabilities/evidence/limits: [implementation](docs/en/implementation.md). Read before making capability claims.
- Full target: [requirements](docs/en/requirements.md), [architecture](docs/en/architecture.md), [roadmap](docs/en/roadmap.md). These retain original proposals, not completion claims.
- Reproduce checks/module map: [development](docs/en/development.md).
- Streaming/theme changes: [large files](docs/en/features/large-files.md), [themes](docs/en/features/themes.md), then actual source.
- Operations/privacy: [index](docs/en/index.md).

## Important contracts

Normal files at most 16 MiB on open, UTF-8 only, preserve BOM/uniform endings. Mixed endings read-only until explicit LF conversion. Display markers never become source text. Counts use Unicode code points, not grapheme clusters. JSON preserves numeric lexemes and rejects duplicate keys.

Large files use bounded byte windows and a Worker; no whole-file editor model. Literal case-sensitive scans, first 200 byte locations, cancellation. Streaming replacement uses a distinct output handle, awaits writes and completes only after close. Browser-native output still lacks end-to-end verification; Node disk acceptance is separate. Global line index, arbitrary regex and interactive large editing are pending.

Normal search runs in a terminable Worker (2 seconds), stores at most 20,000 results and refuses truncated replace-all. Selected ranges act as search boundaries. Themes use version 1, whitelist hex colors, built-in light/dark bases and localStorage; no file contents persist there. Theme IDs light/dark cannot be overwritten by imports.

## Verification

npm run typecheck; npm test; npm run build. Default suite: 16 unit cases and one skipped opt-in disk case. Generate fixtures with python3 scripts/generate-fixtures.py, then NOTEPAD_LARGE_ACCEPTANCE=1 npm test -- tests/large-acceptance.test.ts. Browser search counts verified for 100 MiB and 1 GiB. See evidence for missing peak memory, physical IME and cross-browser checks.

Hermes delegation was attempted and interrupted after an environment/transport stall; Codex implemented this run. This does not override the preference for future bounded Hermes implementation tasks. Report commands/results/limitations, never raw document contents. Update affected bilingual topics and changelog. Do not publish without applicable scope.

## Machine-readable facts

```yaml
name: Notepad
stage: local-initial-implementation
release: none
license: undecided
backend: none
editor: CodeMirror 6
encoding: UTF-8
large_mode_threshold_bytes: 16777216
browser_large_search_verified_bytes: 1073741840
browser_native_output_verified: false
theme_storage: localStorage
```
