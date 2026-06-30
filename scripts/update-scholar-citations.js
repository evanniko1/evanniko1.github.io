#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "content", "citations.json");
const SCHOLAR_USER_ID = process.env.SCHOLAR_USER_ID || "H8fc2JgAAAAJ";
const PROFILE_PATH = "/citations?user=" + encodeURIComponent(SCHOLAR_USER_ID) + "&hl=en";
const PROFILE_URLS = [
  "https://scholar.google.com" + PROFILE_PATH,
  "https://scholar.google.co.uk" + PROFILE_PATH,
];
const ALLOW_STALE = process.env.ALLOW_STALE === "true";
const REQUEST_PROFILES = [
  {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
  },
  {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
  },
  {
    "User-Agent": "Mozilla/5.0 (compatible; emnikolados.dev citation tracker; +https://emnikolados.dev/)",
    "Accept-Language": "en-GB,en;q=0.9",
  },
];

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchProfile() {
  const errors = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const profileUrl of PROFILE_URLS) {
      for (const headers of REQUEST_PROFILES) {
        try {
          const response = await fetch(profileUrl, { headers });

          if (!response.ok) {
            throw new Error(new URL(profileUrl).host + " returned HTTP " + response.status + ".");
          }

          return await response.text();
        } catch (error) {
          errors.push(error.message);
        }
      }
    }

    if (attempt < 3) {
      await delay(attempt * 2000);
    }
  }

  throw new Error("Scholar fetch failed after retries: " + errors.slice(-6).join(" | "));
}

function parseCitationCount(html) {
  const match = html.match(/<td[^>]*class="gsc_rsb_std"[^>]*>([0-9,]+)<\/td>/i);
  if (!match) {
    throw new Error("Could not find the total citation count in the Scholar profile.");
  }

  const total = Number(match[1].replaceAll(",", ""));
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("Scholar returned an invalid citation count.");
  }

  return total;
}

async function main() {
  try {
    const html = await fetchProfile();
    const totalCitations = parseCitationCount(html);
    const payload = {
      totalCitations,
      updatedAt: new Date().toISOString().slice(0, 10),
      profileUrl: "https://scholar.google.com/citations?user=" + SCHOLAR_USER_ID,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log("Google Scholar total citations: " + totalCitations);
  } catch (error) {
    if (ALLOW_STALE && fs.existsSync(OUTPUT_PATH)) {
      console.warn("::warning title=Scholar citation refresh kept stale data::" + error.message);
      console.warn("Scholar refresh failed; keeping the last known count. " + error.message);
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
