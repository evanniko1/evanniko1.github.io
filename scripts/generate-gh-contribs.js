#!/usr/bin/env node
/**
 * Generate GitHub contributions calendar SVGs (light & dark)
 * - Adds month labels & weekday hints
 * - Improved light/dark palettes with better low-activity contrast
 * - Subtle background tint + rounded corners
 * - Caption (bottom-right)
 * - <title> on each day cell for tooltips
 *
 * Env:
 *   GH_TOKEN  (required) GitHub token with public read
 *   LOGIN     (required) GitHub username (e.g., "evanniko1")
 *   OUT_DIR   (optional) output dir, default: "images"
 */

const fs = require("fs");
const path = require("path");

const GH_TOKEN = process.env.GH_TOKEN;
const LOGIN = process.env.LOGIN;
const OUT_DIR = process.env.OUT_DIR || "images";

if (!GH_TOKEN || !LOGIN) {
  console.error("Missing GH_TOKEN or LOGIN in env.");
  process.exit(1);
}

const API = "https://api.github.com/graphql";
const WIDTH_WEEKS = 53; // GitHub returns up to 53 columns
const CELL = 12;        // cell size
const GAP = 2;          // gap between cells
const PAD_LEFT = 28;    // room for weekday labels
const PAD_TOP = 24;     // room for month labels
const PAD_RIGHT = 14;
const PAD_BOTTOM = 28;  // room for caption
const RADIUS = 3;

const THEMES = {
  light: {
    name: "light",
    bg: "#F7FAF9",
    card: "#FFFFFF",
    cardBorder: "#E5EFEA",
    text: "#1F2D2A",
    textMuted: "#4C615D",
    // more neutral “0” bucket for definition
    levels: ["#DCE7E5", "#A9DDD4", "#6FC8BE", "#35B1A1", "#00897B"],
    accent: "#0EA293",
    gridDot: "rgba(0,0,0,0.08)",
  },
  dark: {
    name: "dark",
    bg: "#0D1117",
    card: "#0B1514",
    cardBorder: "#16302C",
    text: "#E6F2EF",
    textMuted: "#9FB6B1",
    levels: ["#19332F", "#0D5D54", "#0E8B7E", "#21B7A8", "#4FE2D2"],
    accent: "#21B7A8",
    gridDot: "rgba(255,255,255,0.08)",
  },
};

// GraphQL pulls last 52 weeks of contributions (plus partial current)
const GQL = `
query($login:String!){
  user(login:$login){
    contributionsCollection{
      contributionCalendar{
        totalContributions
        weeks{
          firstDay
          contributionDays{
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

async function ghQuery(query, variables) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "gh-contribs-svg"
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error("GraphQL errors: " + JSON.stringify(json.errors));
  }
  return json.data;
}

function monthShortName(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("en", { month: "short" });
}
function weekdayLetter(rowIdx) {
  // labels for Mon/Wed/Fri rows (0..6 with 0=Sun)
  const map = { 1: "M", 3: "W", 5: "F" };
  return map[rowIdx] || "";
}

function bucket(count) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function svgRect(x, y, w, h, rx, fill, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
}

function svgText(txt, x, y, fill, size = 10, extra = "") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial" font-size="${size}" ${extra}>${txt}</text>`;
}

function drawCalendarSVG(data, theme) {
  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const total = data.user.contributionsCollection.contributionCalendar.totalContributions;

  const cols = Math.min(weeks.length, WIDTH_WEEKS);
  const rows = 7;

  const width = PAD_LEFT + cols * (CELL + GAP) - GAP + PAD_RIGHT;
  const height = PAD_TOP + rows * (CELL + GAP) - GAP + PAD_BOTTOM;

  const monthLabels = [];
  let prevMonth = "";
  for (let c = 0; c < cols; c++) {
    const firstDay = weeks[c].firstDay;
    const m = monthShortName(firstDay);
    if (m !== prevMonth) {
      monthLabels.push({ col: c, text: m });
      prevMonth = m;
    }
  }

  // Background + card
  let parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contributions calendar for ${LOGIN}">`,
    // outer bg (helps in dark embeds)
    svgRect(0, 0, width, height, 10, theme.bg),
    // card
    svgRect(0.5, 0.5, width - 1, height - 1, 10, theme.card, `stroke="${theme.cardBorder}" stroke-width="1"`),
  );

  // Accent bar (thin) on top for continuity with site
  parts.push(svgRect(0, 0, width, 4, 10, theme.accent));

  // Month labels
  monthLabels.forEach(({ col, text }) => {
    const x = PAD_LEFT + col * (CELL + GAP);
    const y = PAD_TOP - 8;
    parts.push(svgText(text, x, y, theme.textMuted, 10, 'text-rendering="geometricPrecision"'));
  });

  // Weekday labels (M W F)
  for (let r = 0; r < rows; r++) {
    const letter = weekdayLetter(r);
    if (!letter) continue;
    const x = 8;
    // vertical center of row cell
    const y = PAD_TOP + r * (CELL + GAP) + CELL - 2;
    parts.push(svgText(letter, x, y, theme.textMuted, 9, 'text-rendering="geometricPrecision"'));
  }

  // Grid cells
  for (let c = 0; c < cols; c++) {
    const week = weeks[c];
    for (let r = 0; r < rows; r++) {
      const day = week.contributionDays[r];
      if (!day) continue;
      const { date, contributionCount } = day;
      const b = bucket(contributionCount);
      const color = theme.levels[b];

      const x = PAD_LEFT + c * (CELL + GAP);
      const y = PAD_TOP + r * (CELL + GAP);

      const title = `${date}: ${contributionCount} contribution${contributionCount === 1 ? "" : "s"}`;
      parts.push(
        `<g>`,
        `<title>${title}</title>`,
        svgRect(x, y, CELL, CELL, RADIUS, color),
        `</g>`
      );
    }
  }

  // Caption (bottom-right)
  const caption = `@${LOGIN} — past year total: ${total}`;
  parts.push(
    svgText(caption, width - PAD_RIGHT - 8, height - 10, theme.textMuted, 10, 'text-anchor="end" opacity="0.75"')
  );

  parts.push(`</svg>`);
  return parts.join("\n");
}

async function main() {
  const data = await ghQuery(GQL, { login: LOGIN });

  // basic sanity checks
  const weeks = data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks || !Array.isArray(weeks) || weeks.length < 4) {
    throw new Error("Unexpected contributions data shape from GitHub API.");
  }

  // Ensure out dir exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Generate light & dark
  const lightSvg = drawCalendarSVG(data, THEMES.light);
  const darkSvg = drawCalendarSVG(data, THEMES.dark);

  const lightPath = path.join(OUT_DIR, "github-activity-light.svg");
  const darkPath = path.join(OUT_DIR, "github-activity-dark.svg");

  fs.writeFileSync(lightPath, lightSvg, "utf8");
  fs.writeFileSync(darkPath, darkSvg, "utf8");

  console.log(`Wrote: ${lightPath}, ${darkPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
