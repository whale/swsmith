#!/usr/bin/env node
/**
 * Reads site/photos/, categorizes each file by filename, reads dimensions,
 * writes site/photos.json.
 *
 * Category rules (first match wins):
 *   1. people-activities:  family | hunting | hunt_ | fishing | camping | Smith_family
 *   2. wildlife:           deer | elk | mule | owl | bear | bird | butterfly | turkey | eagle | bison | crane | coyote | fawn | sandhill | moose
 *   3. agriculture:        irrigation | sprinkler | pivot | farm | ranch | drone | UAV | louden | LIRF | HOAL | Hoshiko | Jalgaon | barns | plow | combine | crop | canal | reservoir | sod
 *   4. landscape:          Wilderness | Yellowstone | YNP | RMNP | GTNP | NBR | GSCNP | NCLPIC | NP_ | River | Plains | Buttes | Mountain | Pano | MT_ | Wyoming | Madison | Frying | Missouri | Platte | Steamboat | Arikeree
 *   5. general:            fallback
 *
 * Date extracted from leading YYYYMMDD in filename, if present.
 */

import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PHOTOS_DIR = join(ROOT, "site", "photos");
const OUTPUT = join(ROOT, "site", "photos.json");

const RULES = [
  { category: "people", keywords: ["smith_family", "family", "hunting", "hunt_", "fly_fishing", "fishing", "camping"] },
  { category: "wildlife", keywords: ["muledeer", "mule_deer", "deer", "elk", "owl", "bear", "butterfly", "turkey", "eagle", "bison", "crane", "coyote", "fawn", "sandhill", "moose", "birds", "bird"] },
  { category: "agriculture", keywords: ["irrigation", "sprinkler", "pivot", "sod_farm", "ranch", "drone", "uav", "louden", "lirf", "hoal", "hoshiko", "jalgaon", "barns", "canal", "reservoir"] },
  { category: "landscape", keywords: ["wilderness", "yellowstone", "ynp", "rmnp", "gtnp", "nbr", "gscnp", "nclpic", "national_bison", "_np_", "river", "plains", "buttes", "mountain", "pano", "mt_", "wyoming", "madison", "frying_pan", "missouri", "north_platte", "steamboat", "arikeree", "bvf_"] },
];

function categorize(filename) {
  const name = filename.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => name.includes(k))) return rule.category;
  }
  return "general";
}

function parseDate(filename) {
  const m = filename.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Minimal JPEG dimension reader. Scans SOF markers. Returns {width, height} or null.
 * Avoids a dependency for a very small use case.
 */
function readJpegSize(path) {
  try {
    const buf = readFileSync(path);
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      i += 2;
      if (marker === 0xd8 || marker === 0xd9) continue;
      const len = buf.readUInt16BE(i);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buf.readUInt16BE(i + 3);
        const width = buf.readUInt16BE(i + 5);
        return { width, height };
      }
      i += len;
    }
    return null;
  } catch {
    return null;
  }
}

function main() {
  let files;
  try {
    files = readdirSync(PHOTOS_DIR)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort();
  } catch (err) {
    console.error(`Could not read ${PHOTOS_DIR}:`, err.message);
    process.exit(1);
  }

  const manifest = files.map(file => {
    const full = join(PHOTOS_DIR, file);
    const size = readJpegSize(full) || {};
    const entry = {
      file,
      category: categorize(file),
      date: parseDate(file),
    };
    if (size.width && size.height) {
      entry.width = size.width;
      entry.height = size.height;
    }
    return entry;
  });

  // Sort newest first by date, fallback to filename
  manifest.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.file.localeCompare(b.file);
  });

  writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2) + "\n");

  const counts = manifest.reduce((acc, p) => ((acc[p.category] = (acc[p.category] || 0) + 1), acc), {});
  console.log(`Wrote ${manifest.length} photos to ${OUTPUT}`);
  console.log("Categories:", counts);
}

main();
