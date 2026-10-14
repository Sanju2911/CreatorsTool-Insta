# Preparing this project for GitHub

This workspace did not have a Git repository when documentation was prepared. Documentation and images are ready as local files; no repository was created or pushed.

## Files to include

Include application source, `server/`, `scripts/`, `supabase/`, `public/`, `index.html`, package files, Vite/lint configuration, `.env.example`, `.gitignore`, `README.md`, and `docs/`. Keep `scratch/storyboard_seeds.json`: the application currently imports it. Review other scratch utilities before deciding to include them.

The README already embeds repository-relative screenshot paths. Upload `docs/screenshots/` along with the README so GitHub can render the images.

## Local exclusions and source review

The updated `.gitignore` excludes `.env` variants except `.env.example`, `node_modules/`, `dist/`, `.firebase/`, `browser-sessions/`, ad hoc test screenshot folders, and scratch PNGs. Browser profiles can contain account sessions and must stay local. If files were already tracked in a future repository, ignore rules alone would not untrack them.

Before publishing source, review:

- Hardcoded Supabase fallback URL/key in `src/services/supabase.js`. Publishable keys are client-visible by design; configure your own connection and ensure database policies enforce access.
- Local fallback admin credentials in `src/services/activityTracker.js`. The final `supabase/schema.sql` contains no seeded credentials; replace the application's fallback authentication approach before production use.
- Fixed credentials/accounts in existing manual test scripts.
- Seed account/profile details, signed Instagram media URLs, scratch data, and `.firebaserc` project selection for intended public visibility.
- License choice. There is currently no license file.

The final gallery contains the original signed-in workspace with identity details masked; no credentials were saved in screenshot tooling. Upload the image files, not page HTML, browser profiles, or session exports. Existing source fixtures still contain account-specific metadata, so the full application source needs a separate privacy review before public upload.

## Verification before upload

```bash
npm run build
node node_modules/oxlint/bin/oxlint
```

The build passed during preparation with a large-chunk warning. Final direct Oxlint reported 0 errors and 135 warnings after local artifacts were excluded; the npm wrapper fails on this Windows folder's `&`. Existing integration scripts can change data; review them before running.

To refresh original images, follow [SCREENSHOTS.md](SCREENSHOTS.md) and visually inspect the masking. The demo utility writes only to the ignored `test-artifacts-docs-demo/` directory.

## Initialize and upload when ready

Create an empty repository in your GitHub account. In this project's directory, use the following commands after reviewing which source files should be public:

```bash
git init
git add README.md docs .env.example .gitignore
git add src server public scripts supabase scratch/storyboard_seeds.json
git add package.json package-lock.json index.html vite.config.js .oxlintrc.json
git status --short
git diff --cached --stat
```

Review staged content, then commit:

```bash
git commit -m "Add content creation workspace with documentation and screenshots"
git branch -M main
```

Add the remote using the URL of your own empty repository, then push:

```bash
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

Firebase configuration can be committed separately after reviewing its project selection. Hosting the source on GitHub does not deploy the application.
