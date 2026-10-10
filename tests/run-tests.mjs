// End-to-end checks for the course site.
// Serves the repository under /EF-Core-optim/ (like GitHub Pages) and drives Chromium with Playwright.
// Usage: npm ci && npx playwright install chromium && npm test
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "/EF-Core-optim/";
const AXE = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

let failures = 0;
const fail = (msg) => { failures++; console.error("  ✗ " + msg); };
const ok = (msg) => console.log("  ✓ " + msg);
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));

// ---------- static server ----------
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!url.startsWith(BASE)) { res.writeHead(404); return res.end(); }
  let rel = url.slice(BASE.length) || "index.html";
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(path.join(ROOT, "404.html")));
  }
});
await new Promise((r) => server.listen(0, r));
const origin = `http://127.0.0.1:${server.address().port}`;
const lessons = (await readdir(path.join(ROOT, "lessons"))).filter((f) => f.endsWith(".html")).sort();
const pages = ["index.html", ...lessons.map((f) => "lessons/" + f)];

const browser = await chromium.launch();

async function open(p, opts = {}) {
  const page = await browser.newPage(opts);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && /Content Security Policy|Uncaught/i.test(m.text())) errors.push(m.text()); });
  await page.goto(origin + BASE + p);
  return { page, errors };
}

try {
  // ---------- 1. every page renders ----------
  console.log(`\n1. Pages render (${pages.length})`);
  for (const p of pages) {
    const { page, errors } = await open(p);
    const r = await page.evaluate(() => ({
      sidebar: document.querySelectorAll("#sidebar a.lesson-link").length,
      quiz: document.querySelectorAll(".quiz").length,
      goal: !!document.querySelector(".goal"),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      dupIds: (() => { const ids = [...document.querySelectorAll("[id]")].map((e) => e.id); return ids.length - new Set(ids).size; })(),
    }));
    const isLesson = p.startsWith("lessons/");
    const problems = [];
    if (r.sidebar !== lessons.length + 1) problems.push(`sidebar links ${r.sidebar}`);
    if (isLesson && r.quiz !== 3) problems.push(`quizzes ${r.quiz}`);
    if (!r.goal) problems.push("no goal section");
    if (r.overflow) problems.push("horizontal overflow");
    if (r.dupIds) problems.push(`${r.dupIds} duplicate ids`);
    if (errors.length) problems.push("errors: " + errors.join(" | "));
    problems.length ? fail(`${p}: ${problems.join(", ")}`) : null;
    await page.close();
  }
  if (!failures) ok("all pages render with sidebar, goal, quizzes, unique ids and no errors");

  // ---------- 2. internal links resolve ----------
  console.log("\n2. Internal links");
  {
    const { page } = await open("index.html");
    const hrefs = new Set();
    for (const p of pages) {
      await page.goto(origin + BASE + p);
      for (const h of await page.$$eval("a[href]", (as) => as.map((a) => a.href))) if (h.startsWith(origin)) hrefs.add(h.split("#")[0]);
    }
    let broken = 0;
    for (const h of hrefs) { const r = await fetch(h); if (r.status !== 200) { broken++; fail(`broken link ${h} (${r.status})`); } }
    check(broken === 0, `${hrefs.size} internal links resolve`);
    await page.close();
  }

  // ---------- 3. accessibility (axe, both themes) ----------
  console.log("\n3. Accessibility (axe-core, WCAG 2.1 AA)");
  for (const scheme of ["light", "dark"]) {
    let total = 0;
    for (const p of pages) {
      const { page } = await open(p, { colorScheme: scheme, bypassCSP: true });   // axe is injected inline
      await page.addScriptTag({ content: AXE });
      await page.evaluate(() => document.querySelector(".quiz button.opt")?.click());
      const v = await page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] })).violations);
      for (const x of v) { total++; fail(`${scheme} ${p}: ${x.id} (${x.nodes.length}) ${x.help}`); }
      await page.close();
    }
    check(total === 0, `no axe violations in ${scheme} mode`);
  }

  // ---------- 4. interactions: quiz, progress, search ----------
  console.log("\n4. Interactions");
  {
    const { page } = await open("lessons/11-projections.html");
    await page.click(".quiz button.opt[data-opt='a']");
    check(await page.$eval(".quiz", (q) => q.classList.contains("answered")), "quiz records an answer and shows the explanation");
    await page.click("#complete-btn");
    await page.goto(origin + BASE + "index.html");
    check((await page.textContent("#progress-pill")).startsWith("1 /"), "completion persists and shows on the home page");
    await page.keyboard.press("/");
    await page.keyboard.type("split query");
    await page.waitForSelector(".search-hit", { timeout: 5000 });
    const first = await page.$eval(".search-hit", (a) => a.getAttribute("href"));
    check(/15-split-queries\.html/.test(first), `search finds the split-queries lesson first (${first})`);
    await page.click(".search-hit");
    await page.waitForLoadState();
    check(page.url().includes("15-split-queries.html"), "search result navigates to the lesson");
    await page.close();
  }

  // ---------- 4b. sidebar resize and collapse ----------
  console.log("\n4b. Sidebar resize and collapse");
  {
    const { page, errors } = await open("lessons/03-modeling-fundamentals.html", { viewport: { width: 1280, height: 800 } });
    const navWidth = () => page.$eval("#sidebar", (n) => Math.round(n.getBoundingClientRect().width));
    const box = await page.locator(".sidebar-resizer").boundingBox();
    const y = box.y + 300;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, y, { steps: 5 });
    await page.mouse.up();
    const dragged = await navWidth();
    check(dragged > 400 && dragged <= 560, `dragging the border widens the menu (${dragged}px)`);
    await page.reload();
    check(Math.abs((await navWidth()) - dragged) <= 1, "the width is remembered after reload");
    await page.click(".sidebar-toggle");
    check(!(await page.isVisible("#sidebar")), "« hides the menu");
    await page.reload();
    check(!(await page.isVisible("#sidebar")) && (await page.textContent(".sidebar-toggle")) === "»", "hidden state is remembered and shows »");
    await page.click(".sidebar-toggle");
    check(await page.isVisible("#sidebar") && Math.abs((await navWidth()) - dragged) <= 1, "» shows the menu at its saved width");
    await page.focus(".sidebar-resizer");
    await page.keyboard.press("Home");
    check((await navWidth()) === 200, "keyboard (Home) resizes the menu to its minimum");
    await page.dblclick(".sidebar-resizer");
    check((await navWidth()) === 300, "double-click resets the default width");
    const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
    check((await page.textContent(".topbar .version")) === "v" + pkg.version, `top bar shows the version from package.json (v${pkg.version})`);
    check(errors.length === 0, "no page errors while resizing" + (errors.length ? ": " + errors.join(" | ") : ""));
    await page.close();
  }

  // ---------- 5. AI tutor with a mocked OpenAI API ----------
  console.log("\n5. AI tutor (mocked API)");
  {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" };
    const sse = (evs) => evs.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
    const answer = "**Direct answer.**\n\n```csharp\nvar x = db.Products.Select(p => p.Id);\n```";
    const bodies = [];
    const { page, errors } = await open("lessons/11-projections.html", { bypassCSP: true });   // axe is injected inline
    await page.route("https://api.openai.com/**", async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (req.url().endsWith("/models")) return route.fulfill({ status: 200, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ data: [{ id: "gpt-6-sol" }] }) });
      const b = JSON.parse(req.postData()); bodies.push(b);
      if (bodies.length === 1) return route.fulfill({ status: 400, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning.effort'" } }) });
      return route.fulfill({ status: 200, headers: { ...cors, "content-type": "text/event-stream" }, body: sse([
        { type: "response.web_search_call.searching" },
        ...answer.match(/.{1,12}/gs).map((d) => ({ type: "response.output_text.delta", delta: d })),
        { type: "response.output_text.annotation.added", annotation: { type: "url_citation", url: "https://learn.microsoft.com/ef/core/", title: "EF Core docs" } },
        { type: "response.completed", response: { usage: { total_tokens: 42 }, output: [] } },
      ]) });
    });
    const sel = await page.evaluate(() => {
      const p = document.querySelector("article h2 + p"); const r = document.createRange(); r.selectNodeContents(p);
      getSelection().removeAllRanges(); getSelection().addRange(r); const b = r.getClientRects()[0];
      return { x: b.left + 10, y: b.top + 5, text: p.textContent.trim().slice(0, 30) };
    });
    await page.mouse.click(sel.x, sel.y, { button: "right" });
    check(await page.isVisible(".ai-modal"), "right-clicking selected text opens the tutor");
    check(await page.isVisible(".ai-settings"), "settings are shown when no API key is stored");
    await page.fill("#ai-key", "sk-test");
    await page.click('[data-s="save"]');
    await page.click(".ai-chips button");
    await page.waitForSelector(".ai-msg.assistant .meta-line:not([hidden])", { timeout: 8000 });
    check(await page.$eval(".ai-msg.assistant .bubble", (b) => b.innerHTML.includes("<pre>")), "streamed Markdown answer renders code blocks");
    check((await page.textContent(".ai-sources")).includes("EF Core docs"), "web-search citations are listed as sources");
    check(bodies.length === 2 && !bodies[1].reasoning && bodies[1].store === false, "unsupported reasoning falls back once; requests use store:false");
    check(bodies[1].instructions.includes(sel.text) && bodies[1].instructions.includes("Lesson 11"), "prompt includes the selected passage and lesson context");
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async () => (await axe.run(".ai-modal", { runOnly: ["wcag2a", "wcag2aa"] })).violations);
    check(v.length === 0, "AI modal has no axe violations" + (v.length ? ": " + v.map((x) => x.id).join(",") : ""));
    // Focus can legitimately leave the modal (e.g. clicking plain text in it); Escape must still close it
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("Escape");
    check(!(await page.isVisible(".ai-modal")), "Escape closes the modal, even when focus has left it");
    check(errors.length === 0, "no page or CSP errors" + (errors.length ? ": " + errors.join(" | ") : ""));
    await page.close();
  }

  // ---------- 6. 404 ----------
  console.log("\n6. Not-found page");
  {
    const r = await fetch(origin + BASE + "lessons/05-tracking-vs-no-tracking.html");
    check(r.status === 404 && (await r.text()).includes("Page not found"), "unknown URLs serve the 404 page");
  }
} finally {
  await browser.close();
  server.close();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
