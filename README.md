# emnikolados.dev

Static GitHub Pages site for Evangelos-Marios Nikolados — a two-column, typographic
personal site (serif headings + mono labels, teal accent, light/dark). No build framework;
content is data-driven and injected into `index.html` by a small Node script.

## Layout

Three pages share one sidebar (name, role, a three-item page nav **About · Publications · CV**,
profile links, **Download CV** button, light/dark toggle):

- **About** (`index.html`) — keyword tagline, bio + floated photo, then **GitHub activity**,
  **News**, **Selected work**, **Skills**, and **Contact** (email only).
- **Publications** (`publications/index.html`) — the full publication list.
- **CV** (`cv/index.html`) — an HTML CV (Experience, Education, Talks, Awards, Skills) with a
  **Download PDF** button linking `EvangelosMarios_Nikolados_CV.pdf` at the repo root.

Cross-page links are relative (`index.html`, `publications/index.html`, `cv/index.html`) so the
site works both locally (file://) and on GitHub Pages.

## Updating content

Edit **content/site.json**. It contains four arrays:

- **skills** — the Skills section (`title` + `items`).
- **projects** — Selected work. Each item: `title`, optional `tag` (e.g. "In development"),
  optional `url` (repo/link), and `description`.
- **news** — the News feed. Each item: `date`, `text`, and optional `href` (makes it a link).
- **publications** — the Publications list (`authors`, `year`, `title`, `url`, `venue`,
  `venuePrefix`, `details`).

The About/intro text and the keyword tagline are hardcoded in `index.html` (not data-driven).

After editing locally, run:

    npm run build
    npm test

Commit both **content/site.json** and the generated **index.html**. If the data file is edited
directly on GitHub, the content-build workflow rebuilds and commits `index.html` automatically.

Do not hand-edit the HTML between the CONTENT START/END comments: `scripts/build-site.js`
generates `SKILLS`, `PROJECTS`, and `NEWS` into `index.html`, and `PUBLICATIONS` into
`publications/index.html`, from the JSON.

## Private content editor

`npm run content:edit` runs a loopback-only editor with a fresh unguessable session URL. It
currently exposes fields for **skills, projects, and publications**; the **news** feed and the
new project `tag`/`url` fields are edited directly in `content/site.json` for now.

Stop the editor with **Ctrl+C**. There is no public `/editor.html` route and no password or
GitHub token is stored in frontend code.

## Google Scholar citations

The on-page citation counter has been removed, so the scholar-citations workflow is optional.
It still runs daily (updating `content/citations.json` via SerpApi and requiring the
`SERPAPI_KEY` repository secret); disable the workflow if you no longer want it.

## SEO

Both pages ship a canonical URL, meta description, Open Graph + Twitter metadata, and JSON-LD
structured data (`Person`/`WebSite` on the home page, `ProfilePage` on `/cv/`). `robots.txt`
allows crawling and points to `sitemap.xml`, which lists `/` and `/cv/`. Keep the canonical
domain aligned across `index.html`, `cv/index.html`, `robots.txt`, and `sitemap.xml` if the
domain changes.
