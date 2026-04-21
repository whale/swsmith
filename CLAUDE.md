# Stephen

## What This Is

Personal photography site for Stephen W. Smith (the user's dad). Plain static HTML/CSS/JS. Page sections: hero → consulting (Wade Water LLC) → timeline ("N years of Good living") → photography (masonry grid + filters + lightbox) → footer (Jimmy Buffett quote).

## Key Files

- `site/index.html`, `site/style.css`, `site/app.js` — the site
- `site/timeline.json` — timeline entry copy, rendered by `app.js`
- `site/photos.json` — generated manifest, don't hand-edit
- `site/photos/` — web-optimized JPGs (1600px / q82), auto-populated from Dropbox sync
- `site/assets/` — static art (portrait, consulting images, OG image, favicons)
- `photos/` — pre-sync originals, untouched archive (gitignored)
- `scripts/build-photos-json.mjs` — filename → category/date/dimensions manifest
- `scripts/sync-from-dropbox.mjs` — Dropbox → `site/photos/` mirror sync (downloads, resizes via `sharp`, renames to `stephen-smith-<category>-<date>-<hash>.jpg`)
- `scripts/dropbox-auth.mjs` — one-time helper to mint a Dropbox refresh token
- `scripts/organize-for-dropbox.mjs` — one-time helper used during initial migration
- `reference/` — bio, LinkedIn, design references, career timeline source
- `.github/workflows/deploy.yml` — GitHub Pages deploy on push to main
- `.github/workflows/sync-photos.yml` — 15-min cron: Dropbox → repo → Pages deploy

## Deployment

Two hosts run in parallel:

- **Production (GitHub Pages):** `stephenwadesmith.com` — deploys `main` via `.github/workflows/deploy.yml`.
- **Previews (Vercel):** `stephen-kappa.vercel.app` follows latest `main`; every branch push gets a unique `stephen-git-<branch>-<team>.vercel.app` URL. Project is connected to the `whale/swsmith` GitHub repo; config lives in `vercel.json` (no build, serves from `site/`) and `.vercelignore` (excludes `/photos/`, `/reference/`, `/scripts/node_modules`, etc.).

**`.vercelignore` gotcha:** patterns must be anchored with a leading `/` (e.g. `/photos/`, not `photos/`), otherwise they also match `site/photos/` and Vercel ships an empty gallery. Same for `*.md` (use `/*.md`).

**Showing Stephen a branch:**
```
git checkout -b stephen-preview
git push -u origin stephen-preview
```
Vercel auto-deploys; grab the preview URL from the commit check or the Vercel dashboard and send it to him. The branch URL stays stable until you push more to it.

## Project-Specific Instructions

- **Fonts are Google Fonts.** Newsreader (serif, headings) + Libre Franklin (body) + IBM Plex Mono (timeline year badges). Don't swap without checking with the user.
- **Photo categories:** Everything, Landscapes, Wildlife, Agriculture, People, General (match Figma, not old `TODO.md`).
- **Dad's upload flow is Dropbox, not git.** Photos land at `/Apps/Stephen Smith Site Sync/<Category>/` in his Dropbox → cron syncs → `site/photos/`. Don't add anything that assumes he uses git or GitHub.
- **Don't touch `photos/` (originals).** Always write to `site/photos/`, and for production photos let the Dropbox sync do it.
- **Figma-to-code:** load the Figma MCP tools (`ToolSearch "+figma"`) and run `get_design_context` for exact specs BEFORE writing CSS. Eyeballing the screenshot leads to wrong spacing/typography. Memory file `feedback_figma_spec_extraction.md` has the full protocol.
- **Design source:** Figma file `QTLuaJhDE3ENPHUiVAlJhw`. Frames: `1:2` home desktop, `25:315` timeline mobile, `2:102` lightbox.
