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
- **Forms:** All five forms (contact, speaking, media, and the two free-guide
  email opt-ins) submit via AJAX to **[Formspree](https://formspree.io)** with
  inline sending / success / error states — no page reload. To turn them on:
  1. Create a free form at formspree.io and copy its endpoint
     (`https://formspree.io/f/<your-id>`).
  2. Open `index.html`, find `const FORMSPREE_ENDPOINT =` near the top of the
     `<script>`, and replace `REPLACE_WITH_YOUR_FORM_ID` with your endpoint.
  3. Copy `index.html` over `404.html` so both stay identical, then redeploy.

  All forms post to the one endpoint; each submission is tagged with a subject
  (e.g. "Speaking Inquiry — michaeljpwilson.com") so you can tell them apart.
  Until the endpoint is set, a form politely reports that it isn't connected yet.
  The two email opt-ins work through Formspree too, but a dedicated email
  platform (Mailchimp, ConvertKit, etc.) is better for building a mailing list.
- **Books** link out to Michael's
  [Amazon author store](https://www.amazon.com/stores/Michael-Wilson/author/B0BNP91RPR).
