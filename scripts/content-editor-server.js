#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");
const renderEditorPage = require("./content-editor-page");

const ROOT = path.resolve(__dirname, "..");
const HOST = "127.0.0.1";
const PORT = Number(process.env.CONTENT_EDITOR_PORT || 4174);
const TOKEN = crypto.randomBytes(32).toString("hex");
const PREFIX = "/" + TOKEN;
const CONTENT_PATH = path.join(ROOT, "content", "site.json");
const INDEX_PATH = path.join(ROOT, "index.html");
const MAX_BODY_BYTES = 1024 * 1024;
let publishing = false;

const assets = new Map([
  ["/main.css", { path: path.join(ROOT, "main.css"), type: "text/css; charset=utf-8" }],
  ["/editor.css", { path: path.join(ROOT, "editor.css"), type: "text/css; charset=utf-8" }],
  ["/theme.js", { path: path.join(ROOT, "scripts", "theme.js"), type: "text/javascript; charset=utf-8" }],
  ["/content-editor.js", { path: path.join(ROOT, "scripts", "content-editor.js"), type: "text/javascript; charset=utf-8" }],
  ["/favicon.ico", { path: path.join(ROOT, "images", "favicon.ico"), type: "image/x-icon" }],
]);

function securityHeaders(contentType) {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "Content-Type": contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function send(res, status, body, contentType) {
  res.writeHead(status, securityHeaders(contentType || "text/plain; charset=utf-8"));
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), "application/json; charset=utf-8");
}

function revisionFor(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readContent() {
  const text = fs.readFileSync(CONTENT_PATH, "utf8");
  return {
    text,
    content: JSON.parse(text),
    revision: revisionFor(text),
  };
}

function validateString(value, label, optional) {
  if (optional && (value === undefined || value === "")) {
    return;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(label + " must be a non-empty string.");
  }
  if (value.length > 10000) {
    throw new Error(label + " is too long.");
  }
}

function validateContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Content must be a JSON object.");
  }

  for (const section of ["skills", "projects", "publications"]) {
    if (!Array.isArray(content[section]) || content[section].length === 0) {
      throw new Error(section + " must contain at least one entry.");
    }
    if (content[section].length > 200) {
      throw new Error(section + " contains too many entries.");
    }
  }

  content.skills.forEach((entry, index) => {
    validateString(entry.title, "Skill group " + (index + 1) + " title");
    if (!Array.isArray(entry.items) || entry.items.length === 0) {
      throw new Error("Skill group " + (index + 1) + " must contain at least one item.");
    }
    entry.items.forEach((item, itemIndex) => {
      validateString(item, "Skill group " + (index + 1) + " item " + (itemIndex + 1));
    });
  });

  content.projects.forEach((entry, index) => {
    validateString(entry.title, "Project " + (index + 1) + " title");
    validateString(entry.description, "Project " + (index + 1) + " description");
  });

  content.publications.forEach((entry, index) => {
    const label = "Publication " + (index + 1);
    validateString(entry.authors, label + " authors");
    validateString(entry.title, label + " title");
    validateString(entry.url, label + " URL");
    validateString(entry.venue, label + " venue");
    validateString(entry.venuePrefix, label + " venue prefix", true);
    validateString(entry.details, label + " details");
    if (!Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2100) {
      throw new Error(label + " year must be between 1900 and 2100.");
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(entry.url);
    } catch (_) {
      throw new Error(label + " URL is invalid.");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(label + " URL must use HTTP or HTTPS.");
    }
  });
}

function currentBranch() {
  const head = fs.readFileSync(path.join(ROOT, ".git", "HEAD"), "utf8").trim();
  const prefix = "ref: refs/heads/";
  return head.startsWith(prefix) ? head.slice(prefix.length) : "detached HEAD";
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(command + " " + args.join(" ") + " failed" + (detail ? ": " + detail : "."));
  }
  return (result.stdout || "").trim();
}

function runChecks() {
  run(process.execPath, ["scripts/build-site.js"]);
  run(process.execPath, ["scripts/check-site.js"]);
  run(process.execPath, ["--check", "scripts/content-editor.js"]);
  run(process.execPath, ["--check", "scripts/content-editor-page.js"]);
  run(process.execPath, ["--check", "scripts/content-editor-server.js"]);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function publish(req, res) {
  if (publishing) {
    sendJson(res, 409, { error: "A publish is already running." });
    return;
  }

  publishing = true;
  let contentBackup = null;
  let indexBackup = null;
  let filesWritten = false;

  try {
    const branch = currentBranch();
    if (branch !== "main") {
      throw new Error("Publishing is allowed only from the main branch. Current branch: " + (branch || "detached HEAD"));
    }

    const payload = JSON.parse(await readRequestBody(req));
    validateContent(payload.content);

    const current = readContent();
    if (payload.revision !== current.revision) {
      sendJson(res, 409, { error: "content/site.json changed after this page was loaded. Reload before publishing." });
      return;
    }

    contentBackup = current.text;
    indexBackup = fs.readFileSync(INDEX_PATH, "utf8");
    const nextText = JSON.stringify(payload.content, null, 2) + "\n";
    fs.writeFileSync(CONTENT_PATH, nextText, "utf8");
    filesWritten = true;

    try {
      runChecks();
    } catch (error) {
      fs.writeFileSync(CONTENT_PATH, contentBackup, "utf8");
      fs.writeFileSync(INDEX_PATH, indexBackup, "utf8");
      filesWritten = false;
      throw new Error("Validation failed; no files were changed. " + error.message);
    }

    const changed = spawnSync("git", ["diff", "--quiet", "--", "content/site.json", "index.html"], {
      cwd: ROOT,
      windowsHide: true,
    }).status !== 0;

    let commit = run("git", ["rev-parse", "--short", "HEAD"]);
    if (changed) {
      run("git", ["add", "--", "content/site.json", "index.html"]);
      run("git", ["commit", "--only", "-m", "content: update portfolio", "--", "content/site.json", "index.html"]);
      commit = run("git", ["rev-parse", "--short", "HEAD"]);
    }

    try {
      run("git", ["push", "origin", "main"]);
    } catch (error) {
      throw new Error("The update was committed locally as " + commit + ", but GitHub rejected the push. " + error.message);
    }

    const saved = readContent();
    sendJson(res, 200, {
      message: changed
        ? "Published commit " + commit + ". GitHub Pages will update after the workflow finishes."
        : "No content changes were needed. Existing local commits were pushed.",
      revision: saved.revision,
    });
  } catch (error) {
    if (filesWritten && contentBackup !== null && !fs.existsSync(path.join(ROOT, ".git", "MERGE_HEAD"))) {
      // Keep successfully validated content and any local commit so a failed push can be retried.
    }
    sendJson(res, 500, { error: error.message });
  } finally {
    publishing = false;
  }
}

const server = http.createServer(async (req, res) => {
  const expectedHost = HOST + ":" + server.address().port;
  if (req.headers.host !== expectedHost) {
    send(res, 403, "Forbidden");
    return;
  }

  const requestUrl = new URL(req.url, "http://" + expectedHost);
  if (!requestUrl.pathname.startsWith(PREFIX + "/") && requestUrl.pathname !== PREFIX) {
    send(res, 404, "Not found");
    return;
  }

  const route = requestUrl.pathname.slice(PREFIX.length) || "/";
  if (req.method === "GET" && route === "/") {
    send(res, 200, renderEditorPage(), "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && assets.has(route)) {
    const asset = assets.get(route);
    send(res, 200, fs.readFileSync(asset.path), asset.type);
    return;
  }

  if (req.method === "GET" && route === "/api/content") {
    try {
      const branch = currentBranch();
      const current = readContent();
      validateContent(current.content);
      sendJson(res, 200, { content: current.content, revision: current.revision, branch });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && route === "/api/publish") {
    if (req.headers.origin !== "http://" + expectedHost || req.headers["content-type"] !== "application/json") {
      sendJson(res, 403, { error: "Invalid publishing request." });
      return;
    }
    await publish(req, res);
    return;
  }

  send(res, 404, "Not found");
});

server.on("error", (error) => {
  console.error("Content editor could not start:", error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  const url = "http://" + HOST + ":" + server.address().port + PREFIX + "/";
  console.log("");
  console.log("Private content editor");
  console.log("----------------------");
  console.log(url);
  console.log("");
  console.log("This server accepts connections only from this computer.");
  console.log("Press Ctrl+C to stop it.");
});
