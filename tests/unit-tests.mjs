/**
 * Unit test suite for the Michael JP Wilson author site.
 *
 * The site is a single self-contained HTML file, so tests run against the
 * real page in headless Chromium: every function is exercised in the live
 * environment it ships in (no mocks of the DOM, router, or renderers).
 *
 * Run:  node tests/unit-tests.mjs
 * Requires: playwright (module) + a Chromium executable. Override paths via
 *   PLAYWRIGHT_MODULE=/path/to/playwright  CHROMIUM_PATH=/path/to/chromium
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PW = process.env.PLAYWRIGHT_MODULE || "playwright";
const pw = await import(PW).then(m => m.default ?? m);
const { chromium } = pw;
const CHROME = process.env.CHROMIUM_PATH; // undefined -> playwright default

// ---- tiny static server (no dependencies) ----
const MIME = { ".html": "text/html", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf",
  ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/") p = "/index.html";
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// ---- test harness ----
let passed = 0; const failures = [];
function report(name, ok, detail = "") {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failures.push(name); console.log(`  ❌ ${name}${detail ? "  -> " + detail : ""}`); }
}
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(e.message));
const COVERAGE = !!process.env.COVERAGE;
if (COVERAGE) await page.coverage.startJSCoverage({ resetOnNavigation: false });
await page.goto(BASE, { waitUntil: "networkidle" });

/** Run a test function inside the page. It must return {ok, detail?}. */
async function t(name, fn) {
  try {
    const r = await page.evaluate(fn);
    report(name, r && r.ok, r && r.detail);
  } catch (e) { report(name, false, e.message.split("\n")[0]); }
}

// =====================================================================
console.log("\n— esc() —");
await t("escapes & < > \"", () => ({ ok: esc('a&b<c>d"e') === "a&amp;b&lt;c&gt;d&quot;e" }));
await t("leaves safe text unchanged", () => ({ ok: esc("plain 'text' 123") === "plain 'text' 123" }));
await t("null -> empty string", () => ({ ok: esc(null) === "" }));
await t("undefined -> empty string", () => ({ ok: esc(undefined) === "" }));
await t("empty string -> empty string", () => ({ ok: esc("") === "" }));
await t("number input coerced, no throw", () => ({ ok: esc(123) === "123" }));
await t("0 coerced (falsy but not null)", () => ({ ok: esc(0) === "0" }));
await t("double-escape is stable html", () => ({ ok: esc(esc("<")) === "&amp;lt;" }));

console.log("\n— coverHTML() —");
await t("with coverImage renders <img> with escaped alt", () => {
  const html = coverHTML({ title: 'T<i>"x', coverImage: "data:image/jpeg;base64,x" });
  return { ok: html.includes("has-img") && html.includes('alt="T&lt;i&gt;&quot;x book cover"') };
});
await t("without coverImage renders styled placeholder", () => {
  const html = coverHTML({ title: "T", coverStyle: { bg: "#000", fg: "#fff", accent: "#c00", kicker: "K" } });
  return { ok: html.includes("background:#000") && html.includes(">K<") && html.includes("Michael JP Wilson") };
});
await t("extra attr is inserted", () => {
  const html = coverHTML({ title: "T", coverImage: "data:x" }, 'data-test="1"');
  return { ok: html.includes('data-test="1"') };
});

console.log("\n— buyLinksHTML() —");
await t("renders anchors for every provided link", () => {
  const b = { formats: ["Paperback"], links: { amazon: "https://a", audible: "https://b", apple: "https://c", kobo: "https://d", google: "https://e" } };
  const n = (buyLinksHTML(b).match(/<a /g) || []).length;
  return { ok: n === 5, detail: n + " anchors" };
});
await t("primaryOnly limits to amazon+audible", () => {
  const b = { formats: [], links: { amazon: "https://a", audible: "https://b", apple: "https://c", kobo: "", google: "" } };
  const html = buyLinksHTML(b, true);
  return { ok: html.includes("Buy on Amazon") && html.includes("Audiobook") && !html.includes("Apple") };
});
await t("missing amazon -> placeholder", () => {
  const b = { formats: [], links: { amazon: "", audible: "", apple: "", kobo: "", google: "" } };
  return { ok: buyLinksHTML(b).includes("Amazon link coming soon") };
});
await t("audiobook placeholder ONLY when format exists", () => {
  const base = { links: { amazon: "https://a", audible: "", apple: "", kobo: "", google: "" } };
  const withFmt = buyLinksHTML({ ...base, formats: ["Audiobook"] }).includes("Audiobook link coming soon");
  const withoutFmt = buyLinksHTML({ ...base, formats: ["Paperback"] }).includes("Audiobook link coming soon");
  return { ok: withFmt && !withoutFmt, detail: `with=${withFmt} without=${withoutFmt}` };
});
await t("href is escaped", () => {
  const b = { formats: [], links: { amazon: 'https://a?x=1&y="2', audible: "", apple: "", kobo: "", google: "" } };
  return { ok: buyLinksHTML(b).includes("x=1&amp;y=&quot;2") };
});

console.log("\n— setNote() —");
await t("null note does not throw", () => { setNote(null, "m", "error"); return { ok: true }; });
await t("sets text and .show", () => {
  const el = document.createElement("p"); el.className = "form-note";
  setNote(el, "hello", null);
  return { ok: el.textContent === "hello" && el.classList.contains("show") };
});
await t("kind classes are swapped, not stacked", () => {
  const el = document.createElement("p"); el.className = "form-note";
  setNote(el, "a", "error"); setNote(el, "b", "success");
  return { ok: el.classList.contains("success") && !el.classList.contains("error") };
});

console.log("\n— submitForm() (stubbed fetch) —");
async function formHarness(pageFn) { return pageFn; }
await t("success: thank-you note + form reset", await formHarness(async () => {
  const f = document.createElement("form");
  f.innerHTML = '<input name="email"><button type="submit">Go</button><p class="form-note"></p>';
  document.body.appendChild(f);
  f.querySelector("input").value = "x@y.z"; // runtime value, so reset() clears it
  const oldFetch = window.fetch;
  window.fetch = async () => ({ ok: true, json: async () => ({}) });
  try {
    await submitForm({ preventDefault(){}, target: f }, "Test");
    const note = f.querySelector(".form-note").textContent;
    return { ok: /Thank you/.test(note) && f.querySelector("input").value === "", detail: note.slice(0, 40) };
  } finally { window.fetch = oldFetch; f.remove(); }
}));
await t("success + redirect: hash changes", await formHarness(async () => {
  const f = document.createElement("form");
  f.innerHTML = '<button type="submit">Go</button><p class="form-note"></p>';
  document.body.appendChild(f);
  const oldFetch = window.fetch; const oldHash = location.hash;
  window.fetch = async () => ({ ok: true, json: async () => ({}) });
  try {
    await submitForm({ preventDefault(){}, target: f }, "Test", "#/guide");
    const ok = location.hash === "#/guide";
    return { ok };
  } finally { window.fetch = oldFetch; location.hash = oldHash; f.remove(); }
}));
await t("server 4xx: shows API error message, keeps input", await formHarness(async () => {
  const f = document.createElement("form");
  f.innerHTML = '<input name="email" value="keep"><button type="submit">Go</button><p class="form-note"></p>';
  document.body.appendChild(f);
  const oldFetch = window.fetch;
  window.fetch = async () => ({ ok: false, json: async () => ({ errors: [{ message: "Bad email." }] }) });
  try {
    await submitForm({ preventDefault(){}, target: f }, "Test");
    const note = f.querySelector(".form-note");
    return { ok: note.textContent === "Bad email." && note.classList.contains("error") && f.querySelector("input").value === "keep" };
  } finally { window.fetch = oldFetch; f.remove(); }
}));
await t("network failure: error note + button restored", await formHarness(async () => {
  const f = document.createElement("form");
  f.innerHTML = '<button type="submit">Send</button><p class="form-note"></p>';
  document.body.appendChild(f);
  const oldFetch = window.fetch;
  window.fetch = async () => { throw new Error("net down"); };
  try {
    await submitForm({ preventDefault(){}, target: f }, "Test");
    const btn = f.querySelector("button");
    return { ok: /Network error/.test(f.querySelector(".form-note").textContent) && !btn.disabled && btn.textContent === "Send" };
  } finally { window.fetch = oldFetch; f.remove(); }
}));
await t("unconfigured endpoint guard: not-connected message, no fetch", await formHarness(async () => {
  // simulate the shipped-but-unconfigured state without touching the real const
  const src = submitForm.toString().replace(/FORMSPREE_ENDPOINT/g, '"https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID"');
  const guarded = new Function("setNote", "return " + src)(setNote);
  const f = document.createElement("form");
  f.innerHTML = '<button type="submit">Go</button><p class="form-note"></p>';
  document.body.appendChild(f);
  let fetched = false; const oldFetch = window.fetch;
  window.fetch = async () => { fetched = true; return { ok: true, json: async () => ({}) }; };
  try {
    await guarded({ preventDefault(){}, target: f }, "T");
    return { ok: /isn't connected yet/.test(f.querySelector(".form-note").textContent) && !fetched };
  } finally { window.fetch = oldFetch; f.remove(); }
}));

console.log("\n— renderSocial() —");
await t("footer: exactly the 4 icon networks", () => {
  renderSocial();
  const names = [...document.querySelectorAll("#social-links a")].map(a => a.getAttribute("aria-label"));
  return { ok: names.join() === "Facebook,LinkedIn,Instagram,YouTube", detail: names.join() };
});
await t("explore: Amazon appended exactly once, idempotent", () => {
  renderSocial(); renderSocial(); renderSocial();
  const n = [...document.querySelectorAll("#explore-links a")].filter(a => a.textContent.includes("Amazon")).length;
  return { ok: n === 1, detail: n + " Amazon entries" };
});
await t("non-http URL is ignored (no dead link)", () => {
  const old = AUTHOR_LINKS["Barnes & Noble Author Page"];
  AUTHOR_LINKS["Barnes & Noble Author Page"] = "javascript:alert(1)";
  renderSocial();
  const shown = [...document.querySelectorAll("#explore-links a")].some(a => a.textContent.includes("Barnes"));
  AUTHOR_LINKS["Barnes & Noble Author Page"] = old; renderSocial();
  return { ok: !shown };
});
await t("newly filled URL appears, cleanup removes it", () => {
  const old = AUTHOR_LINKS["Audiobook Author Page"];
  AUTHOR_LINKS["Audiobook Author Page"] = "https://example.com/audio";
  renderSocial();
  const shown = [...document.querySelectorAll("#explore-links a")].some(a => a.href === "https://example.com/audio");
  AUTHOR_LINKS["Audiobook Author Page"] = old; renderSocial();
  const gone = ![...document.querySelectorAll("#explore-links a")].some(a => a.href === "https://example.com/audio");
  return { ok: shown && gone };
});

console.log("\n— router() —");
await t("known route renders page + sets title", () => {
  location.hash = "#/about"; router();
  return { ok: document.querySelector("#app h1").textContent.includes("Meet Michael") && document.title.includes("About") };
});
await t("book route renders detail page", () => {
  location.hash = "#/books/aio-the-new-seo"; router();
  return { ok: document.querySelector("#app h1").textContent === "AIO: The New SEO" };
});
await t("unknown book slug falls back to home (no crash)", () => {
  location.hash = "#/books/does-not-exist"; router();
  return { ok: /Think Bigger/.test(document.querySelector("#app h1").textContent) };
});
await t("unknown route falls back to home", () => {
  location.hash = "#/nope"; router();
  return { ok: /Think Bigger/.test(document.querySelector("#app h1").textContent) };
});
await t("in-page anchor hash does NOT re-render current page", () => {
  location.hash = "#/speaking"; router();
  const before = document.querySelector("#app h1").textContent;
  location.hash = "#speak-form"; router();
  const after = document.querySelector("#app h1").textContent;
  location.hash = "#/"; router();
  return { ok: before === after && before.includes("Invite Michael"), detail: after.slice(0, 30) };
});
await t("cold load with anchor hash still renders (guard fall-through)", () => {
  const app = document.getElementById("app");
  location.hash = "#speak-form"; app.innerHTML = ""; router();
  const ok = app.innerHTML.length > 500;
  location.hash = "#/"; router();
  return { ok };
});
await t("meta description updates per route", () => {
  location.hash = "#/coaching"; router();
  const d = document.querySelector('meta[name="description"]').getAttribute("content");
  location.hash = "#/"; router();
  return { ok: d === PAGES["/coaching"].desc && d.length > 50, detail: d.slice(0, 40) };
});

console.log("\n— goToSection() —");
await t("returns false and navigates home first", async () => {
  location.hash = "#/about"; router();
  const ret = goToSection("books-section");
  await new Promise(r => setTimeout(r, 200));
  const el = document.getElementById("books-section");
  const ok = ret === false && (location.hash === "#/" || location.hash === "") && !!el;
  location.hash = "#/"; router();
  return { ok };
});
await t("unknown section id does not throw", async () => {
  goToSection("no-such-section");
  await new Promise(r => setTimeout(r, 150));
  return { ok: true };
});

console.log("\n— renderers (bookCard / renderBookPage / optinHTML) —");
await t("bookCard links to the detail page", () => {
  const html = bookCard(BOOKS[0]);
  return { ok: html.includes(`#/books/${BOOKS[0].slug}`) };
});
await t("renderBookPage: h1, related books exclude self", () => {
  const html = renderBookPage(BOOKS[0]);
  const relatedSelf = html.split(`#/books/${BOOKS[0].slug}`).length - 1;
  return { ok: html.includes(`<h1>${BOOKS[0].title}</h1>`) && relatedSelf === 0, detail: relatedSelf + " self-links" };
});
await t("renderBookPage: empty preview shows coming-soon panel", () => {
  const b = BOOKS.find(x => !x.preview);
  return b ? { ok: renderBookPage(b).includes("Sample excerpt coming soon") } : { ok: true, detail: "all previews filled" };
});
await t("optinHTML wires submitForm with guide redirect", () => {
  const html = optinHTML();
  return { ok: html.includes("submitForm(event") && html.includes("#/guide") && html.includes('name="email"') };
});

console.log("\n— branch-coverage edge cases —");
await t("submitForm: note outside the form (footer layout)", async () => {
  const wrap = document.createElement("div");
  wrap.innerHTML = '<form><button type="submit">Go</button></form><p class="form-note"></p>';
  document.body.appendChild(wrap);
  const oldFetch = window.fetch;
  window.fetch = async () => ({ ok: true, json: async () => ({}) });
  try {
    await submitForm({ preventDefault(){}, target: wrap.querySelector("form") }, "T");
    return { ok: /Thank you/.test(wrap.querySelector(".form-note").textContent) };
  } finally { window.fetch = oldFetch; wrap.remove(); }
});
await t("submitForm: form with no submit button, no subject", async () => {
  const f = document.createElement("form");
  f.innerHTML = '<p class="form-note"></p>';
  document.body.appendChild(f);
  const oldFetch = window.fetch; let subj = "unset";
  window.fetch = async (u, o) => { subj = o.body.get("_subject"); return { ok: true, json: async () => ({}) }; };
  try {
    await submitForm({ preventDefault(){}, target: f });
    return { ok: /Thank you/.test(f.querySelector(".form-note").textContent) && subj === null, detail: "subject=" + subj };
  } finally { window.fetch = oldFetch; f.remove(); }
});
await t("submitForm: 4xx with invalid JSON -> default error message", async () => {
  const f = document.createElement("form");
  f.innerHTML = '<button type="submit">Go</button><p class="form-note"></p>';
  document.body.appendChild(f);
  const oldFetch = window.fetch;
  window.fetch = async () => ({ ok: false, json: async () => { throw new Error("bad json"); } });
  try {
    await submitForm({ preventDefault(){}, target: f }, "T");
    return { ok: /Something went wrong/.test(f.querySelector(".form-note").textContent) };
  } finally { window.fetch = oldFetch; f.remove(); }
});
await t("goToSection with empty hash (no current route)", async () => {
  history.replaceState(null, "", location.pathname); // strip hash entirely
  const ret = goToSection("books-section");
  await new Promise(r => setTimeout(r, 150));
  const ok = ret === false;
  location.hash = "#/"; router();
  return { ok };
});
await t("router renders contact page and fills connect-links", () => {
  location.hash = "#/contact"; router();
  const n = document.querySelectorAll("#connect-links a").length;
  location.hash = "#/"; router();
  return { ok: n >= 5, detail: n + " connect links" };
});
await t("media page: book without cover shows coming-soon tile", () => {
  BOOKS.push({ slug: "_tmp", title: "Tmp", category: "X", formats: ["Paperback"],
    links: { amazon: "", audible: "", apple: "", kobo: "", google: "" },
    coverStyle: { bg: "#000", fg: "#fff", accent: "#c00", kicker: "K" },
    learn: [], themes: [], description: "d", longDescription: "d", idealReader: "r", authorNote: "n", preview: "", year: "" });
  try {
    const html = PAGES["/media"].render();
    return { ok: html.includes("Cover coming soon") && html.includes("Download cover") };
  } finally { BOOKS.pop(); }
});
await t("renderBookPage: year, preview text, no subtitle, fiction wording", () => {
  const fake = { slug: "_tmp2", title: "Tmp2", category: "Fiction and Historical Adventure",
    formats: ["Paperback"], links: { amazon: "https://a", audible: "", apple: "", kobo: "", google: "" },
    coverImage: "data:image/jpeg;base64,x", year: "2023",
    learn: ["a"], themes: ["t"], longDescription: "L", idealReader: "R", authorNote: "N",
    preview: "Para one.\n\nPara two.", seoTitle: "T", seoDescription: "D" };
  const html = renderBookPage(fake);
  return { ok: html.includes("<b>Published</b>2023") && html.includes("preview-panel")
    && html.includes("Para two.") && html.includes("Experience") && !html.includes("undefined"),
    detail: "" };
});

console.log("\n— data integrity —");
await t("BOOKS: unique slugs, required fields, valid links", () => {
  const slugs = new Set(BOOKS.map(b => b.slug));
  const bad = BOOKS.filter(b => !b.slug || !b.title || !b.category || !Array.isArray(b.formats) || !b.formats.length
    || !b.links || typeof b.links.amazon !== "string"
    || Object.values(b.links).some(u => u && !/^https?:\/\//.test(u)));
  return { ok: slugs.size === BOOKS.length && bad.length === 0, detail: bad.map(b => b.slug).join(",") };
});
await t("every PAGES entry renders non-empty html with one h1", () => {
  const bad = Object.entries(PAGES).filter(([k, p]) => {
    const h = p.render();
    return !p.title || !p.desc || h.length < 300 || (h.match(/<h1[ >]/g) || []).length !== 1;
  }).map(([k]) => k);
  return { ok: bad.length === 0, detail: bad.join(",") };
});
await t("SOCIAL_ICONS cover exactly the icon networks in AUTHOR_LINKS", () => {
  const missing = Object.keys(SOCIAL_ICONS).filter(k => !(k in AUTHOR_LINKS));
  return { ok: missing.length === 0, detail: "icons without config: " + missing.join(",") };
});
await t("AUTHOR_LINKS values are https or empty", () => {
  const bad = Object.entries(AUTHOR_LINKS).filter(([, u]) => u && !/^https:\/\//.test(u)).map(([k]) => k);
  return { ok: bad.length === 0, detail: bad.join(",") };
});

// =====================================================================
console.log(`\n========================================`);
console.log(`${passed + failures.length} tests, ${passed} passed, ${failures.length} failed`);
if (pageErrors.length) console.log("Page errors during run:", pageErrors);
if (failures.length) { console.log("FAILED:"); failures.forEach(f => console.log("  - " + f)); }

if (COVERAGE) {
  const entries = await page.coverage.stopJSCoverage();
  // The app's inline <script> is the largest script served from our origin.
  const main = entries.filter(e => e.url.startsWith(BASE) && e.source)
    .sort((a, b) => b.source.length - a.source.length)[0];
  if (!main) { console.log("coverage: main script not found"); }
  else {
    const src = main.source;
    const fns = main.functions.filter(f => f.functionName || f.ranges[0].endOffset - f.ranges[0].startOffset > 40);
    const named = fns.filter(f => f.functionName);
    const fnUncov = named.filter(f => f.ranges[0].count === 0);
    let blocks = 0, blocksHit = 0; const missed = [];
    for (const f of fns) for (const r of f.ranges) {
      blocks++;
      if (r.count > 0) blocksHit++;
      else missed.push({ fn: f.functionName || "(anon)", snippet: src.slice(r.startOffset, Math.min(r.endOffset, r.startOffset + 78)).replace(/\s+/g, " ") });
    }
    const fnPct = named.length ? (100 * (named.length - fnUncov.length) / named.length) : 100;
    const blkPct = blocks ? (100 * blocksHit / blocks) : 100;
    console.log(`\n===== COVERAGE (V8, main inline script) =====`);
    console.log(`functions: ${named.length - fnUncov.length}/${named.length} covered (${fnPct.toFixed(1)}%)`);
    console.log(`branches/blocks: ${blocksHit}/${blocks} covered (${blkPct.toFixed(1)}%)`);
    if (fnUncov.length) console.log("UNCOVERED FUNCTIONS: " + fnUncov.map(f => f.functionName).join(", "));
    if (missed.length) { console.log("UNCOVERED BLOCKS:"); missed.forEach(m => console.log(`  [${m.fn}] ${m.snippet}`)); }
  }
}
await browser.close();
server.close();
process.exit(failures.length || pageErrors.length ? 1 : 0);
