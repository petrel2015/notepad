# Data handling

Current source performs text reading/editing/diff/JSON/search/replacement in-browser, with no content-upload fetch/XHR, business backend or model calls. Build dependencies are bundled; Vite development opens an HMR connection. Production asset loads still use HTTP, so this is not a zero-network claim.

| Storage | Content | Lifetime |
| --- | --- | --- |
| notepad.themes.v1 | Custom theme JSON list | Until deletion/site-data clearing |
| notepad.preferences.v1 | Active theme ID | Same |
| Page memory | Documents, file references, undo and results | Lost on close/reload |

No document contents in localStorage and no automatic draft recovery. Storage failure is visible and themes can be exported. Read/write permissions are requested through chosen-file actions; replacement output rejects the source handle. GitHub Pages serves static assets and receives page requests and ordinary connection metadata. The editor does not upload document contents; hosting logs are managed by GitHub.

[简体中文](../zh/privacy.md)
