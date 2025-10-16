#!/usr/bin/env node
/**
 * Generate GitHub contributions calendar SVGs using the GraphQL API.
 * Outputs a light and a dark variant with a teal-forward palette that matches the site.
 *
 * Usage:
 *   node scripts/generate-gh-contribs.js \
 *     --login evanniko1 \
 *     --out images \
 *     --light github-activity-light.svg \
 *     --dark github-activity-dark.svg \
 *     --title "GitHub contributions calendar for Evangelos Nikolados"
 */

const fs = require("fs");
const path = require("path");

// -------- CLI args --------
const args = require("node:process").argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}

const LOGIN  = getArg("--login",  process.env.LOGIN  || "evanniko1");
const OUTDIR = getArg("--out",    process.env.OUT_DIR || "images");
const LIGHT  = getArg("--light",  process.env.LIGHT_NAME || "github-activity-light.svg");
const DARK   = getArg("--dark",   process.env.DARK_NAME  || "github-activity-dark.svg");
const TITLE  = getArg("--title",  process.env.TITLE || `GitHub contributions calendar for ${LOGIN}`);

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set. This script must run in GitHub Actions or with a token.");
  process.exit(1);
}

// -------- GraphQL query --------
const GQL = `
  query($login: String!) {
    user(login: $login) {
      name
      contributionsCollection {
        contributionCalendar {
          totalContributions
          colors
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

// -------- Fetch contributions --------
async function fetchCalendar(login) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `bearer ${TOKEN}`
    },
    body: JSON.stringify({ query: GQL, variables: { login } })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}\n${txt}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("GraphQL errors: " + JSON.stringify(json.errors, null, 2));
  }
  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("No contributionCalendar in response.");
  return cal;
}

// -------- Palette & theming --------
// A clean teal palette (light) and high-contrast variant (dark).
// Index 0 = no contributions, 1..4 increasing intensity.
const paletteLight = [
  "#E7F6F3", // 0
  "#BDE7E0", // 1
  "#8FD3CB", // 2
  "#5EBDB2", // 3
  "#2AA198"  // 4
];

// Dark background-friendly palette.
const paletteDark = [
  "#0e1e1d", // 0
  "#1b3c3a", // 1
  "#245350", // 2
  "#2e6d68", // 3
  "#29a593"  // 4 (brightest)
];

// -------- Bucketing strategy --------
// Convert counts -> bucket 0..4 using quantiles so it adapts to activity levels.
function makeBucketFn(weeks) {
  const counts = [];
  for (const w of weeks) for (const d of w.contributionDays) counts.push(d.contributionCount);
  const nonzero = counts.filter(c => c > 0).sort((a,b) => a - b);

  // If no contributions, everything is level 0.
  if (nonzero.length === 0) {
    return c => 0;
  }

  function quantile(arr, q) {
    if (arr.length === 0) return 0;
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    } else {
      return arr[base];
    }
  }

  const q25 = Math.max(1, Math.round(quantile(nonzero, 0.25)));
  const q50 = Math.max(1, Math.round(quantile(nonzero, 0.50)));
  const q75 = Math.max(1, Math.round(quantile(nonzero, 0.75)));

  return (c) => {
    if (c <= 0) return 0;
    if (c <= q25) return 1;
    if (c <= q50) return 2;
    if (c <= q75) return 3;
    return 4;
  };
}

// -------- SVG rendering --------
function renderSVG(calendar, { title, palette, theme = "light" }) {
  const weeks = calendar.weeks;

  // Layout constants (close to GitHub’s)
  const cell = 11;       // grid step (square + gap)
  const size = 10;       // square size
  const margin = { top: 20, left: 20, right: 20, bottom: 24 };

  const W = margin.left + weeks.length * cell + margin.right;
  const H = margin.top  + 7 * cell         + margin.bottom;

  const bg = theme === "dark" ? "#0E1116" : "#ffffff";
  const text = theme === "dark" ? "#d1d5db" : "#111827";
  const stroke = theme === "dark" ? "#1f2937" : "#e5e7eb";

  const bucketOf = makeBucketFn(weeks);

  // Build rects
  let rects = "";
  for (let xi = 0; xi < weeks.length; xi++) {
    const w = weeks[xi];
    for (let yi = 0; yi < 7; yi++) {
      const day = w.contributionDays[yi];
      if (!day) continue;
      const bucket = bucketOf(day.contributionCount);
      const fill = palette[bucket];
      const x = margin.left + xi * cell;
      const y = margin.top  + yi * cell;
      const tooltip = `${day.date}: ${day.contributionCount} contributions`;
      rects += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" ry="2" fill="${fill}" stroke="${stroke}" stroke-width="0.5">` +
               `<title>${tooltip}</title></rect>\n`;
    }
  }

  // Optional caption
  const captionY = H - 6;
  const total = calendar.totalContributions.toLocaleString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${title}</title>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
  ${rects}
  <text x="${margin.left}" y="${captionY}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'}" font-size="10" fill="${text}">
    Past-year total: ${total}
  </text>
</svg>`;
}

// -------- Main --------
(async () => {
  try {
    const cal = await fetchCalendar(LOGIN);
    fs.mkdirSync(OUTDIR, { recursive: true });

    const lightSVG = renderSVG(cal, {
      title: TITLE,
      palette: paletteLight,
      theme: "light"
    });
    const darkSVG = renderSVG(cal, {
      title: TITLE,
      palette: paletteDark,
      theme: "dark"
    });

    fs.writeFileSync(path.join(OUTDIR, LIGHT), lightSVG, "utf8");
    fs.writeFileSync(path.join(OUTDIR, DARK),  darkSVG,  "utf8");

    console.log(`Wrote ${path.join(OUTDIR, LIGHT)} and ${path.join(OUTDIR, DARK)}`);
  } catch (err) {
    console.error("Failed to generate calendar:", err);
    process.exit(1);
  }
})();
