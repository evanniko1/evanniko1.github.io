#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "main.css"), "utf8");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "site.json"), "utf8"));
const citations = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "citations.json"), "utf8"));
const activityLight = fs.readFileSync(path.join(ROOT, "images", "github-activity-light.svg"), "utf8");
const activityDark = fs.readFileSync(path.join(ROOT, "images", "github-activity-dark.svg"), "utf8");
const activityGenerator = fs.readFileSync(path.join(ROOT, "scripts", "generate-gh-contribs.js"), "utf8");

for (const file of [
  "images/favicon.ico",
  "images/favicon-16x16.png",
  "images/favicon-32x32.png",
  "images/google-scholar.svg",
  "images/github.svg",
  "images/linkedin.svg",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
  "thankyou.html",
  "editor.css",
  "scripts/content-editor.js",
  "scripts/content-editor-page.js",
  "scripts/content-editor-server.js",
]) {
  assert(fs.existsSync(path.join(ROOT, file)), "Missing required file: " + file);
}

for (const marker of ["SKILLS", "PROJECTS", "PUBLICATIONS", "CITATIONS"]) {
  assert(html.includes("<!-- CONTENT:" + marker + ":START -->"), "Missing " + marker + " start marker.");
  assert(html.includes("<!-- CONTENT:" + marker + ":END -->"), "Missing " + marker + " end marker.");
}

assert(!html.includes("images/gscholar.png"), "The raster Google Scholar icon is still referenced.");
assert(!html.includes("favicon-32.png"), "The old broken favicon path is still present.");
assert(html.includes("dataset.theme = theme"), "Early theme initialization is missing.");
assert(css.includes("google-scholar.svg"), "The vector Google Scholar icon is not wired in CSS.");
assert(html.includes(citations.totalCitations.toLocaleString("en-GB")), "Citation count is not rendered.");
assert(html.includes(site.skills[site.skills.length - 1].items[0]), "LLM skills are not rendered.");
assert(html.includes(site.projects[0].title), "Projects are not rendered.");
assert(html.includes(site.publications[0].title), "Publications are not rendered.");
assert(html.includes('<div class="profile-links">'), "Profile icons and citation metric are not grouped.");
const activityCssRule = css.match(/\.github-activity-image\s*\{([^}]*)\}/);
assert(activityCssRule && !activityCssRule[1].includes("border-top:"), "GitHub activity container still has a highlighted top border.");
assert(!activityLight.includes('height="4" rx="10"'), "Light GitHub activity SVG still has an accent bar.");
assert(!activityDark.includes('height="4" rx="10"'), "Dark GitHub activity SVG still has an accent bar.");
assert(!activityGenerator.includes("width, 4, 10, theme.accent"), "GitHub activity generator still creates an accent bar.");
assert(!fs.existsSync(path.join(ROOT, "editor.html")), "The private editor must not be deployed as a public page.");
const editorServer = fs.readFileSync(path.join(ROOT, "scripts", "content-editor-server.js"), "utf8");
const editorPage = fs.readFileSync(path.join(ROOT, "scripts", "content-editor-page.js"), "utf8");
assert(editorServer.includes('const HOST = "127.0.0.1";'), "Editor server must bind to loopback.");
assert(editorServer.includes('crypto.randomBytes(32)'), "Editor server must use an unguessable session path.");
assert(editorServer.includes('git", ["push", "origin", "main"]'), "Editor publishing must push main.");
assert(editorPage.includes('id="skills-list"'), "Skills editor is missing.");
assert(editorPage.includes('id="projects-list"'), "Projects editor is missing.");
assert(editorPage.includes('id="publications-list"'), "Publications editor is missing.");
assert(editorPage.includes('id="publish-content"'), "Publish control is missing.");

const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
assert(jsonLdMatch, "Structured data block is missing.");
JSON.parse(jsonLdMatch[1]);

console.log("Site checks passed.");
