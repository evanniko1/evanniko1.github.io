#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "content", "citations.json");
const SCHOLAR_USER_ID = process.env.SCHOLAR_USER_ID || "H8fc2JgAAAAJ";
const PROFILE_URL = "https://scholar.google.com/citations?user=" + encodeURIComponent(SCHOLAR_USER_ID) + "&hl=en";
const ALLOW_STALE = process.env.ALLOW_STALE === "true";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchProfile() {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(PROFILE_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; emnikolados.dev citation tracker; +https://emnikolados.dev/)",
          "Accept-Language": "en-GB,en;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error("Google Scholar returned HTTP " + response.status + ".");
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await delay(attempt * 2000);
      }
    }
  }

  throw lastError;
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
