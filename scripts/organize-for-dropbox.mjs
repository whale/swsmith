#!/usr/bin/env node
/**
 * One-time helper to sort the existing photos/ archive into category
 * subfolders under dropbox-staging/. Drag each subfolder into Dropbox
 * at /Apps/<app-name>/ when you're ready.
 *
 * Categorization is an explicit manifest, built by visual review of each
 * photo. Edit the MANIFEST below if you disagree with any placement.
 */

import { readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE_DIR = join(ROOT, "photos");
const STAGING_DIR = join(ROOT, "dropbox-staging");

const CATEGORIES = ["Landscapes", "Wildlife", "Agriculture", "People", "General"];

const MANIFEST = {
  // Agriculture
  "20090508__MT_barns_(12).JPG": "Agriculture",
  "20090701_sprinkler_irrigation_in_weld_Co._(0).JPG": "Agriculture",
  "20090701_sprinkler_irrigation_in_weld_Co._(19).JPG": "Agriculture",
  "20090919_pivot_sprinkler_irrigation_sod_farm_(2).JPG": "Agriculture",
  "20090919_pivot_sprinkler_irrigation_sod_farm_(4).JPG": "Agriculture",
  "20120726_LIRF_UAV_flights_small_image.JPG": "Agriculture",
  "20121021_Louden_IC&RC_tour_(94).JPG": "Agriculture",
  "20140511_misc_019.JPG": "Agriculture",
  "20140613_misc_006.JPG": "Agriculture",
  "20140811_Hoshiko_024.JPG": "Agriculture",
  "20160509_misc_021.JPG": "Agriculture",
  "20160627_BVF_(7).JPG": "Agriculture",
  "20160702_(9).JPG": "Agriculture",
  "20170504_drone_(99).JPG": "Agriculture",

  // Wildlife
  "20090510_Montana_fishing_(173).JPG": "Wildlife",
  "20090708_Rawah_Wilderness_(117).JPG": "Wildlife",
  "20090708_Rawah_Wilderness_(39).JPG": "Wildlife",
  "20100807_owl_in_boxelder_(2).JPG": "Wildlife",
  "20110205_BVF_muledeer_(13).JPG": "Wildlife",
  "20110529_muledeer_(5).JPG": "Wildlife",
  "20110709_Delaney_Buttes_camping_(15).JPG": "Wildlife",
  "20111204_deer_hunting_in_unit_102_(44)_with_SWS_edits_10-4-12.JPG": "Wildlife",
  "20111204_deer_hunting_in_unit_102_(60)_with_SWS_edits_10-4-12.JPG": "Wildlife",
  "20120213_mule_deer_(12).JPG": "Wildlife",
  "20120314_mule_deer_at_BVF_(23)_with_SWS_edits_10-4-12.JPG": "Wildlife",
  "20120415_turkey_hunt_(19)_with_SWS_edits_10-4-12.JPG": "Wildlife",
  "20120526_BVF_birds_(9).JPG": "Wildlife",
  "20120606_BVF_butterfly_(5).JPG": "Wildlife",
  "20120716_bear_in_Cibola_NF_in_NM_(2)_with_SWS_edits_10-4-12.JPG": "Wildlife",
  "20120801_Yellowstone_NP_042.JPG": "Wildlife",
  "20120916_RMNP_elk_(55)_with_edits_10-4-12.JPG": "Wildlife",
  "20120922_RMNP_elk_(30).JPG": "Wildlife",
  "20121013_Madison_River_day_2_eagle_(38).JPG": "Wildlife",
  "20130105_BVF_mule_deer_(20).JPG": "Wildlife",
  "20130330_Arikeree_turkey_033.JPG": "Wildlife",
  "20130617_misc_009.JPG": "Wildlife",
  "20130715_BVF_owl_(11).JPG": "Wildlife",
  "20130721_RMNP_014.JPG": "Wildlife",
  "20140504_RMNP_017.JPG": "Wildlife",
  "20140518_RMNP_035.JPG": "Wildlife",
  "20140518_RMNP_080.JPG": "Wildlife",
  "20140525_RMNP_013.JPG": "Wildlife",
  "20140710_MT_228.JPG": "Wildlife",
  "20140928_National_Bison_Range_021.JPG": "Wildlife",
  "20140928_National_Bison_Range_066.JPG": "Wildlife",
  "20140929_Missouri_River_136.JPG": "Wildlife",
  "20150331_sandhill_crane_040.JPG": "Wildlife",
  "20150716_misc_042.JPG": "Wildlife",
  "20150722_MT_148.JPG": "Wildlife",
  "20150918_GTNP_082.JPG": "Wildlife",
  "20150919_002.JPG": "Wildlife",
  "20160508_owl_005.JPG": "Wildlife",
  "20161023_RMNP_(42).JPG": "Wildlife",
  "20170102_mule_deer_(5).JPG": "Wildlife",
  "20170802_mule_deer_fawn_(31).JPG": "Wildlife",
  "20170913_NBR_(115).JPG": "Wildlife",
  "20171019_RMNP_(31).JPG": "Wildlife",
  "20171125_GSCNP_(73).JPG": "Wildlife",
  "20180115_coyote_(17).JPG": "Wildlife",
  "20181223_mule_deer_bucks.JPG": "Wildlife",
  "20190815_GTNP_(8).jpg": "Wildlife",
  "20190817_Wyoming_(50).jpg": "Wildlife",

  // People
  "20120720_Salazar_Ranch_(32).JPG": "People",
  "20120811_Smith_family_at_Steamboat_072.JPG": "People",
  "20130812_Frying_Pan_013.JPG": "People",
  "20131019_fly_fishing_on_the_Madison_212.JPG": "People",
  "20140223_Jalgaon_India_068.JPG": "People",
  "20140816_misc_039.JPG": "People",
  "20150628_GTNP_100.JPG": "People",
  "20151206_HOAL_010.JPG": "People",
  "20170916_MT_fly_fishing_(58).JPG": "People",
  "IMG_0766.JPG": "People",

  // Landscapes
  "20130331_North_Platte_River_049.JPG": "Landscapes",
  "20130702_camping_131.JPG": "Landscapes",
  "20131029_HOAL_Wyoming_hunt_141.JPG": "Landscapes",
  "20140718_misc_017.JPG": "Landscapes",
  "20150627_2_083.JPG": "Landscapes",
  "20150725_YNP_003.JPG": "Landscapes",
  "20150815_misc_016-Pano.JPG": "Landscapes",
  "20170121_Louden_(14).JPG": "Landscapes",

  // General
  "20100531_NCLPIC_Cornish_Plains_(6).JPG": "General",
  "20120111_Shanghai_(77).JPG": "General",
  "20121011_Yellowstone_NP_D2_(65).JPG": "General",
  "20130813_Frying_Pan_River_(92).JPG": "General",
  "20130813_Frying_Pan_River_(96).JPG": "General",
  "20131201_unit_102_deer_hunting_009.JPG": "General",
  "grilling_vegetables.JPG": "General",
  "IMG_0737.JPG": "General",
};

function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`No ${SOURCE_DIR} directory — nothing to sort.`);
    process.exit(1);
  }

  for (const cat of CATEGORIES) {
    mkdirSync(join(STAGING_DIR, cat), { recursive: true });
  }

  const onDisk = new Set(readdirSync(SOURCE_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f)));
  const inManifest = new Set(Object.keys(MANIFEST));

  const missingFromManifest = [...onDisk].filter(f => !inManifest.has(f));
  const missingFromDisk = [...inManifest].filter(f => !onDisk.has(f));

  if (missingFromManifest.length) {
    console.warn(`\n⚠ ${missingFromManifest.length} files in photos/ not in manifest (will go to General):`);
    for (const f of missingFromManifest) console.warn(`  ${f}`);
  }
  if (missingFromDisk.length) {
    console.warn(`\n⚠ ${missingFromDisk.length} files in manifest not in photos/:`);
    for (const f of missingFromDisk) console.warn(`  ${f}`);
  }

  const counts = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
  let copied = 0;

  for (const file of onDisk) {
    const category = MANIFEST[file] || "General";
    const src = join(SOURCE_DIR, file);
    const dst = join(STAGING_DIR, category, file);
    copyFileSync(src, dst);
    counts[category]++;
    copied++;
  }

  console.log(`\nCopied ${copied} photos to ${STAGING_DIR}`);
  console.log("By category:");
  for (const cat of CATEGORIES) console.log(`  ${cat}: ${counts[cat]}`);
  console.log("\nNext: drag each subfolder from dropbox-staging/ into");
  console.log("Dropbox /Apps/<app-name>/ via the web UI or desktop app.");
  console.log("After upload completes, you can delete dropbox-staging/ locally.");
}

main();
