#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const pubHtml = fs.readFileSync(path.join(ROOT, "publications", "index.html"), "utf8");
const cvHtml = fs.readFileSync(path.join(ROOT, "cv", "index.html"), "utf8");
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
  "publications/index.html",
  "cv/index.html",
  "thankyou.html",
  "editor.css",
  "scripts/content-editor.js",
  "scripts/content-editor-page.js",
  "scripts/content-editor-server.js",
]) {
  assert(fs.existsSync(path.join(ROOT, file)), "Missing required file: " + file);
}

for (const marker of ["PROJECTS", "NEWS"]) {
  assert(html.includes("<!-- CONTENT:" + marker + ":START -->"), "Missing " + marker + " start marker.");
  assert(html.includes("<!-- CONTENT:" + marker + ":END -->"), "Missing " + marker + " end marker.");
}
assert(pubHtml.includes("<!-- CONTENT:PUBLICATIONS:START -->"), "Missing PUBLICATIONS start marker on publications page.");
assert(pubHtml.includes("<!-- CONTENT:PUBLICATIONS:END -->"), "Missing PUBLICATIONS end marker on publications page.");
assert(cvHtml.includes("<!-- CONTENT:SKILLS:START -->"), "Missing SKILLS start marker on CV page.");
assert(cvHtml.includes("<!-- CONTENT:SKILLS:END -->"), "Missing SKILLS end marker on CV page.");

assert(!html.includes("images/gscholar.png"), "The raster Google Scholar icon is still referenced.");
assert(!html.includes("favicon-32.png"), "The old broken favicon path is still present.");
assert(html.includes("dataset.theme = theme"), "Early theme initialization is missing.");
assert(cvHtml.includes(site.skills[site.skills.length - 1].items[0]), "Skills are not rendered on the CV page.");
assert(html.includes(site.projects[0].title), "Projects are not rendered.");
assert(html.includes(site.news[0].text), "News items are not rendered.");
assert(pubHtml.includes(site.publications[0].title), "Publications are not rendered on the publications page.");
assert(html.includes('class="sidebar"'), "Sidebar is missing.");
assert(html.includes('class="side-links"'), "Sidebar profile links are missing.");
assert(html.includes('class="about-photo"'), "About photo is missing.");
const activityCssRule = css.match(/\.gh-visual img\s*\{([^}]*)\}/);
assert(activityCssRule && !activityCssRule[1].includes("border-top:"), "GitHub activity container still has a highlighted top border.");
assert(!activityLight.includes('height="4" rx="10"'), "Light GitHub activity SVG still has an accent bar.");
assert(!activityDark.includes('height="4" rx="10"'), "Dark GitHub activity SVG still has an accent bar.");
assert(!activityGenerator.includes("width, 4, 10, theme.accent"), "GitHub activity generator still creates an accent bar.");
assert(!fs.existsSync(path.join(ROOT, "editor.html")), "The private editor must not be deployed as a public page.");
const editorServer = fs.readFileSync(path.join(ROOT, "scripts", "content-editor-server.js"), "utf8");
const editorPage = fs.readFileSync(path.join(ROOT, "scripts", "content-editor-page.js"), "utf8");
const scholarWorkflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "scholar-citations.yml"), "utf8");
const scholarUpdater = fs.readFileSync(path.join(ROOT, "scripts", "update-scholar-citations.js"), "utf8");
assert(scholarWorkflow.includes('SCHOLAR_CITATION_PROVIDER: "serpapi"'), "Scheduled Scholar workflow must use the SerpApi provider, not direct Scholar scraping.");
assert(scholarWorkflow.includes("SERPAPI_KEY: ${{ secrets.SERPAPI_KEY }}"), "Scheduled Scholar workflow must read SERPAPI_KEY from GitHub Actions secrets.");
assert(scholarUpdater.includes("SERPAPI_KEY is required"), "Scholar updater must fail clearly when the SerpApi key is missing.");
assert(editorServer.includes('const HOST = "127.0.0.1";'), "Editor server must bind to loopback.");
assert(editorServer.includes('crypto.randomBytes(32)'), "Editor server must use an unguessable session path.");
assert(editorServer.includes('git", ["fetch", "origin", "main"]'), "Editor publishing must fetch origin/main before pushing.");
assert(editorServer.includes('git", ["merge", "--ff-only", "origin/main"]'), "Editor publishing must fast-forward when local main is behind.");
assert(editorServer.includes('git", ["rebase", "origin/main"]'), "Editor publishing must rebase local commits when main diverges.");
assert(editorServer.includes('git", ["push", "origin", "main"]'), "Editor publishing must push main.");
assert(editorPage.includes('id="news-list"'), "News editor is missing.");
assert(editorPage.includes('id="skills-list"'), "Skills editor is missing.");
assert(editorPage.includes('id="projects-list"'), "Projects editor is missing.");
assert(editorPage.includes('id="publications-list"'), "Publications editor is missing.");
assert(editorPage.includes('id="publish-content"'), "Publish control is missing.");
assert(editorServer.includes("content.news.forEach"), "Editor publishing must validate news entries.");
assert(editorServer.includes('"publications/index.html"'), "Editor publishing must stage the rebuilt publications page.");
assert(editorServer.includes('"cv/index.html"'), "Editor publishing must stage the rebuilt CV page.");
const editorClient = fs.readFileSync(path.join(ROOT, "scripts", "content-editor.js"), "utf8");
assert(editorClient.includes('kind === "skill" ? "bottom" : "top"'), "New entries other than skills must be inserted at the top.");
assert(editorClient.includes('containers.news'), "News entries must be collected on publish.");

const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
assert(jsonLdMatch, "Structured data block is missing.");
JSON.parse(jsonLdMatch[1]);

console.log("Site checks passed.");
