# Planned failure handling

A local implementation exists. This table is troubleshooting guidance; observed corrections are in [acceptance](implementation.md).

| Scenario | Investigation and expected action |
| --- | --- |
| Garbled text | Check encoding/BOM, allow re-selection; never silently save invalid decoding |
| Huge export unavailable | Check streaming capability/permission; never fall back to unbounded buffers |
| Write failure/disk full | Abort, preserve source, clean or label incomplete destination |
| Results after cancellation | Check task/revision filtering; reject stale results |
| Theme import failure | Show JSON/field error and keep active theme |
| Theme lost on reload | Check storage rejection/quota/corruption; fallback/export, never claim successful persistence |
| Slow/dense search | Progress/cancel, bounded visible results, ongoing total count |
| Incorrect merge position | Check revisions, discard stale diff and recompute |

Reports include browser, mode, file size, steps, error code and sanitized diagnostics. Prefer synthetic reproductions.

---
[简体中文](../zh/troubleshooting.md)
