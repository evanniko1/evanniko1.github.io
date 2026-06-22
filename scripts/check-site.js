#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "main.css"), "utf8");
const editorHtml = fs.readFileSync(path.join(ROOT, "editor.html"), "utf8");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "site.json"), "utf8"));
const citations = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "citations.json"), "utf8"));

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
  "editor.html",
  "editor.css",
  "scripts/content-editor.js",
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
assert(editorHtml.includes('<meta name="robots" content="noindex,nofollow" />'), "Editor must be excluded from search indexing.");
assert(editorHtml.includes('scripts/content-editor.js'), "Editor script is not linked.");
assert(editorHtml.includes('id="skills-list"'), "Skills editor is missing.");
assert(editorHtml.includes('id="projects-list"'), "Projects editor is missing.");
assert(editorHtml.includes('id="publications-list"'), "Publications editor is missing.");

const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
assert(jsonLdMatch, "Structured data block is missing.");
JSON.parse(jsonLdMatch[1]);

console.log("Site checks passed.");
