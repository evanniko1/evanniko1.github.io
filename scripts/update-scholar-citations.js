#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "content", "citations.json");
const SCHOLAR_USER_ID = process.env.SCHOLAR_USER_ID || "H8fc2JgAAAAJ";
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const PROVIDER = process.env.SCHOLAR_CITATION_PROVIDER || (SERPAPI_KEY ? "serpapi" : "direct");
const ALLOW_STALE = process.env.ALLOW_STALE === "true";
const ALLOW_CITATION_DECREASE = process.env.ALLOW_CITATION_DECREASE === "true";
const PROFILE_URL = "https://scholar.google.com/citations?user=" + SCHOLAR_USER_ID;
const PROFILE_PATH = "/citations?user=" + encodeURIComponent(SCHOLAR_USER_ID) + "&hl=en";
const DIRECT_PROFILE_URLS = [
  "https://scholar.google.com" + PROFILE_PATH,
  "https://scholar.google.co.uk" + PROFILE_PATH,
];
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

function readPreviousCitations() {
  if (!fs.existsSync(OUTPUT_PATH)) {
    return null;
  }
  const citations = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  return Number.isInteger(citations.totalCitations) ? citations.totalCitations : null;
}

function normalizeCount(value, label) {
  const total = Number(String(value).replaceAll(",", ""));
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("Provider returned an invalid " + label + ".");
  }
  return total;
}

async function fetchJson(url, context) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "emnikolados.dev citation tracker (+https://emnikolados.dev/)",
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (_) {
    throw new Error(context + " returned non-JSON response with HTTP " + response.status + ".");
  }
  if (!response.ok) {
    throw new Error(context + " returned HTTP " + response.status + ": " + (payload.error || JSON.stringify(payload).slice(0, 200)));
  }
  return payload;
}

async function fetchSerpApiCitationCount() {
  if (!SERPAPI_KEY) {
    throw new Error("SERPAPI_KEY is required when SCHOLAR_CITATION_PROVIDER=serpapi. Add it as a GitHub Actions repository secret.");
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_scholar_author");
  url.searchParams.set("author_id", SCHOLAR_USER_ID);
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", SERPAPI_KEY);

  const payload = await fetchJson(url, "SerpApi Google Scholar Author API");
  return parseSerpApiCitationCount(payload);
}

function parseSerpApiCitationCount(payload) {
  if (payload.error) {
    throw new Error("SerpApi returned an error: " + payload.error);
  }
  if (payload.search_metadata && payload.search_metadata.status === "Error") {
    throw new Error("SerpApi search failed: " + (payload.search_metadata.error || "unknown error"));
  }

  const table = payload.cited_by && Array.isArray(payload.cited_by.table) ? payload.cited_by.table : [];
  const citationsRow = table.find((row) => row && row.citations && row.citations.all != null);
  if (citationsRow) {
    return {
      totalCitations: normalizeCount(citationsRow.citations.all, "SerpApi total citation count"),
      source: "serpapi:cited_by.table.citations.all",
    };
  }

  throw new Error("SerpApi response did not include cited_by.table[].citations.all.");
}

async function fetchDirectCitationCount() {
  const errors = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const profileUrl of DIRECT_PROFILE_URLS) {
      for (const headers of REQUEST_PROFILES) {
        try {
          const response = await fetch(profileUrl, { headers });

          if (!response.ok) {
            throw new Error(new URL(profileUrl).host + " returned HTTP " + response.status + ".");
          }

          const html = await response.text();
          return {
            totalCitations: parseDirectScholarCitationCount(html),
            source: "direct:" + new URL(profileUrl).host,
          };
        } catch (error) {
          errors.push(new URL(profileUrl).host + ": " + error.message);
        }
      }
    }

    if (attempt < 3) {
      await delay(attempt * 2000);
    }
  }

  throw new Error("Direct Scholar refresh failed after retries: " + errors.slice(-6).join(" | "));
}

function parseDirectScholarCitationCount(html) {
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

async function fetchCitationCount() {
  if (PROVIDER === "serpapi") {
    return fetchSerpApiCitationCount();
  }
  if (PROVIDER === "direct") {
    return fetchDirectCitationCount();
  }
  throw new Error("Unsupported SCHOLAR_CITATION_PROVIDER: " + PROVIDER + ". Use serpapi or direct.");
}

function validateAgainstPrevious(totalCitations) {
  const previous = readPreviousCitations();
  if (previous == null || ALLOW_CITATION_DECREASE || totalCitations >= previous) {
    return;
  }
  throw new Error("Citation count decreased from " + previous + " to " + totalCitations + ". Refusing to overwrite without ALLOW_CITATION_DECREASE=true.");
}

async function main() {
  try {
    const result = await fetchCitationCount();
    validateAgainstPrevious(result.totalCitations);
    const payload = {
      totalCitations: result.totalCitations,
      updatedAt: new Date().toISOString().slice(0, 10),
      profileUrl: PROFILE_URL,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log("Scholar citation provider: " + PROVIDER);
    console.log("Scholar citation source: " + result.source);
    console.log("Google Scholar total citations: " + result.totalCitations);
  } catch (error) {
    if (ALLOW_STALE && fs.existsSync(OUTPUT_PATH)) {
      console.warn("::warning title=Scholar citation refresh kept stale data::" + error.message);
      console.warn("Scholar refresh failed; keeping the last known count. " + error.message);
      return;
    }
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  parseDirectScholarCitationCount,
  parseSerpApiCitationCount,
  normalizeCount,
};
