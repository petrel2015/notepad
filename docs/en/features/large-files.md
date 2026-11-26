# Large-file design

> A local initial implementation now exists. This document retains the target design; [current implementation and acceptance](../implementation.md) is authoritative for status/deviations. “Unimplemented/pending” below describes the original planning baseline, not current code.

## Summary

Planned: chunked browsing, global literal search and replacement export.

## Background

The user requested desktop-like large-file handling and added global replacement.

## Problem

Whole-file loading, rendering all lines or retaining all matches can exhaust memory.

## Goals

Bounded buffers/queues, correct boundary matches, cancellation and source preservation.

## Non-Goals

No arbitrary interactive editing, arbitrary regex, large diff or whole-file JSON formatting initially.

## Solution Overview

Chunks → incremental decoder → sparse line index/window; global scans; streaming replacement to a distinct destination.

## Detailed Behavior

Validate UTF-8 first. Explicit BOM/invalid-input/mixed-ending policy; never silently save replacement characters for decoding errors. Retain decoder and boundary-match state, including multiline literals. Reject empty search terms. Match left-to-right without overlap; treat replacement as literal, not `$1` interpolation. Replacing `aa` with `b` in `aaa` yields `ba`. Empty replacement is allowed; never rescan generated text.

Freeze Unicode case/word rules and source-coordinate mapping. Cap/page visible results while continuing accurate total counts. Highlight viewport matches only. Source revisions and condition changes invalidate old tasks.

Reject the source itself as destination. Obtain output capability/permission before writing; apply backpressure. On read/write/encoding errors abort and attempt cleanup; label any residue incomplete. Completion requires successful output close; report input/output bytes and replacement count, and allow reopening. Detect external source changes and abort or require reopening rather than mixing versions.

## User Experience

Show mode, capability limits, phase/byte progress, match count and cancel. Explain unavailable line navigation while indexing.

## Compatibility and Historical Impact

No historical implementation. Without streaming disk output, refuse huge exports; allow only explicitly size-bounded in-memory downloads. Browser matrix is unverified.

## Data and Privacy Impact

Design requires no uploads/file contents in localStorage, minimal chosen-file permissions and content-free diagnostics. Not code-audited yet.

## Performance Impact

Budget chunks, queues, sparse index, viewport and results. 100 MB/1 GB are test tiers, not measurements. Segment long lines.

## Current Limitations

Unimplemented; output encodings, whole-word semantics, disk output and size limits need validation.

## Release Information

Introduced: unreleased; Status: Planned.

## Related Documentation

[Usage](../usage.md) · [Architecture](../architecture.md) · [Acceptance](../roadmap.md)

## Feature Changelog

2026-10-28: scope expanded from read-only browsing to global literal replacement export; interactive editing stays outside initial scope.

---
[简体中文](../../zh/features/large-files.md)
