# EF Core Optimization Course

A self-paced, browser-based course on **configuring and optimizing Entity Framework Core**, from beginner to expert. It targets EF Core 10 (LTS), and almost everything also applies to EF Core 8 and 9.

Open `index.html` in a browser to start. You don't need a server. You can also host the repository with GitHub Pages.

## Curriculum

| Level | Lessons |
|---|---|
| **1 · Beginner** | 1 How EF Core works · 2 Setup, configuration & logging SQL · 3 Modeling fundamentals · 4 Querying fundamentals |
| **2 · Intermediate** | 5 Tracking vs no-tracking · 6 Projections · 7 Loading related data & N+1 · 8 Pagination (offset vs keyset) · 9 Indexes & migrations |
| **3 · Advanced** | 10 Split queries & cartesian explosion · 11 Efficient saving & bulk operations · 12 Concurrency, transactions & resiliency · 13 Raw SQL, views & stored procedures · 14 Diagnosing performance problems |
| **4 · Expert** | 15 DbContext pooling · 16 Query caching, parameters & compiled queries · 17 Compiled models, startup & Native AOT · 18 Advanced mapping · 19 Interceptors, query filters & conventions · 20 Benchmarking & production checklist (plus capstone) |

Each lesson has learning objectives, explanations with the generated SQL, bad-vs-good comparisons, a hands-on exercise with a solution, an interactive quiz, and links to the official docs. Your progress is saved in your browser's localStorage.

## Project layout

```
index.html            course home page
lessons/*.html        generated lesson pages (don't edit by hand)
src/lessons/*.html    lesson sources
assets/css/course.css shared styles (light/dark theme)
assets/js/course.js   navigation, progress tracking, quizzes, copy buttons
build.py              builds src/lessons → lessons
```

## Editing lessons

Edit the file in `src/lessons/`, then run:

```bash
python3 build.py
```

Lesson sources are plain HTML with three shortcuts: fenced code blocks (`` ```csharp ``), inline `` `code` ``, and `:::quiz` blocks. See the docstring at the top of `build.py`. To add a lesson, create a new source file and add an entry to the `LESSONS` array in `assets/js/course.js`.
