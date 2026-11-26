# Chrome extension

A local Manifest V3 package sharing the web editor. Manifest version 0.1.0 is a package version, not a store release.

## Install

Run `npm ci` and `npm run build:extension`. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist-extension`. Extract ZIP packages first. Pin Notepad and click its icon to open a full editor tab without a local server.

Save documents before rebuilding/reloading the extension. Keep the same installation directory; removing the extension or changing its identity may lose theme preferences.

## Behavior and privacy

Each toolbar click opens an independent editor. Right-click selected web text and choose the Notepad entry to import an unsaved document in a new tab. Use the existing comparison controls afterward.

Only `contextMenus` and `storage` permissions are requested. No host access or content scripts. Selected text is limited to 1 Mi UTF-16 units without truncation. An opaque request ID enters the URL; text stays in `chrome.storage.session`, is removed after import, expires for import after ten minutes, and expired entries are cleaned on the next send. Browser session end clears session storage. Requests are serialized and use separate IDs. Errors open an editor with an explanatory message.

Themes remain in extension localStorage, separate from the web origin. Transfer them through JSON export/import. Documents are not automatically persisted. File selection permissions and large-file limits remain unchanged.

## Architecture

`extension/manifest.json` declares permissions and CSP. `src/extension-background.ts` handles entry points; `src/extension-handoff.ts` validates and acknowledges imports. Heavy tasks remain in page Workers, not the background service worker.

`npm run build:extension` bundles the editor, both Workers, background script and generated PNG icons into `dist-extension`. No remote scripts or runtime connections are allowed by the extension CSP. `npm run build` still produces the web app.

## Evidence

TypeScript, 20 unit tests, both builds and `npm run check:extension` passed. New tests cover expiration, size/type checks, web isolation and acknowledgement cleanup.

Actual Chrome installation is **not yet verified**. Toolbar/context menu actions, Workers/CSP under the extension origin and native saves require installation acceptance. Prior web 100 MiB/1 GiB evidence does not qualify the extension. No store publication or PWA support.

After installation check icon launch, Unicode selection import, search/replace, JSON tools, theme persistence, large-file search/cancel and native save readback; record Chrome version and results.

The existing Vitest 3 development dependency tree reports three npm audit findings. These dependencies are not shipped in the extension; a major test-framework upgrade was outside this change.
