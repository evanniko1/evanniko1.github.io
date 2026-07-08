#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "index.html");
const PUBS_PATH = path.join(ROOT, "publications", "index.html");
const CV_PATH = path.join(ROOT, "cv", "index.html");
const SITE_DATA_PATH = path.join(ROOT, "content", "site.json");
const CITATIONS_PATH = path.join(ROOT, "content", "citations.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireArray(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(field + " must be a non-empty array.");
  }
  return value;
}

function replaceGeneratedBlock(html, name, renderedContent) {
  const start = "<!-- CONTENT:" + name + ":START -->";
  const end = "<!-- CONTENT:" + name + ":END -->";
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Missing or invalid " + name + " content markers in index.html.");
  }
  const contentStart = startIndex + start.length;
  return html.slice(0, contentStart) + "\n" + renderedContent + "\n        " + html.slice(endIndex);
}

/* ---------- SKILLS (dense label + items) ---------- */
function renderSkills(skills) {
  return requireArray(skills, "skills")
    .map((skill) => {
      requireArray(skill.items, "skills." + skill.title + ".items");
      return [
        '        <div class="skill">',
        '          <span class="skill-label">' + escapeHtml(skill.title) + "</span>",
        '          <span class="skill-items">' + skill.items.map(escapeHtml).join(" · ") + "</span>",
        "        </div>",
      ].join("\n");
    })
    .join("\n");
}

/* ---------- PROJECTS (title + tag + link + desc) ---------- */
function renderProjects(projects) {
  return requireArray(projects, "projects")
    .map((p) => {
      const tag = p.tag ? ' <span class="tag">' + escapeHtml(p.tag) + "</span>" : "";
      const link = p.url
        ? '<a class="work-link" href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a>"
        : "";
      return [
        '        <article class="work-item">',
        '          <div class="work-head">',
        '            <span class="work-title">' + escapeHtml(p.title) + tag + "</span>",
        "            " + link,
        "          </div>",
        '          <p class="work-desc">' + escapeHtml(p.description) + "</p>",
        "        </article>",
      ].join("\n");
    })
    .join("\n");
}

/* ---------- NEWS (date + text, optional link) ---------- */
function renderNews(news) {
  return requireArray(news, "news")
    .map((n) => {
      const text = escapeHtml(n.text);
      const body = n.href
        ? '<a class="ext" href="' + escapeHtml(n.href) + '" target="_blank" rel="noopener noreferrer">' + text + "</a>"
        : text;
      return [
        '        <div class="news-item">',
        '          <span class="news-date">' + escapeHtml(n.date) + "</span>",
        '          <span class="news-text">' + body + "</span>",
        "        </div>",
      ].join("\n");
    })
    .join("\n");
}

/* ---------- PUBLICATIONS (dense typographic) ---------- */
function renderPublications(publications) {
  return requireArray(publications, "publications")
    .map((pub) => {
      const year = Number(pub.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new Error('Invalid publication year for "' + pub.title + '".');
      }
      const venue = escapeHtml(pub.venuePrefix || "") +
        "<b>" + escapeHtml(pub.venue) + "</b>" + escapeHtml(pub.details || ".");
      return [
        '      <article class="pub">',
        '        <div class="pub-head">',
        '          <a class="pub-title ext" href="' + escapeHtml(pub.url) +
          '" target="_blank" rel="noopener noreferrer">' + escapeHtml(pub.title) + "</a>",
        '          <span class="pub-year">' + year + "</span>",
        "        </div>",
        '        <div class="pub-authors">' + escapeHtml(pub.authors) + "</div>",
        '        <div class="pub-venue">' + venue + "</div>",
        "      </article>",
      ].join("\n");
    })
    .join("\n");
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) {
    throw new Error("citations.updatedAt must use YYYY-MM-DD format.");
  }
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

/* ---------- CITATIONS (compact metric) ---------- */
function renderCitations(citations) {
  const total = Number(citations.totalCitations);
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("citations.totalCitations must be a non-negative integer.");
  }
  const updated = formatDate(citations.updatedAt);
  const formattedTotal = total.toLocaleString("en-GB");
  return [
    '        <a class="metric" href="' + escapeHtml(citations.profileUrl) + '"',
    '           target="_blank" rel="noopener noreferrer"',
    '           aria-label="' + formattedTotal + " total Google Scholar citations, updated " + updated + '">',
    "          <b>" + formattedTotal + "</b> citations · Google Scholar<br>updated " + updated,
    "        </a>",
  ].join("\n");
}

function writeIfChanged(filePath, label, transform) {
  const previous = fs.readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");
  let html = transform(previous);
  if (!html.endsWith("\n")) html += "\n";
  if (html !== previous) {
    fs.writeFileSync(filePath, html, "utf8");
    console.log("Updated " + label + " from content data.");
  } else {
    console.log(label + " is already in sync.");
  }
}

function main() {
  const site = readJson(SITE_DATA_PATH);

  writeIfChanged(INDEX_PATH, "index.html", (html) => {
    html = replaceGeneratedBlock(html, "PROJECTS", renderProjects(site.projects));
    html = replaceGeneratedBlock(html, "NEWS", renderNews(site.news));
    return html;
  });

  writeIfChanged(PUBS_PATH, "publications/index.html", (html) =>
    replaceGeneratedBlock(html, "PUBLICATIONS", renderPublications(site.publications))
  );

  writeIfChanged(CV_PATH, "cv/index.html", (html) =>
    replaceGeneratedBlock(html, "SKILLS", renderSkills(site.skills))
  );
}

main();
