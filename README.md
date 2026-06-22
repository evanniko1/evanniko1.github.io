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

## Private content editor

The editor is deliberately not deployed to GitHub Pages. It runs on the loopback interface of your computer and uses a new unguessable session URL every time it starts.

From the repository directory, run:

    npm run content:edit

Open the URL printed in the terminal. The editor loads **content/site.json** and provides text fields for skills, models, projects, and publications. **Publish website** validates the data, rebuilds **index.html**, commits both generated files, and pushes **main** using your existing local GitHub credentials. The GitHub Actions content-build workflow then republishes the site.

Stop the editor with **Ctrl+C**. There is no public **/editor.html** route and no password or GitHub token is stored in frontend code.

## Google Scholar citations

The scholar-citations workflow runs every Monday at 03:17 UTC and can also be run manually from GitHub Actions. It updates **content/citations.json**, rebuilds index.html, and commits the result.

Google Scholar does not provide an official public citation API. The updater therefore reads the public profile page on a best-effort basis. If Google rate-limits a scheduled run, the workflow keeps the last successfully recorded value instead of replacing it with zero.

To refresh locally:

    npm run citations:update
    npm run build

## SEO

The site includes a canonical URL, description, Open Graph and Twitter metadata, Person and WebSite structured data, robots.txt, sitemap.xml, a web manifest, and corrected favicon links. Keep the canonical domain in index.html, robots.txt, and sitemap.xml aligned if the domain changes.
