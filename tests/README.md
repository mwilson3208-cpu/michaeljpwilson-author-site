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
