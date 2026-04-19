# Stephen

## What This Is

Personal photography site for Stephen W. Smith (the user's dad). Plain static HTML/CSS/JS deployed to GitHub Pages at `stephenwadesmith.com`. Hero bio + masonry photo grid + category filters + lightbox.

## Key Files

- `site/index.html`, `site/style.css`, `site/app.js` — the site
- `site/photos.json` — generated manifest, don't hand-edit
- `site/photos/` — web-optimized JPGs (1600px / q82)
- `photos/` — originals, untouched archive
- `scripts/build-photos-json.mjs` — filename → category/date/dimensions manifest
- `reference/` — bio, LinkedIn, design references
- `.github/workflows/deploy.yml` — Pages deploy on push to main

## Project-Specific Instructions

- **Fonts are Google Fonts.** Newsreader (serif, headings) + Libre Franklin (body). Don't swap without checking with the user.
- **Categories come from the Figma design**, not the older `TODO.md`: Everything, Landscapes, Wildlife, Agriculture, People, General.
- **The goal is a dead-simple upload flow for the user's dad.** The long-term plan is Drive → repo sync via scheduled GitHub Action. Don't add anything that assumes dad uses git or GitHub.
- **Don't touch `photos/` (originals).** Always write to `site/photos/`.
- **When adding photos:** run `sips -Z 1600 -s format jpeg -s formatOptions 82` + regenerate `photos.json`.
- **Design source:** Figma file `QTLuaJhDE3ENPHUiVAlJhw`, frames `1:2` (home) and `2:102` (lightbox).
