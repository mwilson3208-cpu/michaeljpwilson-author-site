# Test suite

Unit tests for every function in `index.html`, run against the **real page**
in headless Chromium (no DOM mocks): `esc`, `coverHTML`, `buyLinksHTML`,
`setNote`, `submitForm` (all four outcome branches + the unconfigured-endpoint
guard, with `fetch` stubbed so no real submissions are sent), `renderSocial`,
`router` (including the in-page-anchor guard and unknown-slug fallback),
`goToSection`, `bookCard`, `renderBookPage`, `optinHTML`, plus data-integrity
checks over `BOOKS`, `PAGES`, `AUTHOR_LINKS`, and `SOCIAL_ICONS`.

## Run

```bash
node tests/unit-tests.mjs
```

Requires Node 18+ and [Playwright](https://playwright.dev) with Chromium
(`npm i -D playwright && npx playwright install chromium`). If Playwright or
Chromium live elsewhere, point to them explicitly:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_PATH=/path/to/chromium \
  node tests/unit-tests.mjs
```

The runner serves the repo on a random local port with a built-in static
server, so no other tooling is needed. Exit code 0 = all tests passed.

## Coverage

```bash
COVERAGE=1 node tests/unit-tests.mjs
```

Uses V8's native coverage (via Playwright) on the site's inline script and
prints function- and branch/block-level coverage plus any uncovered source
snippets. Current: **100% functions, ~98% branches**. The two known
uncovered blocks are structurally unreachable from tests:

1. the unconfigured-Formspree guard body inside the real `submitForm` — the
   shipped endpoint constant *is* configured (correct production state); the
   guard logic itself is tested against a functionally identical clone;
2. the footer book-list fallback for a book without an Amazon link — top-level
   code that runs once at page load, and every shipped book has an Amazon link.
