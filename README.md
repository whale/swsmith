# Stephen W. Smith — Photography

Personal photography site for Stephen W. Smith. Static site, deployed to GitHub Pages at [stephenwadesmith.com](https://stephenwadesmith.com).

## What this is

A single-page portfolio: hero bio + masonry grid of photos + category filters + lightbox. Plain HTML/CSS/JS, no framework. Google Fonts for Newsreader (headings) and Libre Franklin (body).

## Structure

```
site/              # the deployed site
  index.html
  style.css
  app.js
  photos.json      # manifest, built by scripts/build-photos-json.mjs
  photos/          # web-optimized gallery JPGs (1600px max, q82)
  assets/          # site chrome — portrait, og image, favicons
photos/            # originals — not served, untouched archive
reference/         # bio, LinkedIn, design refs — not served
scripts/
  build-photos-json.mjs
.github/workflows/
  deploy.yml       # deploys site/ to GitHub Pages on push to main
```

## Local preview

```bash
cd site && python3 -m http.server 8000
# then open http://localhost:8000
```

## Adding or removing photos (current workflow)

1. Drop originals into `photos/`
2. Run `sips -Z 1600 -s format jpeg -s formatOptions 82 photos/NEW.JPG --out site/photos/NEW.jpg`
3. Run `node scripts/build-photos-json.mjs` to regenerate the manifest
4. Commit and push — GitHub Actions deploys automatically

## Future: Google Drive sync (TODO)

The plan is a scheduled GitHub Action that pulls from a shared Drive folder, so Stephen only has to upload there. Not built yet.

## Filename → category convention

Categories are derived from filename keywords (first match wins):

1. **people** — `family`, `hunting`, `fishing`, `camping`
2. **wildlife** — `deer`, `elk`, `owl`, `bear`, `bird`, `butterfly`, `turkey`, `eagle`, `bison`, `crane`, `coyote`, `fawn`, `moose`
3. **agriculture** — `irrigation`, `sprinkler`, `pivot`, `farm`, `ranch`, `drone`, `uav`, `barns`, `canal`, `reservoir`
4. **landscape** — park codes (`RMNP`, `GTNP`, `YNP`), `Wilderness`, `River`, `Plains`, `Buttes`, `MT_`, `Wyoming`, etc.
5. **general** — fallback

Full rules live at the top of `scripts/build-photos-json.mjs`.

## GitHub Pages setup (one-time)

Under **repo → Settings → Pages**, set **Source = GitHub Actions**.

For the custom domain `stephenwadesmith.com`:
1. Add the domain in the Pages settings
2. Point the domain's DNS `A` records to GitHub Pages IPs (185.199.108.153 – 185.199.111.153), and a `CNAME` for `www` pointing to `<username>.github.io`
3. Check "Enforce HTTPS" after DNS propagates
