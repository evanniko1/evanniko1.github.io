"use strict";

module.exports = function renderEditorPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Private content editor | Evangelos-Marios Nikolados</title>
  <meta id="theme-color" name="theme-color" content="#fafafa" />
  <link rel="icon" href="favicon.ico" sizes="any" />
  <script>
    (() => {
      let theme = "light";
      try {
        const storedTheme = localStorage.getItem("theme");
        theme = storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      } catch (_) {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.dataset.theme = theme;
    })();
  </script>
  <link rel="stylesheet" href="main.css" />
  <link rel="stylesheet" href="editor.css" />
</head>
<body class="editor-page">
  <main class="editor-shell">
    <header class="editor-header">
      <nav class="editor-nav" aria-label="Editor navigation">
        <a href="https://emnikolados.dev/" target="_blank" rel="noopener">View live portfolio</a>
        <button id="theme-toggle" type="button" aria-label="Toggle dark mode" aria-pressed="false">Dark mode</button>
      </nav>
      <h1>Private content editor</h1>
      <p>This editor is running only on your computer. It uses your local Git credentials when you publish.</p>
    </header>

    <section class="editor-guide" aria-labelledby="editor-guide-title">
      <div>
        <h2 id="editor-guide-title">How publishing works</h2>
        <p>Edit the repository's <strong>content/site.json</strong> through the fields below, then publish when it is ready.</p>
      </div>
      <ol>
        <li>Edit and validate the content.</li>
        <li>Select <strong>Publish website</strong>.</li>
        <li>The editor builds, commits, and pushes the update. GitHub Actions then republishes the site.</li>
      </ol>
    </section>

    <div class="editor-toolbar" aria-label="Content source controls">
      <button id="load-published" class="editor-button editor-button--secondary" type="button">Reload repository content</button>
      <span id="source-label" class="editor-source">Loading repository content...</span>
    </div>

    <form id="content-form" novalidate>
      <section class="editor-section" aria-labelledby="skills-heading">
        <div class="editor-section__heading">
          <div>
            <h2 id="skills-heading">Skills and models</h2>
            <p>Enter one skill or model per line.</p>
          </div>
          <button class="editor-button editor-button--secondary" type="button" data-add="skill">Add skill group</button>
        </div>
        <div id="skills-list" class="editor-list"></div>
      </section>

      <section class="editor-section" aria-labelledby="projects-heading">
        <div class="editor-section__heading">
          <div>
            <h2 id="projects-heading">Selected projects</h2>
            <p>Each project needs a title and short description.</p>
          </div>
          <button class="editor-button editor-button--secondary" type="button" data-add="project">Add project</button>
        </div>
        <div id="projects-list" class="editor-list"></div>
      </section>

      <section class="editor-section" aria-labelledby="publications-heading">
        <div class="editor-section__heading">
          <div>
            <h2 id="publications-heading">Selected publications</h2>
            <p>Publication fields are converted into the existing citation layout.</p>
          </div>
          <button class="editor-button editor-button--secondary" type="button" data-add="publication">Add publication</button>
        </div>
        <div id="publications-list" class="editor-list"></div>
      </section>
    </form>

    <div class="editor-actions">
      <p id="editor-status" class="editor-status" role="status" aria-live="polite">Loading content...</p>
      <div class="editor-actions__buttons">
        <button id="validate-content" class="editor-button editor-button--secondary" type="button">Validate</button>
        <button id="copy-json" class="editor-button editor-button--secondary" type="button">Copy JSON</button>
        <button id="download-json" class="editor-button editor-button--secondary" type="button">Download backup</button>
        <button id="publish-content" class="editor-button" type="button">Publish website</button>
      </div>
    </div>
  </main>

  <script src="theme.js"></script>
  <script src="content-editor.js"></script>
</body>
</html>`;
};
