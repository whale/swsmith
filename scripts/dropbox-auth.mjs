#!/usr/bin/env node
/**
 * One-time helper to get a long-lived Dropbox refresh token.
 *
 * Reads DROPBOX_APP_KEY and DROPBOX_APP_SECRET from scripts/.env,
 * opens the Dropbox authorization page in your browser, asks you to
 * paste the code it shows you, and prints the refresh token to copy
 * into GitHub Actions secrets.
 *
 * Usage:
 *   1. Put DROPBOX_APP_KEY and DROPBOX_APP_SECRET into scripts/.env
 *   2. node scripts/dropbox-auth.mjs
 *   3. In the browser: sign in as dad, click Allow, copy the code
 *   4. Paste the code back into the terminal
 *   5. Copy the printed refresh token into GitHub as DROPBOX_REFRESH_TOKEN
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, ".env");

function loadEnv() {
  let text;
  try {
    text = readFileSync(ENV_PATH, "utf8");
  } catch {
    console.error(`Could not read ${ENV_PATH}`);
    console.error(`Create it with:\n  DROPBOX_APP_KEY=...\n  DROPBOX_APP_SECRET=...`);
    process.exit(1);
  }
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function openInBrowser(url) {
  try {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const env = loadEnv();
  const APP_KEY = env.DROPBOX_APP_KEY;
  const APP_SECRET = env.DROPBOX_APP_SECRET;

  if (!APP_KEY || !APP_SECRET) {
    console.error(`Missing DROPBOX_APP_KEY or DROPBOX_APP_SECRET in ${ENV_PATH}`);
    process.exit(1);
  }

  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${APP_KEY}&response_type=code&token_access_type=offline`;

  console.log("\nOpening Dropbox authorization page in your browser...");
  console.log(`If it doesn't open automatically, visit:\n  ${authUrl}\n`);
  openInBrowser(authUrl);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("Paste the authorization code here: ")).trim();
  rl.close();

  if (!code) {
    console.error("No code provided.");
    process.exit(1);
  }

  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: APP_KEY,
    client_secret: APP_SECRET,
  });

  console.log("\nExchanging code for refresh token...");
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`\nDropbox returned ${res.status}:\n${body}`);
    process.exit(1);
  }

  const data = await res.json();

  if (!data.refresh_token) {
    console.error("\nNo refresh_token in response. Full response:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\n================================================================");
  console.log("Refresh token (add to GitHub Actions as DROPBOX_REFRESH_TOKEN):");
  console.log("================================================================");
  console.log(data.refresh_token);
  console.log("================================================================\n");
  console.log("Store it safely — it doesn't expire until revoked.");
  console.log("Also add DROPBOX_APP_KEY and DROPBOX_APP_SECRET as GitHub secrets.\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
