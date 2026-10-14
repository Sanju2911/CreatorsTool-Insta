# Setup and operations

## Prerequisites

- Node.js compatible with Vite 8: `^20.19.0 || >=22.12.0`. Node 24.14.1 and npm 11.11.0 were used for verification.
- Google Chrome for scraping, persistent browser sessions, and screenshots. `puppeteer-core` does not download a browser.
- A Supabase development project for cloud authentication and persistence.

The backend hardcodes `C:\Program Files\Google\Chrome\Application\chrome.exe` in `server/server.js` and `server/browserManager.js`. Other systems and alternate Chrome locations need source changes there. The screenshot script separately accepts `CHROME_PATH`.

## Install and environment

```bash
npm ci
```

Create `.env` from `.env.example` and replace both Supabase placeholders. PowerShell:

```powershell
Copy-Item .env.example .env
```

| Variable | Consumer | Meaning |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Browser-safe publishable key |
| `PORT` | Express | Backend port; defaults to 5000 |

Vite embeds `VITE_*` values at build time. Restart development after editing `.env`; rebuild for deployment. Never put a service-role key here.

`src/services/supabase.js` includes hardcoded fallback connection values. Configure your own project explicitly; omitting `.env` does not guarantee an offline app. The health endpoint's `supabaseConfigured` flag only checks whether the URL variable exists.

## Supabase

Use a fresh, disposable development database:

1. Open its Supabase SQL editor.
2. Review `supabase/schema.sql` in full.
3. Run it on the development database.
4. Configure email/password authentication for your project.
5. Confirm tables and Realtime publication entries exist.

The final SQL creates or extends 13 tables, creates auth-profile synchronization, and enables selected Realtime tables. No administrator credentials or personal account rows are seeded. It also **drops existing policies for the listed tables**, installs policies allowing public reads and writes, and grants public execution of a function listing authentication users. The current admin table/application still use plaintext passwords. These behaviors need changes before use with real team data or public access; running the SQL on an existing production database can weaken access controls. See [the final schema guide](../supabase/README.md).

The final schema includes project metadata and reaction columns required by current payloads. Several Supabase results are still not checked for an `error` field. A successful UI action can represent only local persistence; inspect database rows when validating cloud storage.

## Run locally

```bash
npm run dev
```

`scripts/dev.js` starts Express and Vite as child processes. Ctrl+C stops the launcher and services. Or run `npm run dev:server` and `npm run dev:client` in separate terminals.

Vite defaults to 5173 and may choose a later port if occupied. Express defaults to 5000. Although Vite proxies `/api`, multiple frontend fetches use `http://localhost:5000` directly. Changing `PORT` alone does not update those clients.

## Build and checks

```bash
npm run build
npm run preview
npm run lint
```

Preview serves only the frontend. Keep Express running for API features. The build currently warns about a chunk above 500 kB. There is no automated test command in `package.json`.

The original GitHub gallery is captured manually from the signed-in app using the development screenshot-privacy mode. See [SCREENSHOTS.md](SCREENSHOTS.md). The separate `node scripts/capture-docs-screenshots.js` utility still generates isolated fixture captures under `test-artifacts-docs-demo/`; it does not replace the original gallery.

## Troubleshooting

| Symptom | Check or action |
| --- | --- |
| npm lint fails on Windows | Paths containing `&` can break npm's executable wrapper. Run `node node_modules/oxlint/bin/oxlint`, or use a simpler checkout path. |
| Profile retrieval fails | Check `http://localhost:5000/api/health`, Chrome, and backend logs. |
| Chrome executable not found | Update backend `CHROME_PATH` constants; use the environment variable for screenshots. |
| Instagram media disappears | Signed CDN URLs can expire; refresh metadata. Login gates, rate limits, and markup changes can still block retrieval. |
| Data exists only in one browser | Local fallback is origin-specific. Verify Supabase writes and schema compatibility. |
| A cleared library reappears | Cloud rows may merge back into local storage; clearing local data does not necessarily remove cloud records. |
| Missing seed JSON breaks the build | Preserve `scratch/storyboard_seeds.json`, imported by `src/services/seedData.js` even though creative seed arrays are empty. |

## Deployment

`firebase.json` serves `dist/` and rewrites routes to `index.html`. It deploys only the frontend, not Express or Chrome. No deploy command exists in `package.json`.

Before public deployment:

- Replace direct localhost API URLs with a configurable production base URL and host the backend separately or behind a same-origin proxy.
- Require verified authentication and enforce authorization in the API/database. Local sessions and client-side filtering are not access controls.
- Replace public RLS policies and plaintext seeded admin authentication; restrict the auth-user listing function.
- Restrict CORS and validate outbound URLs for fetch/proxy/browser endpoints.
- Provision Chrome and define browser session isolation, storage, and cleanup.
- Decide whether creative libraries should remain global or become project-scoped.

These are limitations in the current source, not completed deployment features.
