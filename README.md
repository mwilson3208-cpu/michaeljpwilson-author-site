# Michael JP Wilson — Author Website

The official author website for **Michael JP Wilson** — author, Army veteran,
entrepreneur, speaker, and author coach.

It's a single, self-contained static site: one `index.html` with all CSS and
JavaScript inlined and images embedded. No build step, no dependencies, no
server required — open it in a browser and it runs.

## Sections

The site is a lightweight single-page app with hash-based routing:

| Route | Page |
| --- | --- |
| `#/` | Home |
| `#/books` | Books library (with individual book pages at `#/books/<slug>`) |
| `#/about` | About the author |
| `#/coaching` | Author coaching |
| `#/speaking` | Speaking / book Michael to speak |
| `#/media` | Media & interviews |
| `#/contact` | Contact |

## Running locally

Because everything is inlined, you can just open the file:

```bash
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or serve it (recommended, so the hash router behaves exactly as in production):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

The site is static, so it deploys to any static host.

### GitHub Pages

1. Push to `main` (already done).
2. In the repo: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**.
3. Select **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. The site publishes at `https://mwilson3208-cpu.github.io/michaeljpwilson-author-site/`.

`.nojekyll` is included so GitHub Pages serves the files verbatim, and
`404.html` is a copy of `index.html` so deep links resolve to the app.

Other one-drag-and-drop options: **Netlify**, **Cloudflare Pages**, or **Vercel**.

## Notes

- **Fonts:** Fraunces (headings) and Source Sans 3 (body) load from Google Fonts,
  with Georgia / system-sans fallbacks if the CDN is unavailable.
- **Forms:** The contact, speaking, and media forms are front-end placeholders
  (`formPlaceholder`) — wire them to a form backend (Formspree, Netlify Forms,
  a serverless function, etc.) to receive submissions.
- **Books** link out to Michael's
  [Amazon author store](https://www.amazon.com/stores/Michael-Wilson/author/B0BNP91RPR).
