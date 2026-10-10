# EF Core Optimization Course

A self-paced, browser-based course on **configuring and optimizing Entity Framework Core**, from beginner to expert, with a built-in AI tutor. It targets EF Core 10 (LTS), and almost everything also applies to EF Core 8 and 9.

Open `index.html` in a browser to start. You don't need a server. You can also host the repository with GitHub Pages.

## Course goal

The goal is to **learn**: to configure EF Core correctly in any environment, explain what it does and what SQL it generates, diagnose slow data access with real measurements, and fix it with the right technique. Every lesson opens with a **🎯 Goal of this lesson** section explaining what you'll achieve and why it matters.

## Curriculum

| Level | Lessons |
|---|---|
| **1 · Beginner** | 1 How EF Core works · 2 Setup, configuration & logging SQL · 3 Modeling fundamentals · 4 Querying fundamentals |
| **2 · Configuration** | 5 DbContext configuration in depth · 6 Connection strings, secrets & pooling · 7 Provider-specific configuration · 8 Model configuration at scale · 9 Environments, testing & configuration safety |
| **3 · Intermediate** | 10 Tracking vs no-tracking · 11 Projections · 12 Loading related data & N+1 · 13 Pagination (offset vs keyset) · 14 Indexes & migrations |
| **4 · Advanced** | 15 Split queries & cartesian explosion · 16 Efficient saving & bulk operations · 17 Concurrency, transactions & resiliency · 18 Raw SQL, views & stored procedures · 19 Diagnosing performance problems |
| **5 · Expert** | 20 DbContext pooling · 21 Query caching, parameters & compiled queries · 22 Compiled models, startup & Native AOT · 23 Advanced mapping · 24 Interceptors, query filters & conventions · 25 Benchmarking & production checklist (plus capstone) |

Each lesson has a goal, learning objectives, explanations with the generated SQL, bad-vs-good comparisons, a hands-on exercise with a solution, an interactive quiz, and links to the official docs. Your progress is saved in your browser's localStorage.

## ✨ AI tutor (OpenAI)

Select any text on a page and **right-click it**, or click the floating **✨ Ask AI** button, to open a question form. You can also use **✨ Ask AI** in the top bar to ask about the current lesson. Shift + right-click still opens the browser's normal menu.

**Setup:** click **⚙** in the AI window, paste your OpenAI API key, then click **Test connection**. Use **Load my models** to pick from the models your key can access. The default is `gpt-6-sol`.

What the assistant does for accuracy:

- Uses the OpenAI **Responses API** with a tutor prompt focused on EF Core 10 accuracy. It's told never to invent APIs, to name the EF version when behaviour differs, to flag course text that looks wrong or outdated, and to say when it's unsure.
- Sends the **lesson context** with each question: the lesson title and goal, the section heading, the selected passage and its surrounding paragraph.
- Optionally **verifies answers with web search** and lists the **sources** it cited. This is on by default and can be turned off in settings.
- Has a configurable **reasoning effort**. Higher effort gives more careful answers but is slower.
- Supports follow-up questions in the same conversation.

**Security notes:**

- The key is stored **only in your browser** (localStorage, or sessionStorage if "remember" is off) and is sent only to the configured API base URL. It is never written to this repository. Don't commit keys.
- Anyone using the same browser profile can read the key. Create a dedicated key with a **spending limit**.
- If you host this site for other people, don't distribute a key. Point **Advanced → API base URL** at your own backend proxy that holds the key server-side.
- Requests are sent with `store: false`.

## Project layout

```
index.html            course home page
lessons/*.html        generated lesson pages (don't edit by hand)
src/lessons/*.html    lesson sources
assets/css/course.css shared styles (light/dark theme)
assets/js/course.js   navigation, progress tracking, quizzes, copy buttons
assets/js/ai-assistant.js  right-click "Ask AI" tutor (OpenAI Responses API)
build.py              builds src/lessons → lessons
```

## Editing lessons

Edit the file in `src/lessons/`, then run:

```bash
python3 build.py
```

Lesson sources are plain HTML with three shortcuts: fenced code blocks (`` ```csharp ``), inline `` `code` ``, and `:::quiz` blocks. See the docstring at the top of `build.py`. To add a lesson, create a new source file and add an entry to the `LESSONS` array in `assets/js/course.js`.
