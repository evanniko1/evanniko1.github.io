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

async function fetchCitationCount() {
  const errors = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const profileUrl of PROFILE_URLS) {
      for (const headers of REQUEST_PROFILES) {
        try {
          const response = await fetch(profileUrl, { headers });

          if (!response.ok) {
            throw new Error(new URL(profileUrl).host + " returned HTTP " + response.status + ".");
          }

          const html = await response.text();
          const totalCitations = parseCitationCount(html);
          console.log("Scholar citation source: " + new URL(profileUrl).host);
          return totalCitations;
        } catch (error) {
          errors.push(new URL(profileUrl).host + ": " + error.message);
        }
      }
    }

    if (attempt < 3) {
      await delay(attempt * 2000);
    }
  }

  throw new Error("Scholar refresh failed after retries: " + errors.slice(-6).join(" | "));
}

function parseCitationCount(html) {
  const totalMatch = html.match(/<td[^>]*class="gsc_rsb_std"[^>]*>([0-9,]+)<\/td>/i);
  if (totalMatch) {
    return normalizeCount(totalMatch[1], "Scholar total citation count");
  }

  const articleCitationCounts = [...html.matchAll(/<a[^>]*class="gsc_a_ac[^"']*"[^>]*>([0-9,]+)<\/a>/gi)]
    .map((match) => normalizeCount(match[1], "article citation count"));
  if (articleCitationCounts.length > 0) {
    return articleCitationCounts.reduce((sum, count) => sum + count, 0);
  }

  throw new Error(describeUnparseableScholarHtml(html));
}

function normalizeCount(value, label) {
  const total = Number(String(value).replaceAll(",", ""));
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("Scholar returned an invalid " + label + ".");
  }
  return total;
}

function describeUnparseableScholarHtml(html) {
  const title = (html.match(/<title>(.*?)<\/title>/i) || [])[1];
  if (/recaptcha|captcha|unusual traffic|sorry\/index/i.test(html)) {
    return "Scholar returned an anti-bot or unusual-traffic page" + (title ? " titled " + JSON.stringify(title) : "") + ".";
  }
  if (/consent\.google|Before you continue|cookies/i.test(html)) {
    return "Scholar returned a consent page" + (title ? " titled " + JSON.stringify(title) : "") + ".";
  }
  return "Could not find citation counts in the Scholar profile" + (title ? " titled " + JSON.stringify(title) : "") + ".";
}

async function main() {
  try {
    const totalCitations = await fetchCitationCount();
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
