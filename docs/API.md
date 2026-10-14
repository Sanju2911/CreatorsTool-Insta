# Backend API

Local base URL: `http://localhost:5000`. The Express server accepts JSON and enables CORS. These endpoints currently have no server-enforced authentication middleware. Most creative CRUD operations go directly from the client to Supabase and are not part of this API.

## HTTP routes

| Method | Route | Input | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | None | Status, uptime, timestamp, environment configuration flag |
| POST | `/api/instagram/parse` | JSON `{ "url": "..." }` | Classify/normalize profile, reel, or post URLs |
| GET | `/api/instagram/profile-info` | `query`, `url`, or `handle`; optional `live=true` or `force=true` | Scrape/cache profile details and posts |
| POST | `/api/instagram/reel-metadata` | JSON `{ "url": "..." }` | Resolve metadata and media/embed URLs |
| GET | `/api/instagram/video-stream` | `url`, or a `shortcode` found in the metadata cache | Proxy upstream video bytes |
| GET | `/api/instagram/live-metrics` | `handle`, `baseFollowers` | Echo supplied follower count with connection-style status |
| GET | `/api/projects/:projectId/browser-session` | Project ID path parameter | Read in-memory session descriptor or default sample sections |
| POST | `/api/projects/:projectId/browser-session` | `currentSection`, `sections` | Replace in-memory session descriptor |
| GET | `/api/projects/:projectId/telemetry` | Project ID path parameter | Fixed sample reach/engagement values |
| GET | `/api/instagram/browser-frame` | `url` or `handle` | Fetch HTML and adjust it for a proxied frame |
| POST | `/api/browser/launch-chrome` | `handle`, optional `sectionId` | Launch a dedicated persistent Chrome application window |

Example health check in PowerShell:

```powershell
Invoke-RestMethod 'http://localhost:5000/api/health'
```

Example URL parsing:

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:5000/api/instagram/parse' -ContentType 'application/json' -Body '{"url":"https://www.instagram.com/reel/example/"}'
```

Profile lookup generally returns `{ "success": true, "data": { ... } }`, with camelCase metadata such as `handle`, `avatarUrl`, `followersCount`, and `postsCount`. Missing required inputs can return HTTP 400; external/proxy failures can return HTTP 500. Error envelopes are not uniform across routes.

Scraping may return cached/fallback values even when the live upstream profile is unavailable. Telemetry is explicitly sample data, and live-metrics does not query Instagram. In-memory caches and session descriptors disappear on backend restart; Chrome profile files persist separately.

## Browser stream

WebSocket URL: `ws://localhost:5000/browser-stream`.

The first `init` message provides a handle, section identifier, and optional initial URL/viewport. The server creates or reuses a Chrome session and emits JPEG frames as data URLs with the page URL. Subsequent messages support navigation, mouse movement/click/drag, wheel scrolling, text input, keypresses, reload, back, forward, and resize. Consult `server/browserManager.js` for the authoritative payload fields for each event.

The currently visible dashboard profile panel does not connect to this stream. This is a separate backend capability and is not validated by the documentation screenshots.

## Hosting limits

Proxy/browser routes accept outbound targets and Chrome sessions without a production access boundary. Restrict access and validate targets before public hosting. Changing Express `PORT` does not change the hardcoded client URLs. See [SETUP.md](SETUP.md#deployment).
