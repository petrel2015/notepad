# Build and deployment

Site: https://petrel2015.github.io/notepad/ . Repository: https://github.com/petrel2015/notepad .

`.github/workflows/pages.yml` installs dependencies, runs tests, builds dist and deploys a Pages artifact on main pushes or manual dispatch. A successful deploy job confirms publication.

`vite.config.ts` uses relative asset URLs for the /notepad/ project path. The editor, CSS, favicon and both Workers are bundled. File permissions and large-file limits are unchanged. No Service Worker, PWA or offline cache is promised.

Reproduce with `npm ci`, `npm test`, and `npm run build`. Verify the live HTML, assets and both Workers after deployment. The Chrome extension remains a separate build; see the [extension guide](extension.md).

GitHub assigns the default subdomain to the account: petrel2015.github.io, with notepad as the project path. A custom notepad.example.com requires ownership of example.com, a DNS CNAME to petrel2015.github.io, and Pages custom-domain/HTTPS configuration.

[简体中文](../zh/deployment.md)

2026-11-26 acceptance: GitHub Actions run 45732448285 succeeded; HTTPS returned 200; browser normal search found 5 matches, and the 100 MiB fixture returned 1,978,446 token-needle matches. Native save was not tested in this deployment acceptance.
