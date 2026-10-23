# EF Core Optimization Course

A self-paced, browser-based course on **configuring and optimizing Entity Framework Core**, from beginner to expert, with a built-in AI tutor. It targets **EF Core 10 (LTS)**, and almost everything also applies to EF Core 8 and 9. Content was last reviewed in **October 2026**.

- **Live site:** https://johanccs.github.io/EF-Core-optim/
- **Locally:** open `index.html` in a browser. You don't need a server.

## Course goal

The goal is to **learn**: to configure EF Core correctly in any environment, explain what it does and what SQL it generates, diagnose slow data access with real measurements, and fix it with the right technique. Every lesson opens with a **🎯 Goal of this lesson** section explaining what you'll achieve and why it matters, and closes with **🔑 Key takeaways**, a hands-on exercise and a quiz.

## Curriculum

| Level | Lessons |
|---|---|
| **1 · Beginner** | 1 How EF Core works · 2 Setup, configuration & logging SQL · 3 Modeling fundamentals · 4 Querying fundamentals |
| **2 · Configuration** | 5 DbContext configuration in depth · 6 Connection strings, secrets & pooling · 7 Provider-specific configuration · 8 Model configuration at scale · 9 Environments, testing & configuration safety |
| **3 · Intermediate** | 10 Tracking vs no-tracking · 11 Projections · 12 Loading related data & N+1 · 13 Pagination (offset vs keyset) · 14 Indexes & migrations |
| **4 · Advanced** | 15 Split queries & cartesian explosion · 16 Efficient saving & bulk operations · 17 Concurrency, transactions & resiliency · 18 Raw SQL, views & stored procedures · 19 Diagnosing performance problems |
| **5 · Expert** | 20 DbContext pooling · 21 Query caching, parameters & compiled queries · 22 Compiled models, startup & Native AOT · 23 Advanced mapping · 24 Interceptors, query filters & conventions · 25 Benchmarking & production checklist (plus capstone) |

Every lesson contains: goal and objectives, explanations with the SQL EF Core generates, bad-vs-good comparisons, key takeaways, an exercise with a solution, a 3-question quiz, and links to the official documentation.

## Features

- **Full-text search** across all lessons (press <kbd>/</kbd>).
- **Progress tracking** stored in your browser.
- **Light and dark themes** that follow your OS setting.
- Works on **phones**, and **prints** cleanly.
- **Accessible**: WCAG 2.1 AA checked automatically in both themes. Keyboard navigable, with a skip link and screen-reader labels.
- **✨ AI tutor**: select text, right-click, and ask (see below).
- **🧪 Lab** (`lab.html`): compare EF Core approaches side by side (see below).
- **▶ Playground** (`playground/`): write and run real EF Core 10 code in your browser (see below).

## 🧪 Lab: compare approaches

The [Lab](https://johanccs.github.io/EF-Core-optim/lab.html) has six scenarios, each linked to its lesson: N+1, cartesian explosion, tracking, offset vs keyset paging, inserting many rows, and updating many rows. For each approach it shows:

- the C# code and the **real SQL EF Core 10 generates** for SQL Server. The SQL is produced by `tools/lab-sql`, which runs EF Core's SQL Server provider with execution suppressed, so no database is needed.
- round trips, rows the database reads, rows returned and data moved;
- an **estimated** time, split into network, database, transfer and EF Core processing, for the data size and network you choose.

The estimates come from a deliberately simple, documented cost model. Every constant is listed on the page under "How the estimate works". They show which cost dominates and how approaches compare. They don't predict production timings.

Deep link to a scenario with `lab.html?scenario=<id>`, where `<id>` is `n-plus-one`, `cartesian`, `tracking`, `paging`, `inserts` or `updates`.

## ▶ Playground: real EF Core in your browser

The [Playground](https://johanccs.github.io/EF-Core-optim/playground/) runs **real EF Core 10** with **SQLite** compiled to WebAssembly, and the **Roslyn C# compiler**, entirely in the browser. You don't install anything and no server is involved.

- 13 runnable examples linked to their lessons, plus a blank template. `db` is the course's `ShopContext`, seeded with deterministic data in three sizes.
- **Output** shows console output, `.Dump()` tables, EF Core warnings and runtime errors. Compile errors point at your own line and column.
- **SQL** lists every command EF Core sent, with parameters and duration. The summary counts round trips and tracked entities.
- **Model** shows the entity classes and configuration.
- Ctrl+Enter runs the code. Tab indents; press Esc then Tab to leave the editor. Drafts are saved per example. `playground/?example=<id>` deep-links to an example.

Because it runs on SQLite, some SQL differs from SQL Server. For example, SQLite has no decimal type, so EF Core compares decimals with `ef_compare()`. The SQLite provider also doesn't batch `SaveChanges` commands. The playground notes this where it matters.

The first visit downloads about 10 MB (.NET runtime, EF Core, SQLite, the compiler), which the browser caches. GitHub Pages can't negotiate Brotli compression, so the site keeps only precompressed `.br` runtime files, and `playground/js/start.js` decompresses them in the browser using Google's Brotli decoder (MIT licence, vendored).

## ✨ AI tutor (OpenAI)

Select any text on a page and **right-click it**, or click the floating **✨ Ask AI** button, to open a question form. You can also use **✨ Ask AI** in the top bar to ask about the current lesson. Shift + right-click still opens the browser's normal menu.

**Setup:** click **⚙** in the AI window, paste your OpenAI API key, then click **Test connection**. Use **Load my models** to pick from the models your key can access. The default is `gpt-6-sol`.

What the assistant does for accuracy:

- Uses the OpenAI **Responses API** with a tutor prompt focused on EF Core 10 accuracy. It's told never to invent APIs, to name the EF version when behaviour differs, to flag course text that looks wrong or outdated, and to say when it's unsure.
- Sends the **lesson context** with each question: the lesson title and goal, the section heading, the selected passage and its surrounding paragraph.
- Optionally **verifies answers with web search** and lists the **sources** it cited. This is on by default.
- Has a configurable **reasoning effort**, and falls back gracefully when a model doesn't support an option.
- Supports follow-up questions in the same conversation.

**Security notes:**

- The key is stored **only in your browser** (localStorage, or sessionStorage if "remember" is off) and is sent only to the configured API base URL. It is never written to this repository. Don't commit keys.
- Anyone using the same browser profile can read the key. Create a dedicated key with a **spending limit**.
- If the site is public, **don't distribute a key**. Each visitor uses their own, or you point **Advanced → API base URL** at your own backend proxy that holds the key server-side.
- Requests are sent with `store: false`. Answers are rendered through DOMPurify, and every page ships a Content-Security-Policy.

## Publishing with GitHub Pages

The site is served straight from the **`main` branch**: changes are pushed directly to `main`, and every push publishes automatically. There are no GitHub Actions workflows. The generated pages in `lessons/` are committed alongside their sources, so before you push, run the [quality checks](#quality-checks) and commit what `python3 build.py` regenerates.

Pages setting: **Settings → Pages → Source: Deploy from a branch → `main` / (root)**.

### Versioning

The version appears in the top bar of every page. On each release, bump `VERSION` in `assets/js/course.js` and `version` in `package.json` together (the tests check they match): patch for fixes, minor for new features or lessons, major for a course restructure.

## Development

```
index.html               course home page
404.html                 not-found page (GitHub Pages)
lessons/*.html           generated lesson pages (don't edit by hand)
src/lessons/*.html       lesson sources
assets/css/course.css    styles and design tokens (light/dark, WCAG AA contrast)
assets/js/course.js      navigation, search, progress, quizzes, copy buttons
assets/js/ai-assistant.js  right-click AI tutor (OpenAI Responses API)
assets/js/search-index.js  generated full-text search index
assets/js/theme-init.js  applies the saved theme and lesson menu size before first paint
build.py                 builds src/lessons → lessons + search index
lab.html                 the Lab (simulator) page
assets/js/lab.js         Lab scenarios and cost model
assets/js/lab-data.js    generated: real EF Core 10 SQL for each Lab approach
assets/css/lab.css       Lab styles (validated chart palette)
tools/lab-sql/           console app that generates lab-data.js with EF Core's SQL Server provider
src/playground/          Playground source (Blazor WebAssembly, EF Core 10, SQLite, Roslyn)
playground/              generated: the built Playground served by GitHub Pages (don't edit by hand)
build_playground.py      publishes src/playground into playground/ and optimizes it for GitHub Pages
tests/run-tests.mjs      end-to-end, accessibility, AI tutor, Lab and Playground tests
```

### Rebuilding the Lab SQL and the Playground

Both need the [.NET 10 SDK](https://dotnet.microsoft.com/download). The Playground also needs the WebAssembly build tools:

```bash
dotnet workload install wasm-tools

dotnet run --project tools/lab-sql -- "$PWD"   # regenerate assets/js/lab-data.js (run from the repository root)
python3 build_playground.py                    # rebuild playground/ (prints the output size)
```

Only rebuild `playground/` when `src/playground` changes. Each rebuild commits about 15 MB of generated files, so avoid unnecessary rebuilds to keep the repository history small.

### Editing a lesson

Edit the file in `src/lessons/`, then run `python3 build.py`. Sources are plain HTML with three shortcuts: fenced code blocks (`` ```csharp ``), inline `` `code` ``, and `:::quiz` blocks (see the docstring in `build.py`). The build also adds heading anchors, accessible table markup, meta descriptions and the search index. To add a lesson, create a new source file and add an entry to the `LESSONS` array in `assets/js/course.js`.

### Quality checks

```bash
python3 build.py                     # regenerate lessons and the search index
npm ci && npx playwright install chromium
npm run validate                     # HTML validation (html-validate)
npm test                             # all pages, links, axe WCAG 2.1 AA (light and dark), search, progress, AI tutor (mocked), Lab, Playground (real EF Core run), 404
```

There's no CI, so run these before every push. After `python3 build.py`, `git status` should show no changes under `lessons/` or `assets/js/search-index.js` that you haven't committed.

### Content review process

Each review checks lessons against the official EF Core release notes and documentation, reviews every C# snippet for compile errors, verifies all external links and their anchors, and re-runs the automated checks. The last review was October 2026, against EF Core 10.

## Sources

The course content is based on the official documentation below, the EF Core 7–10 release notes, and established community practice. Each lesson's **Further reading** section links to the pages relevant to it.

### EF Core release notes and reference (used to verify version-specific facts)

- [What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew)
- [What's new in EF Core 9](https://learn.microsoft.com/ef/core/what-is-new/ef-core-9.0/whatsnew)
- [Breaking changes in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/breaking-changes)
- [EF Core performance documentation](https://learn.microsoft.com/ef/core/performance/)
- [EF Core metrics](https://learn.microsoft.com/ef/core/logging-events-diagnostics/metrics)
- [MSBuild integration (compiled models)](https://learn.microsoft.com/ef/core/cli/msbuild)
- [EF Core docs: parameterized collections changes (GitHub PR)](https://github.com/dotnet/EntityFramework.Docs/pull/5163)
- [Npgsql EF Core provider 10.0 release notes](https://www.npgsql.org/efcore/release-notes/10.0.html)
- [Oracle EF Core 10 features](https://docs.oracle.com/en/database/oracle/oracle-database/26/odpnt/EFCore10features.html)

### Microsoft Learn: EF Core

- [Microsoft Learn: EF Core performance overview](https://learn.microsoft.com/ef/core/performance/) (Lessons 1, 25)
- [How queries work](https://learn.microsoft.com/ef/core/querying/how-query-works) (Lesson 1)
- [What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew) (Lessons 1, 16, 21)
- [DbContext lifetime, configuration and initialization](https://learn.microsoft.com/ef/core/dbcontext-configuration/) (Lessons 2, 5)
- [Simple logging](https://learn.microsoft.com/ef/core/logging-events-diagnostics/simple-logging) (Lesson 2)
- [Connection strings](https://learn.microsoft.com/ef/core/miscellaneous/connection-strings) (Lessons 2, 6)
- [Creating and configuring a model](https://learn.microsoft.com/ef/core/modeling/) (Lessons 3, 8)
- [Model bulk configuration (ConfigureConventions)](https://learn.microsoft.com/ef/core/modeling/bulk-configuration) (Lessons 3, 8)
- [Relationships](https://learn.microsoft.com/ef/core/modeling/relationships) (Lesson 3)
- [Client vs server evaluation](https://learn.microsoft.com/ef/core/querying/client-eval) (Lesson 4)
- [Efficient querying](https://learn.microsoft.com/ef/core/performance/efficient-querying) (Lesson 4)
- [Asynchronous programming](https://learn.microsoft.com/ef/core/miscellaneous/async) (Lesson 4)
- [Design-time DbContext creation](https://learn.microsoft.com/ef/core/cli/dbcontext-creation) (Lesson 5)
- [Using a separate migrations project](https://learn.microsoft.com/ef/core/managing-schemas/migrations/projects) (Lesson 5)
- [SQL Server provider](https://learn.microsoft.com/ef/core/providers/sql-server/) (Lesson 7)
- [SQLite provider limitations](https://learn.microsoft.com/ef/core/providers/sqlite/limitations) (Lesson 7)
- [Migrations with multiple providers](https://learn.microsoft.com/ef/core/managing-schemas/migrations/providers) (Lesson 7)
- [Data seeding](https://learn.microsoft.com/ef/core/modeling/data-seeding) (Lesson 8)
- [Generated values](https://learn.microsoft.com/ef/core/modeling/generated-properties) (Lesson 8)
- [Testing EF Core applications](https://learn.microsoft.com/ef/core/testing/) (Lesson 9)
- [Choosing a testing strategy](https://learn.microsoft.com/ef/core/testing/choosing-a-testing-strategy) (Lesson 9)
- [Tracking vs. no-tracking queries](https://learn.microsoft.com/ef/core/querying/tracking) (Lesson 10)
- [Change tracking in EF Core](https://learn.microsoft.com/ef/core/change-tracking/) (Lesson 10)
- [Efficient querying: project only properties you need](https://learn.microsoft.com/ef/core/performance/efficient-querying#project-only-properties-you-need) (Lesson 11)
- [Complex query operators](https://learn.microsoft.com/ef/core/querying/complex-query-operators) (Lesson 11)
- [Loading related data](https://learn.microsoft.com/ef/core/querying/related-data/) (Lesson 12)
- [Beware of lazy loading](https://learn.microsoft.com/ef/core/performance/efficient-querying#beware-of-lazy-loading) (Lesson 12)
- [Microsoft Learn: Pagination](https://learn.microsoft.com/ef/core/querying/pagination) (Lesson 13)
- [Indexes](https://learn.microsoft.com/ef/core/modeling/indexes) (Lesson 14)
- [Applying migrations](https://learn.microsoft.com/ef/core/managing-schemas/migrations/applying) (Lesson 14)
- [Single vs. split queries](https://learn.microsoft.com/ef/core/querying/single-split-queries) (Lesson 15)
- [Efficient updating](https://learn.microsoft.com/ef/core/performance/efficient-updating) (Lesson 16)
- [ExecuteUpdate and ExecuteDelete](https://learn.microsoft.com/ef/core/saving/execute-insert-update-delete) (Lesson 16)
- [Handling concurrency conflicts](https://learn.microsoft.com/ef/core/saving/concurrency) (Lesson 17)
- [Using transactions](https://learn.microsoft.com/ef/core/saving/transactions) (Lesson 17)
- [Connection resiliency](https://learn.microsoft.com/ef/core/miscellaneous/connection-resiliency) (Lesson 17)
- [SQL queries](https://learn.microsoft.com/ef/core/querying/sql-queries) (Lesson 18)
- [Keyless entity types](https://learn.microsoft.com/ef/core/modeling/keyless-entity-types) (Lesson 18)
- [User-defined function mapping](https://learn.microsoft.com/ef/core/querying/user-defined-function-mapping) (Lesson 18)
- [Performance diagnosis](https://learn.microsoft.com/ef/core/performance/performance-diagnosis) (Lesson 19)
- [EF Core metrics](https://learn.microsoft.com/ef/core/logging-events-diagnostics/metrics) (Lesson 19)
- [Query tags](https://learn.microsoft.com/ef/core/querying/tags) (Lesson 19)
- [Advanced performance topics: DbContext pooling](https://learn.microsoft.com/ef/core/performance/advanced-performance-topics#dbcontext-pooling) (Lesson 20)
- [Compiled queries](https://learn.microsoft.com/ef/core/performance/advanced-performance-topics#compiled-queries) (Lesson 21)
- [Dynamically-constructed queries](https://learn.microsoft.com/ef/core/performance/advanced-performance-topics#dynamically-constructed-queries) (Lesson 21)
- [Compiled models](https://learn.microsoft.com/ef/core/performance/advanced-performance-topics#compiled-models) (Lesson 22)
- [Native AOT and precompiled queries](https://learn.microsoft.com/ef/core/performance/nativeaot-and-precompiled-queries) (Lesson 22)
- [What's new in EF Core 9](https://learn.microsoft.com/ef/core/what-is-new/ef-core-9.0/whatsnew) (Lesson 22)
- [Modeling for performance](https://learn.microsoft.com/ef/core/performance/modeling-for-performance) (Lesson 23)
- [Inheritance](https://learn.microsoft.com/ef/core/modeling/inheritance) (Lesson 23)
- [Complex types](https://learn.microsoft.com/ef/core/modeling/complex-types) (Lesson 23)
- [Table splitting](https://learn.microsoft.com/ef/core/modeling/table-splitting) (Lesson 23)
- [Interceptors](https://learn.microsoft.com/ef/core/logging-events-diagnostics/interceptors) (Lesson 24)
- [Global query filters](https://learn.microsoft.com/ef/core/querying/filters) (Lesson 24)
- [Custom conventions](https://learn.microsoft.com/ef/core/modeling/bulk-configuration#conventions) (Lesson 24)

### Microsoft Learn: .NET, ASP.NET Core and SQL Server

- [Options pattern in .NET](https://learn.microsoft.com/dotnet/core/extensions/options) (Lesson 5)
- [SqlClient connection string syntax](https://learn.microsoft.com/sql/connect/ado-net/connection-string-syntax) (Lesson 6)
- [SQL Server connection pooling](https://learn.microsoft.com/sql/connect/ado-net/sql-server-connection-pooling) (Lesson 6)
- [Safe storage of app secrets in development](https://learn.microsoft.com/aspnet/core/security/app-secrets) (Lesson 6)
- [Integration tests in ASP.NET Core](https://learn.microsoft.com/aspnet/core/test/integration-tests) (Lesson 9)
- [Health checks in ASP.NET Core](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks) (Lesson 9)
- [SQL Server Query Store](https://learn.microsoft.com/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store) (Lesson 19)

### Providers, tools and books

- [Npgsql connection string parameters](https://www.npgsql.org/doc/connection-string-parameters.html) (Lesson 6)
- [Npgsql EF Core provider](https://www.npgsql.org/efcore/) (Lesson 7)
- [Npgsql: Date and time handling](https://www.npgsql.org/doc/types/datetime.html) (Lesson 7)
- [Testcontainers for .NET](https://dotnet.testcontainers.org/) (Lessons 9, 25)
- [Use The Index, Luke: No offset](https://use-the-index-luke.com/no-offset) (Lesson 13)
- [Use The Index, Luke (free SQL indexing book)](https://use-the-index-luke.com/) (Lesson 14)
- [BenchmarkDotNet](https://benchmarkdotnet.org/) (Lesson 25)
- [BenchmarkDotNet](https://benchmarkdotnet.org/articles/overview.html) (Lesson 25)
- [k6 load testing](https://grafana.com/docs/k6/latest/) (Lesson 25)
- [EF Core on GitHub](https://github.com/dotnet/efcore) (Lesson 25)

### Community articles consulted during research

These are secondary sources, cross-checked against the official documentation before anything was included.

- [Milan Jovanović: EF Core performance guide](https://milanjovanovic.tech/blog/ef-core-performance-guide)
- [elmah.io: EF Core 10's faster production queries](https://blog.elmah.io/new-in-net-10-and-c-14-ef-core-10s-faster-production-queries/)
- [SSW Rules: Optimize EF Core queries](https://www.ssw.com.au/rules/optimize-ef-core-queries)
- [OneUptime: How to optimize EF Core queries](https://oneuptime.com/blog/post/2026-01-28-optimize-entity-framework-core-queries/view)
- [Adaptive Web Hosting: EF Core performance patterns](https://adaptivewebhosting.com/blog/entity-framework-core-performance-patterns) (vendor article; its benchmark figures weren't used)
- [Julia Shevchenko: Swapping database providers in tests on EF Core 9](https://dev.to/juliashevchenko/adding-another-database-provider-for-testing-is-not-working-in-ef-core-9-4gn8)
- [Start Debugging: EF Core 11 RemoveDbContext for test provider swaps](https://startdebugging.net/2026/04/efcore-11-removedbcontext-pooled-factory-test-swap/)

### AI tutor: model and API references

- [OpenAI API changelog](https://developers.openai.com/api/docs/changelog) (Responses API, GPT-6 model family)
- [OpenRouter: OpenAI models](https://openrouter.ai/openai)
- [GPT-5.5 (Wikipedia)](https://en.wikipedia.org/wiki/GPT-5.5)
- [GPT-5.4 (Wikipedia)](https://en.wikipedia.org/wiki/GPT-5.4)
