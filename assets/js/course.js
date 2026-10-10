/* EF Core Optimization Course — navigation, progress, quizzes */
(function () {
  "use strict";

  var LEVELS = [
    { id: 1, name: "Beginner", subtitle: "Foundations",
      goal: "Understand what EF Core does and see the SQL it generates.",
      desc: "How EF Core works, a first working configuration, modeling and querying basics." },
    { id: 2, name: "Configuration", subtitle: "Configure EF Core properly",
      goal: "Configure contexts, connections, providers, models and environments with confidence.",
      desc: "DbContext options, connection strings and secrets, provider settings, model configuration at scale, environments and testing." },
    { id: 3, name: "Intermediate", subtitle: "Everyday performance",
      goal: "Build habits that make everyday queries fast.",
      desc: "Tracking, projections, loading related data, pagination and indexes: the habits behind most of your speed-ups." },
    { id: 4, name: "Advanced", subtitle: "Writes, SQL & diagnostics",
      goal: "Handle writes, concurrency and raw SQL, and diagnose real problems.",
      desc: "Split queries, bulk writes, concurrency, raw SQL and finding slow queries in real systems." },
    { id: 5, name: "Expert", subtitle: "Internals & tuning",
      goal: "Tune EF Core internals and prove every improvement.",
      desc: "Context pooling, the query cache, compiled models, advanced mapping, interceptors and benchmarking." }
  ];

  var LESSONS = [
    { id: 1,  level: 1, slug: "01-how-ef-core-works",            title: "How EF Core Works (and What Costs Time)", summary: "DbContext, change tracker, query pipeline, round trips." },
    { id: 2,  level: 1, slug: "02-setup-and-configuration",      title: "Setup, Configuration & Logging SQL",    summary: "Registering DbContext, options, lifetimes, LogTo." },
    { id: 3,  level: 1, slug: "03-modeling-fundamentals",        title: "Modeling Fundamentals",                  summary: "Conventions, Fluent API, keys, column types." },
    { id: 4,  level: 1, slug: "04-querying-fundamentals",        title: "Querying Fundamentals",                  summary: "IQueryable vs IEnumerable, deferred execution, async." },
    { id: 5,  level: 2, slug: "05-dbcontext-configuration",      title: "DbContext Configuration in Depth",       summary: "Options pipeline, factories, IOptions, multiple contexts, design time." },
    { id: 6,  level: 2, slug: "06-connection-strings-and-secrets", title: "Connection Strings, Secrets & Pooling", summary: "Keywords, secret storage, managed identity, pool tuning." },
    { id: 7,  level: 2, slug: "07-provider-configuration",       title: "Provider-Specific Configuration",        summary: "SQL Server/Azure SQL, PostgreSQL, SQLite options and quirks." },
    { id: 8,  level: 2, slug: "08-model-configuration-at-scale", title: "Model Configuration at Scale",           summary: "Precedence, organization, conventions, seeding." },
    { id: 9,  level: 2, slug: "09-environments-and-testing",     title: "Environments, Testing & Configuration Safety", summary: "Per-environment settings, health checks, test strategies." },
    { id: 10, level: 3, slug: "10-tracking-vs-no-tracking",      title: "Tracking vs No-Tracking Queries",        summary: "AsNoTracking, identity resolution, defaults." },
    { id: 11, level: 3, slug: "11-projections",                  title: "Projections: Fetch Only What You Need",  summary: "Select, DTOs, avoiding over-fetching." },
    { id: 12, level: 3, slug: "12-loading-related-data",         title: "Loading Related Data & the N+1 Problem", summary: "Eager, explicit, lazy loading; filtered Include." },
    { id: 13, level: 3, slug: "13-pagination",                   title: "Pagination: Offset vs Keyset",           summary: "Skip/Take costs and seek-based paging." },
    { id: 14, level: 3, slug: "14-indexes-and-migrations",       title: "Indexes & Migrations",                   summary: "HasIndex, composite/filtered/covering indexes, safe deploys." },
    { id: 15, level: 4, slug: "15-split-queries",                title: "Split Queries & Cartesian Explosion",    summary: "AsSplitQuery, when and why." },
    { id: 16, level: 4, slug: "16-efficient-saving",             title: "Efficient Saving & Bulk Operations",     summary: "Batching, ExecuteUpdate/ExecuteDelete, HiLo, bulk copy." },
    { id: 17, level: 4, slug: "17-concurrency-and-transactions", title: "Concurrency, Transactions & Resiliency", summary: "Row versions, transactions, retry strategies." },
    { id: 18, level: 4, slug: "18-raw-sql-and-views",            title: "Raw SQL, Views & Stored Procedures",     summary: "FromSql, SqlQuery, keyless entities, safety." },
    { id: 19, level: 4, slug: "19-diagnostics",                  title: "Diagnosing Performance Problems",        summary: "Logging, tags, query plans, metrics, tracing." },
    { id: 20, level: 5, slug: "20-context-pooling",              title: "DbContext Pooling & Factories",          summary: "AddDbContextPool, pooled factories, state." },
    { id: 21, level: 5, slug: "21-query-caching-and-compiled-queries", title: "Query Caching, Parameters & Compiled Queries", summary: "Cache pollution, EF.Constant/Parameter, CompileAsyncQuery." },
    { id: 22, level: 5, slug: "22-compiled-models-and-startup",  title: "Compiled Models, Startup & Native AOT",  summary: "dotnet ef dbcontext optimize, warm-up, precompiled queries." },
    { id: 23, level: 5, slug: "23-advanced-mapping",             title: "Advanced Mapping for Performance",       summary: "Inheritance strategies, complex types, JSON, converters." },
    { id: 24, level: 5, slug: "24-interceptors-and-filters",     title: "Interceptors, Query Filters & Conventions", summary: "Cross-cutting behaviour without the overhead." },
    { id: 25, level: 5, slug: "25-benchmarking-and-checklist",   title: "Benchmarking & the Production Checklist", summary: "BenchmarkDotNet, load testing, final checklist." }
  ];

  var STORE_KEY = "efcourse.completed.v2";   // v2: lessons renumbered when the Configuration level was added
  var THEME_KEY = "efcourse.theme";

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  var completed = load(STORE_KEY, []);
  function isDone(id) { return completed.indexOf(id) !== -1; }
  function setDone(id, done) {
    completed = completed.filter(function (x) { return x !== id; });
    if (done) completed.push(id);
    save(STORE_KEY, completed);
  }

  var body = document.body;
  var root = body.getAttribute("data-root") || "";
  var currentId = parseInt(body.getAttribute("data-lesson") || "0", 10);

  function href(lesson) { return root + "lessons/" + lesson.slug + ".html"; }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- Theme ---------- */
  var savedTheme = load(THEME_KEY, null);
  if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  /* ---------- Top bar ---------- */
  function buildTopbar() {
    var bar = el("header", { "class": "topbar" });
    bar.innerHTML =
      '<button type="button" class="icon-btn" id="menu-btn" aria-label="Toggle lesson menu">☰</button>' +
      '<a class="brand" href="' + root + 'index.html"><span class="logo">EF</span><span>EF Core Optimization</span></a>' +
      '<span class="spacer"></span>' +
      '<span class="progress-pill" id="progress-pill"></span>' +
      '<button type="button" class="icon-btn" id="theme-btn" aria-label="Toggle dark mode"></button>';
    var skip = body.querySelector(".skip-link");      // keep the skip link as the first focusable element
    body.insertBefore(bar, skip ? skip.nextSibling : body.firstChild);
    var themeBtn = bar.querySelector("#theme-btn");
    function paint() { themeBtn.textContent = currentTheme() === "dark" ? "☀ Light" : "☾ Dark"; }
    paint();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      save(THEME_KEY, next);
      paint();
    });
    var menuBtn = bar.querySelector("#menu-btn");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-controls", "sidebar");
    menuBtn.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function updateProgressPill() {
    var pill = document.getElementById("progress-pill");
    if (pill) pill.textContent = completed.length + " / " + LESSONS.length + " lessons completed";
  }

  /* ---------- Sidebar ---------- */
  function buildSidebar() {
    var nav = document.getElementById("sidebar");
    if (!nav) return;
    var prevSearch = document.getElementById("course-search");
    var prevQuery = prevSearch ? prevSearch.value : "";
    var html = '<div class="search" role="search">' +
      '<label class="sr-only" for="course-search">Search the course</label>' +
      '<input id="course-search" type="search" autocomplete="off" placeholder="Search lessons…  ( / )" aria-controls="search-results">' +
      '<div id="search-results" class="search-results" hidden></div></div>' +
      '<a class="lesson-link" href="' + root + 'index.html"><span class="num">⌂</span><span>Course home</span></a>';
    LEVELS.forEach(function (lv) {
      html += '<div class="level-title"><span class="dot" style="background:var(--lvl-' + lv.id + ')"></span>' +
        'Level ' + lv.id + ' · ' + lv.name + '</div>';
      LESSONS.filter(function (l) { return l.level === lv.id; }).forEach(function (l) {
        var cls = "lesson-link" + (l.id === currentId ? " active" : "") + (isDone(l.id) ? " done" : "");
        html += '<a class="' + cls + '" href="' + href(l) + '"><span class="num">' + (isDone(l.id) ? "✓" : l.id) + '</span><span>' + esc(l.title) + '</span></a>';
      });
    });
    nav.innerHTML = html;
    if (prevQuery) document.getElementById("course-search").value = prevQuery;
    wireSearch();
    var active = nav.querySelector(".active");
    if (active) {
      active.setAttribute("aria-current", "page");
      // Scroll only the sidebar (scrollIntoView would also scroll the page)
      nav.scrollTop = Math.max(0, active.offsetTop - nav.clientHeight / 2);
    }
  }

  /* ---------- Full-text search ---------- */
  var searchLoading = null;
  function loadSearchIndex() {
    if (window.EF_SEARCH_INDEX) return Promise.resolve(window.EF_SEARCH_INDEX);
    if (!searchLoading) {
      searchLoading = new Promise(function (resolve) {
        var sc = document.createElement("script");
        sc.src = root + "assets/js/search-index.js";
        sc.onload = function () { resolve(window.EF_SEARCH_INDEX || []); };
        sc.onerror = function () { resolve([]); };
        document.head.appendChild(sc);
      });
    }
    return searchLoading;
  }

  function searchIndex(index, query) {
    var terms = query.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!terms.length) return [];
    var results = [];
    index.forEach(function (e) {
      var text = e.x.toLowerCase(), head = e.h.toLowerCase(), title = e.t.toLowerCase(), score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var inText = text.indexOf(t) !== -1, inHead = head.indexOf(t) !== -1, inTitle = title.indexOf(t) !== -1;
        if (!inText && !inHead && !inTitle) return;          // every term must match
        score += (inHead ? 8 : 0) + (inTitle ? 4 : 0) + Math.min(text.split(t).length - 1, 5);
      }
      results.push({ e: e, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score || a.e.l - b.e.l; });
    return results.slice(0, 12);
  }

  function snippet(text, term) {
    var lower = text.toLowerCase(), t = term.toLowerCase();
    var i = lower.indexOf(t);
    var start = Math.max(0, i - 50), stop = Math.min(text.length, start + 150);
    var piece = text.slice(start, stop), out = "", pos = 0, lp = piece.toLowerCase();
    // Highlight on raw text, escape each segment (never regex over escaped HTML)
    if (t.length > 1) {
      for (var j = lp.indexOf(t); j !== -1; j = lp.indexOf(t, pos)) {
        out += esc(piece.slice(pos, j)) + "<mark>" + esc(piece.slice(j, j + t.length)) + "</mark>";
        pos = j + t.length;
      }
    }
    out += esc(piece.slice(pos));
    return (start > 0 ? "…" : "") + out + (stop < text.length ? "…" : "");
  }

  function wireSearch() {
    var input = document.getElementById("course-search");
    var box = document.getElementById("search-results");
    if (!input || !box) return;
    var timer = null;
    function run() {
      var q = input.value.trim();
      if (q.length < 2) { box.hidden = true; box.innerHTML = ""; return; }
      loadSearchIndex().then(function (index) {
        var res = searchIndex(index, q);
        var first = q.split(/\s+/).filter(function (t) { return t.length > 1; })[0] || q;
        box.innerHTML = res.length
          ? res.map(function (r) {
              var e = r.e;
              return '<a class="search-hit" href="' + root + "lessons/" + e.s + ".html" + (e.a ? "#" + e.a : "") + '">' +
                '<span class="hit-title">' + e.l + ". " + esc(e.t) + (e.h && e.h !== "Introduction" ? " › " + esc(e.h) : "") + "</span>" +
                '<span class="hit-snippet">' + snippet(e.x, first) + "</span></a>";
            }).join("")
          : '<p class="no-hits">No matches. Try fewer or different words.</p>';
        box.hidden = false;
      });
    }
    input.addEventListener("focus", loadSearchIndex);
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; run(); input.blur(); }
      if (e.key === "Enter") { var hit = box.querySelector(".search-hit"); if (hit) location.href = hit.href; }
      if (e.key === "ArrowDown") { var h = box.querySelector(".search-hit"); if (h) { e.preventDefault(); h.focus(); } }
    });
    box.addEventListener("keydown", function (e) {
      var hits = Array.prototype.slice.call(box.querySelectorAll(".search-hit"));
      var i = hits.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && i < hits.length - 1) { e.preventDefault(); hits[i + 1].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? hits[i - 1] : input).focus(); }
      if (e.key === "Escape") { input.focus(); }
    });
    if (window.__efSlashBound) return;      // wireSearch runs on every sidebar rebuild
    window.__efSlashBound = true;
    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      var input = document.getElementById("course-search");
      if (!input) return;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !document.querySelector(".ai-backdrop:not([hidden])")) {
        e.preventDefault();
        body.classList.add("nav-open");
        input.focus();
      }
    });
  }

  /* ---------- Lesson header meta ---------- */
  function decorateLesson() {
    var lesson = LESSONS.filter(function (l) { return l.id === currentId; })[0];
    if (!lesson) return;
    var lv = LEVELS[lesson.level - 1];
    var meta = document.querySelector("article .meta");
    if (meta) {
      meta.insertAdjacentHTML("afterbegin",
        '<span class="badge lvl-' + lv.id + '">Level ' + lv.id + ' · ' + lv.name + '</span>' +
        '<span class="badge">Lesson ' + lesson.id + ' of ' + LESSONS.length + '</span>');
    }

    // Completion box
    var article = document.querySelector("article");
    var box = el("div", { "class": "complete-box" });
    article.appendChild(box);
    function paint() {
      var done = isDone(lesson.id);
      box.innerHTML = done
        ? '<p>Nice work, you\'ve completed this lesson.</p><button type="button" class="btn done" id="complete-btn">✓ Completed (click to undo)</button>'
        : '<p>Finished the reading, the exercise and the quiz?</p><button type="button" class="btn" id="complete-btn">Mark lesson as complete</button>';
      box.querySelector("#complete-btn").addEventListener("click", function () {
        setDone(lesson.id, !isDone(lesson.id));
        paint(); buildSidebar(); updateProgressPill();
      });
    }
    paint();

    // Pager
    var pager = document.getElementById("pager");
    if (pager) {
      var prev = LESSONS[lesson.id - 2], next = LESSONS[lesson.id];
      pager.innerHTML =
        (prev ? '<a class="prev" href="' + href(prev) + '"><small>← Previous</small>' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="next" href="' + href(next) + '"><small>Next →</small>' + esc(next.title) + '</a>'
              : '<a class="next" href="' + root + 'index.html"><small>Finished!</small>Back to course home</a>');
    }
    document.title = lesson.title + " · EF Core Optimization Course";
  }

  /* ---------- Home page ---------- */
  function buildHome() {
    var host = document.getElementById("curriculum");
    if (!host) return;
    var html = "";
    LEVELS.forEach(function (lv) {
      var lessons = LESSONS.filter(function (l) { return l.level === lv.id; });
      var done = lessons.filter(function (l) { return isDone(l.id); }).length;
      html += '<section class="level-card"><header>' +
        '<span class="badge lvl-' + lv.id + '">Level ' + lv.id + '</span>' +
        '<h2>' + lv.name + ' · ' + lv.subtitle + '</h2>' +
        '<div class="bar" title="' + done + ' of ' + lessons.length + ' done"><span style="width:' + (100 * done / lessons.length) + '%"></span></div>' +
        '<small style="color:var(--muted)">' + done + '/' + lessons.length + '</small></header>' +
        '<p class="desc"><b>🎯 Goal:</b> ' + lv.goal + '<br>' + lv.desc + '</p><div class="lesson-grid">';
      lessons.forEach(function (l) {
        html += '<a class="lesson-card' + (isDone(l.id) ? " done" : "") + '" href="' + href(l) + '">' +
          '<span class="n">Lesson ' + l.id + '</span><span class="t">' + esc(l.title) + '</span><span class="s">' + esc(l.summary) + '</span></a>';
      });
      html += "</div></section>";
    });
    host.innerHTML = html;

    var resume = document.getElementById("resume-btn");
    if (resume) {
      var nextLesson = LESSONS.filter(function (l) { return !isDone(l.id); })[0];
      if (completed.length && nextLesson) { resume.href = href(nextLesson); resume.textContent = "Continue: Lesson " + nextLesson.id + " →"; }
      else if (!nextLesson) { resume.href = href(LESSONS[0]); resume.textContent = "Course complete. Review from the start"; }
      else { resume.href = href(LESSONS[0]); }
    }
    var reset = document.getElementById("reset-btn");
    if (reset) reset.addEventListener("click", function () {
      if (confirm("Reset your course progress?")) { completed = []; save(STORE_KEY, completed); buildHome(); updateProgressPill(); }
    });
  }

  /* ---------- Quizzes ---------- */
  function wireQuizzes() {
    document.querySelectorAll(".quiz").forEach(function (quiz) {
      var answer = quiz.getAttribute("data-answer");
      var q = quiz.querySelector(".q");
      var opts = quiz.querySelector(".opts");
      if (q && opts) {
        q.id = q.id || "q-" + Math.random().toString(36).slice(2, 9);
        opts.setAttribute("role", "group");
        opts.setAttribute("aria-labelledby", q.id);
      }
      var exp = quiz.querySelector(".explain");
      if (exp) exp.setAttribute("aria-live", "polite");
      quiz.querySelectorAll("button.opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (quiz.classList.contains("answered")) return;
          quiz.classList.add("answered");
          quiz.querySelectorAll("button.opt").forEach(function (b) {
            b.disabled = true;
            if (b.getAttribute("data-opt") === answer) b.classList.add("correct");
          });
          if (btn.getAttribute("data-opt") !== answer) btn.classList.add("wrong");
          btn.setAttribute("aria-pressed", "true");
          var ex = quiz.querySelector(".explain");
          if (ex) ex.insertAdjacentHTML("afterbegin", btn.getAttribute("data-opt") === answer ? "<b>Correct.</b> " : "<b>Not quite.</b> ");
        });
      });
    });
  }

  /* ---------- Clipboard (with fallback for non-secure contexts) ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }
  window.EFCourseCopy = copyText;

  /* ---------- Code blocks ---------- */
  function wireCode() {
    document.querySelectorAll("pre > code").forEach(function (code) {
      if (window.hljs) { try { window.hljs.highlightElement(code); } catch (e) { /* ignore */ } }
      var pre = code.parentElement;
      var btn = el("button", { "class": "copy-btn", type: "button" }, "Copy");
      btn.addEventListener("click", function () {
        var text = code.innerText;
        var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1400); };
        copyText(text).then(done, function () { btn.textContent = "Copy failed"; });
      });
      pre.appendChild(btn);
    });
  }

  /* ---------- Heading anchors ---------- */
  function addAnchors() {
    var hashTarget = location.hash ? location.hash.slice(1) : "";
    var existedBefore = !!(hashTarget && document.getElementById(hashTarget));
    var used = {};
    document.querySelectorAll("article h2, article h3").forEach(function (h) {
      if (h.id) { used[h.id] = true; return; }
      var base = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
      if (!/^[a-z]/.test(base)) base = "s-" + base;   // same rule as build.py: ids start with a letter
      var id = base, n = 2;
      while (used[id] || document.getElementById(id)) id = base + "-" + n++;   // keep ids unique
      used[id] = true;
      h.id = id;
    });
    // Lesson headings get ids at build time, so the browser already jumped to the hash.
    // Only scroll when the target id was created here (e.g. on the home page).
    if (hashTarget && !existedBefore) {
      var target = document.getElementById(hashTarget);
      if (target) target.scrollIntoView({ behavior: "auto" });
    }
  }

  window.EFCourse = {
    lesson: LESSONS.filter(function (l) { return l.id === currentId; })[0] || null,
    levels: LEVELS,
    root: root
  };

  buildTopbar();
  addAnchors();
  buildSidebar();
  decorateLesson();
  buildHome();
  updateProgressPill();
  wireQuizzes();
  wireCode();
  document.addEventListener("click", function (e) {
    if (body.classList.contains("nav-open") && !e.target.closest("#sidebar") && !e.target.closest("#menu-btn")) body.classList.remove("nav-open");
  });
})();
