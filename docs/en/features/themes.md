# Theme system design

> A local initial implementation now exists. This document retains the target design; [current implementation and acceptance](../implementation.md) is authoritative for status/deviations. “Unimplemented/pending” below describes the original planning baseline, not current code.

## Summary

Planned: built-in black/white and custom themes share versioned JSON.

## Background

The user explicitly requested JSON files, import/export and localStorage persistence.

## Problem

Hard-coded independent UI/editor/diff colors make switching inconsistent.

## Goals

Consistent UI; preview/apply/duplicate/rename/delete custom themes; reload recovery and export/import equivalence.

## Non-Goals

No executable themes, arbitrary CSS, external assets/fonts or initial cloud sync.

## Solution Overview

Import → whitelist validation → base defaults → UI/editor token mapping → preview/apply → persist. Built-ins are JSON files; persisted custom copies use the same contract.

## Detailed Behavior

Draft format, not implemented API:

```json
{
  "version": 1,
  "id": "custom-night",
  "name": "Custom Night",
  "base": "dark",
  "colors": {
    "ui.background": "#181818",
    "ui.foreground": "#eeeeee",
    "editor.background": "#181818",
    "editor.foreground": "#eeeeee",
    "editor.selection": "#365578",
    "diff.addedBackground": "#23452f"
  }
}
```

`version` is the schema version, not a release; proposed initial value is 1, unknown versions are rejected. `id` is stable; `base` is dark/light. Freeze limits for metadata, file size and token count before implementation. Initially allow only #RRGGBB/#RRGGBBAA. Reject unknown fields/tokens and dangerous keys, reporting field paths.

Missing colors inherit built-in base, with no recursive inheritance. Built-ins cannot be deleted; duplicate to customize. ID collisions require replace/save-as choice. Export resolved colors and version. Token groups cover UI surfaces/text/borders/buttons/panels/tabs/status; editor line numbers/cursor/current line/selection/search/whitespace/indent; syntax classes; diff added/deleted/modified backgrounds and text.

Proposed keys: `notepad.themes.v1` for custom themes and `notepad.preferences.v1` for active theme ID. Validate reads and catch write failures. On storage failure allow temporary application/export without claiming persistence. Corrupt data falls back to built-in without automatically overwriting the damaged value.

## User Experience

Provide black and white; proposed first-use default is white, pending product confirmation. One-click switching and named previews.

## Compatibility and Historical Impact

No historical data. Future schema changes require explicit migrations and export recovery; never silently reinterpret unknown versions.

## Data and Privacy Impact

Only themes/preferences in localStorage, no document contents. Clearing site data removes themes. This is an unverified design requirement.

## Performance Impact

Keep configuration small and apply validated tokens in one update without rebuilding editors repeatedly. No measurements.

## Current Limitations

No theme editor, complete token registry, JSON Schema or migration code yet; generate schema and runtime validation from one source.

## Release Information

Introduced: unreleased; Status: Planned.

## Related Documentation

[Usage](../usage.md) · [Architecture](../architecture.md) · [Privacy](../privacy.md)

## Feature Changelog

2026-10-28: recorded JSON/localStorage requirements and validation/fallback proposal.

---
[简体中文](../../zh/features/themes.md)
