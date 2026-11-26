# Implementation and acceptance

> A local initial implementation now exists. This document retains the target design; [current implementation and acceptance](implementation.md) is authoritative for status/deviations. “Unimplemented/pending” below describes the original planning baseline, not current code.

All stages are pending; documentation does not imply product completion. Sequence: 1 → 2 → 3/4 → 5 → 6. Validate large-file risks during stage 1.

| Stage | Deliverable | Acceptance |
| --- | --- | --- |
| 1 Feasibility | Editor comparison, I/O matrix, large-file prototype, decisions | Correct IME; boundary decoding/matching, disk output and long lines; measured environment/results |
| 2 Editing | Files/tabs, save/undo, status, markers | Correct round trips and undo; IME Enter; emoji/combining/tab/CRLF/selection counting cases |
| 3 Themes | Black/white JSON, management, import/export/storage | Consistent UI, reload restore, round-trip equivalence, malformed/quota/hostile-input fallback |
| 4 Search/tools | Normal search/regex/replace, JSON, cleanup | Errors preserve source, undo, precise numbers, terminable pathological regex |
| 5 Compare | Line/inline diff, navigation, merge | Correct changes, reject stale merges, undo both directions, ignore options preserve source |
| 6 Large files | Streaming browse/search/replacement export | Content/count matches independent oracle; progress/cancel/failure correctness; bounded caches/queues |

## Performance evidence

100 MB and 1 GB are proposed test tiers, not supported-size claims. Reproducible generators cover multiline, huge single lines, dense matches, cross-chunk terms, Chinese and mixed endings. Record seed, bytes and checksums; generate large fixtures temporarily, never commit them.

Record hardware, OS, browser, revision, first-visible latency, index/search duration, peak memory, cancellation latency, output size/checksum. Separate cold/warm cache runs. Freeze numerical gates after stage-1 baselines, not after observing later failures.

## Repeatable delivery

Hermes receives bounded tasks and returns change summaries, commands, actual results, failure fixtures and structured diagnostics. Use deterministic algorithm tests plus real-browser validation of permissions and UX. Independently review evidence and return concrete defects for repair.

Done means requirement-to-evidence mapping, visible limitations, consistent docs and no blocking defects. Deployment/publication is outside this documentation task.


---
[简体中文](../zh/roadmap.md)
