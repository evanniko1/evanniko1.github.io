# emnikolados.dev

Static GitHub Pages site for Evangelos-Marios Nikolados.

## Updating skills, projects, and publications

Edit **content/site.json**. It contains three arrays:

- **skills** controls the Data Science & Biology Skills cards, including the LLMs & Agents card.
- **projects** controls Selected Projects.
- **publications** controls Selected Publications.

After editing locally, run:

    npm run build
    npm test

Commit both **content/site.json** and the generated **index.html**. If the data file is edited directly on GitHub, the content-build workflow rebuilds and commits index.html automatically.

Do not edit the HTML between CONTENT START and CONTENT END comments in index.html; those blocks are generated from the JSON data.

## Browser content editor

Open **https://emnikolados.dev/editor.html** to update the content through text fields instead of editing JSON manually. The editor:

- Loads the currently published skills, models, projects, and publications.
- Supports adding, removing, and reordering entries.
- Validates required fields and publication URLs.
- Can save directly to a local **content/site.json** selected through a supported browser.
- Can copy or download **site.json** as a fallback.

The editor runs entirely in the browser and is excluded from search indexing. It does not store a GitHub token or write directly to the repository. Commit and push the updated **content/site.json** to publish; the existing GitHub Action rebuilds **index.html**.

## Google Scholar citations

The scholar-citations workflow runs every Monday at 03:17 UTC and can also be run manually from GitHub Actions. It updates **content/citations.json**, rebuilds index.html, and commits the result.

Google Scholar does not provide an official public citation API. The updater therefore reads the public profile page on a best-effort basis. If Google rate-limits a scheduled run, the workflow keeps the last successfully recorded value instead of replacing it with zero.

To refresh locally:

    npm run citations:update
    npm run build

## SEO

The site includes a canonical URL, description, Open Graph and Twitter metadata, Person and WebSite structured data, robots.txt, sitemap.xml, a web manifest, and corrected favicon links. Keep the canonical domain in index.html, robots.txt, and sitemap.xml aligned if the domain changes.
