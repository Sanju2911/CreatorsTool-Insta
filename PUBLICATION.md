# Public source distribution

This repository includes the complete application source and runnable build configuration. The live local workspace remains unchanged. The published copy replaces account-specific fixtures with generic demo workspaces, removes initial scraped profile/reel caches and signed media URLs, removes preset administrator credentials, and requires your own Supabase/Firebase configuration. Historic manual test scripts use generic identities; the phone login utility accepts TEST_EMAIL and TEST_PASSWORD environment variables.

Excluded files are .env, node_modules, dist, browser-sessions, Firebase cache, raw test artifacts, and scratch experiments. The old unused scratch JSON dependency was removed from the public seed module. Original masked documentation screenshots remain included.

Build and lint were checked on this staged distribution before upload. The SQL retains the documented development policies and has not been applied to a live database.
