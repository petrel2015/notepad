# Development and reproduction

Verified: Node 22.22.3, npm 10.9.8; Vite 6, TypeScript 5, CodeMirror 6. Exact versions are locked in package-lock.json. No backend or business model calls.

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
python3 scripts/generate-fixtures.py
NOTEPAD_LARGE_ACCEPTANCE=1 npm test -- tests/large-acceptance.test.ts
```

These commands were executed. Default tests run 16 unit cases and skip the opt-in disk test. Generate fixtures before enabling the last command. `python3 scripts/generate-fixtures.py --gib` additionally generates a 1 GiB fixture; reserve disk space. Fixtures/reports live in ignored .local and are not committed.

| Actual module | Responsibility |
| --- | --- |
| src/main.ts / style.css | UI, tabs/files, tasks, saving and theme management |
| src/editor.ts | CodeMirror adapter, tokens and markers |
| src/text.ts | Precise JSON, duplicate validation, statistics and cleanup |
| src/search-core.ts / search.worker.ts | Search/replacement captures and timeout isolation |
| src/large-core.ts / large.worker.ts | Bounded UTF-8, byte windows, search/replace, close/abort |
| src/themes.ts / themes/*.json | Whitelist, defaults, black/white configuration |
| tests/ | Deterministic boundaries and opt-in disk acceptance |

Coordination currently lives in main.ts. Split file/session services as complexity grows; proposed architecture directories are not all implemented. No lint configuration exists; typechecks/tests/build are not a claimed lint pass.

Hermes tasks should start at README_FOR_AI, then relevant specs/current evidence. Report commands, actual results, synthetic failures and limits without source text or sensitive paths. Separate algorithm, browser and native-output evidence.

[简体中文](../zh/development.md)

Formatting: `npm run format` and `npm run format:check` were executed successfully. `npm run preview -- --port 4173` served the production build for browser acceptance.
