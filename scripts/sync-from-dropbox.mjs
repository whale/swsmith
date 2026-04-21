#!/usr/bin/env node
/**
 * Mirrors photos from Dropbox → site/photos/.
 *
 * Source: /Apps/<app-folder>/<Category>/*.{jpg,jpeg,png,webp}
 * Target: site/photos/stephen-smith-<category>-<YYYY-MM-DD>-<hash>.jpg
 *
 * Behavior:
 *   - Category comes from the parent folder name in Dropbox
 *   - Date comes from Dropbox client_modified
 *   - Hash is the first 8 chars of Dropbox content_hash
 *   - Filename IS the identity — content change → new filename, old deleted
 *   - Only files matching stephen-smith-*.* on disk are managed by sync
 *     (legacy photos are left alone)
 *   - Images resized to max 1600px wide, JPEG q82
 *
 * Environment:
 *   DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN
 *   (read from process.env in CI, from scripts/.env locally)
 */

import {
  readFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PHOTOS_DIR = join(ROOT, "site", "photos");
const ENV_PATH = join(__dirname, ".env");

const CATEGORY_MAP = {
  landscapes: "landscape",
  wildlife: "wildlife",
  agriculture: "agriculture",
  people: "people",
  general: "general",
};

const SUPPORTED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;
const MANAGED_PREFIX = "stephen-smith-";

// ---------- config ----------

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(ENV_PATH)) {
    const text = readFileSync(ENV_PATH, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  const required = ["DROPBOX_APP_KEY", "DROPBOX_APP_SECRET", "DROPBOX_REFRESH_TOKEN"];
  for (const key of required) {
    if (!env[key]) {
      console.error(`Missing required env var: ${key}`);
      process.exit(1);
    }
  }
  return env;
}

// ---------- Dropbox API ----------

async function refreshAccessToken(env) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: env.DROPBOX_REFRESH_TOKEN,
    client_id: env.DROPBOX_APP_KEY,
    client_secret: env.DROPBOX_APP_SECRET,
  });
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function dropboxListFolder(token, path, recursive = true) {
  const entries = [];
  let res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, recursive, include_non_downloadable_files: false }),
  });
  if (!res.ok) throw new Error(`list_folder failed: ${res.status} ${await res.text()}`);
  let data = await res.json();
  entries.push(...data.entries);
  while (data.has_more) {
    res = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor: data.cursor }),
    });
    if (!res.ok) throw new Error(`list_folder/continue failed: ${res.status}`);
    data = await res.json();
    entries.push(...data.entries);
  }
  return entries;
}

async function dropboxDownload(token, path) {
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });
  if (!res.ok) throw new Error(`download failed for ${path}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// ---------- sync logic ----------

function parseCategory(pathLower) {
  // App-folder-scoped paths look like: /landscapes/photo.jpg
  const parts = pathLower.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return CATEGORY_MAP[parts[0]] || null;
}

function buildTargetName(file, category) {
  const date = (file.client_modified || file.server_modified || "").slice(0, 10);
  const hash = (file.content_hash || "").slice(0, 8);
  const ext = extname(file.name).toLowerCase() || ".jpg";
  // All resized output is written as .jpg regardless of source
  const outExt = ".jpg";
  void ext;
  return `${MANAGED_PREFIX}${category}-${date}-${hash}${outExt}`;
}

async function processAndSave(buffer, targetPath) {
  await sharp(buffer)
    .rotate() // honor EXIF orientation
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(targetPath);
}

async function main() {
  const env = loadEnv();

  if (!existsSync(PHOTOS_DIR)) mkdirSync(PHOTOS_DIR, { recursive: true });

  console.log("Refreshing Dropbox access token…");
  const token = await refreshAccessToken(env);

  console.log("Listing Dropbox files…");
  const entries = await dropboxListFolder(token, "", true);
  const files = entries.filter(e => e[".tag"] === "file");
  console.log(`Found ${files.length} files in Dropbox`);

  // Build desired set: target filename → dropbox file
  const desired = new Map();
  let skipped = 0;
  for (const file of files) {
    const ext = extname(file.name).toLowerCase();
    if (!SUPPORTED_EXT.has(ext)) {
      skipped++;
      continue;
    }
    const category = parseCategory(file.path_lower);
    if (!category) {
      skipped++;
      continue;
    }
    const targetName = buildTargetName(file, category);
    desired.set(targetName, file);
  }
  if (skipped) console.log(`Skipped ${skipped} files (unsupported format or not in a category folder)`);

  // Existing managed files on disk
  const onDisk = new Set(
    readdirSync(PHOTOS_DIR).filter(f => f.startsWith(MANAGED_PREFIX))
  );

  const toAdd = [...desired.keys()].filter(name => !onDisk.has(name));
  const toRemove = [...onDisk].filter(name => !desired.has(name));

  console.log(`To add: ${toAdd.length}, to remove: ${toRemove.length}, unchanged: ${onDisk.size - toRemove.length}`);

  // Add new files
  for (const name of toAdd) {
    const file = desired.get(name);
    try {
      console.log(`  + ${name}`);
      const buffer = await dropboxDownload(token, file.path_lower);
      await processAndSave(buffer, join(PHOTOS_DIR, name));
    } catch (err) {
      console.error(`    failed: ${err.message}`);
    }
  }

  // Remove orphans
  for (const name of toRemove) {
    try {
      console.log(`  - ${name}`);
      unlinkSync(join(PHOTOS_DIR, name));
    } catch (err) {
      console.error(`    failed: ${err.message}`);
    }
  }

  console.log("Sync complete");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
