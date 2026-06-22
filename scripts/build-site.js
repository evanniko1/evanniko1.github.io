#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_PATH = path.join(ROOT, "index.html");
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

function renderSkills(skills) {
  return requireArray(skills, "skills")
    .map((skill) => {
      requireArray(skill.items, "skills." + skill.title + ".items");
      return [
        '        <article class="skill-card">',
        "          <h4>" + escapeHtml(skill.title) + "</h4>",
        "          <p>" + skill.items.map(escapeHtml).join(" · ") + "</p>",
        "        </article>",
      ].join("\n");
    })
    .join("\n");
}

function renderProjects(projects) {
  return requireArray(projects, "projects")
    .map((project) =>
      [
        '        <article class="project-card">',
        "          <h4>" + escapeHtml(project.title) + "</h4>",
        "          <p>" + escapeHtml(project.description) + "</p>",
        "        </article>",
      ].join("\n")
    )
    .join("\n");
}

function renderPublications(publications) {
  return requireArray(publications, "publications")
    .map((publication) => {
      const year = Number(publication.year);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        throw new Error('Invalid publication year for "' + publication.title + '".');
      }

      const titlePunctuation = /[?!]$/.test(publication.title) ? "" : ".";
      return [
        '      <article class="pub-card compact">',
        "        <p><strong>" + escapeHtml(publication.authors) + "</strong> (" + year + '). <em><a href="' + escapeHtml(publication.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(publication.title) + "</a>" + titlePunctuation + "</em> " + escapeHtml(publication.venuePrefix || "") + "<b>" + escapeHtml(publication.venue) + "</b>" + escapeHtml(publication.details || ".") + "</p>",
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

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function renderCitations(citations) {
  const total = Number(citations.totalCitations);
  if (!Number.isInteger(total) || total < 0) {
    throw new Error("citations.totalCitations must be a non-negative integer.");
  }

  const updated = formatDate(citations.updatedAt);
  const formattedTotal = total.toLocaleString("en-GB");
  return [
    '        <a class="scholar-metric"',
    '           href="' + escapeHtml(citations.profileUrl) + '"',
    '           target="_blank" rel="noopener noreferrer"',
    '           aria-label="' + formattedTotal + " total Google Scholar citations, updated " + updated + '">',
    '          <span class="scholar-metric__count">' + formattedTotal + "</span>",
    '          <span class="scholar-metric__label">',
    "            Total citations",
    "            <small>Google Scholar · Updated " + updated + "</small>",
    "          </span>",
    "        </a>",
  ].join("\n");
}

function main() {
  const site = readJson(SITE_DATA_PATH);
  const citations = readJson(CITATIONS_PATH);
  let html = fs.readFileSync(INDEX_PATH, "utf8").replaceAll("\r\n", "\n");

  html = replaceGeneratedBlock(html, "SKILLS", renderSkills(site.skills));
  html = replaceGeneratedBlock(html, "PROJECTS", renderProjects(site.projects));
  html = replaceGeneratedBlock(html, "PUBLICATIONS", renderPublications(site.publications));
  html = replaceGeneratedBlock(html, "CITATIONS", renderCitations(citations));

  if (!html.endsWith("\n")) {
    html += "\n";
  }

  const previous = fs.readFileSync(INDEX_PATH, "utf8").replaceAll("\r\n", "\n");
  if (html !== previous) {
    fs.writeFileSync(INDEX_PATH, html, "utf8");
    console.log("Updated index.html from content data.");
  } else {
    console.log("index.html is already in sync.");
  }
}

main();
