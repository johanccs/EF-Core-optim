#!/usr/bin/env python3
"""Build the course lesson pages.

Source fragments live in src/lessons/NN-slug.html. Each fragment is plain HTML
with three conveniences that this script expands:

  ```csharp label="Optional label"     fenced code block (content is HTML-escaped)
  ...
  ```

  `inline code`                        becomes <code>inline code</code> (escaped)

  :::quiz b                            multiple-choice question; letter = correct option
  Question text
  a) Option one
  b) Option two
  > Explanation shown after answering
  :::

Run:  python3 build.py
Output: lessons/NN-slug.html
"""
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "lessons"
OUT = ROOT / "lessons"

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · EF Core Optimization Course</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="article">
<link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/course.css">
<script src="../assets/js/theme-init.js"></script>
</head>
<body data-lesson="{num}" data-root="../">
<a class="skip-link" href="#main">Skip to content</a>
<div class="layout">
<nav id="sidebar" aria-label="Lessons"></nav>
<main class="content" id="main">
<noscript><p class="callout warn">Navigation, quizzes and progress tracking need JavaScript. The lesson text below still works without it.</p></noscript>
<article>
{body}
<p class="reviewed">Last reviewed {reviewed} against EF Core 10 (LTS). Spotted an error? Select it, right-click, and ask the AI tutor to double-check it, or open an issue in the repository.</p>
</article>
<nav id="pager" aria-label="Lesson navigation"></nav>
</main>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="../assets/js/course.js"></script>
<script src="../assets/js/ai-assistant.js"></script>
</body>
</html>
"""

REVIEWED = "October 2026"
CSP = ("default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
       "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https:; font-src 'self'; "
       "object-src 'none'; base-uri 'self'; form-action 'none'")
HEADING = re.compile(r"<(h[23])((?:\s[^>]*)?)>(.*?)</\1>", re.S)


def text_of(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def slugify(fragment: str) -> str:
    # Must match the slug logic in assets/js/course.js (addAnchors)
    slug = re.sub(r"[^a-z0-9]+", "-", text_of(fragment).lower()).strip("-") or "section"
    return slug if slug[0].isalpha() else "s-" + slug      # ids must start with a letter


def add_heading_ids(body: str) -> str:
    used = set()

    def rep(m):
        tag, attrs, inner = m.group(1), m.group(2) or "", m.group(3)
        if "id=" in attrs:
            return m.group(0)
        base = slugify(inner)
        hid, n = base, 2
        while hid in used:
            hid, n = f"{base}-{n}", n + 1
        used.add(hid)
        return f'<{tag}{attrs} id="{hid}">{inner}</{tag}>'

    return HEADING.sub(rep, body)


def search_sections(body: str):
    """Split a rendered lesson into (anchor, heading, text) sections for the search index."""
    sections, last = [], 0
    marks = [(m.start(), m.group(3), re.search(r'id="([^"]+)"', m.group(2) or "")) for m in HEADING.finditer(body) if m.group(1) == "h2"]
    intro_end = marks[0][0] if marks else len(body)
    sections.append(("", "Introduction", text_of(body[:intro_end])))
    for i, (start, inner, idm) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
        sections.append((idm.group(1) if idm else "", text_of(inner), text_of(body[start:end])))
    return sections

FENCE = re.compile(r"^```(\w+)?(?:[ \t]+label=\"([^\"]*)\")?[ \t]*\n(.*?)^```[ \t]*$", re.S | re.M)
QUIZ = re.compile(r"^:::quiz[ \t]+([a-e])[ \t]*\n(.*?)^:::[ \t]*$", re.S | re.M)
INLINE = re.compile(r"`([^`\n]+)`")


TABLE = re.compile(r"<table>(.*?)</table>", re.S)


def normalize_table(m):
    """Accessible tables: header row in <thead> with scope="col", body rows in <tbody>."""
    rows = re.findall(r"<tr>.*?</tr>", m.group(1), re.S)
    if not rows or "<th>" not in rows[0]:
        return m.group(0)
    head = rows[0].replace("<th>", '<th scope="col">')
    body = "\n  ".join(rows[1:])
    return f"<table>\n  <thead>{head}</thead>\n  <tbody>\n  {body}\n  </tbody>\n</table>"


def render(src: str) -> str:
    blocks = []

    def stash_fence(m):
        lang, label, code = m.group(1) or "plaintext", m.group(2), m.group(3)
        label_attr = f' data-label="{html.escape(label)}"' if label else ""
        blocks.append(f'<pre{label_attr}><code class="language-{lang}">{html.escape(code.rstrip())}</code></pre>')
        return f"\x00{len(blocks) - 1}\x00"

    src = FENCE.sub(stash_fence, src)

    def quiz(m):
        answer, content = m.group(1), m.group(2).strip().splitlines()
        question, opts, explain = [], [], []
        for line in content:
            om = re.match(r"^([a-e])\)\s+(.*)$", line)
            if om:
                opts.append((om.group(1), om.group(2)))
            elif line.startswith(">"):
                explain.append(line[1:].strip())
            elif not opts:
                question.append(line)
        out = [f'<div class="quiz" data-answer="{answer}">', f'<p class="q">{" ".join(question)}</p>', '<div class="opts">']
        out += [f'<button class="opt" type="button" data-opt="{k}">{k.upper()}. {v}</button>' for k, v in opts]
        out += ["</div>", f'<p class="explain">{" ".join(explain)}</p>', "</div>"]
        return "\n".join(out)

    src = QUIZ.sub(quiz, src)
    src = INLINE.sub(lambda m: f"<code>{html.escape(m.group(1))}</code>", src)
    src = TABLE.sub(normalize_table, src)
    src = re.sub(r"\x00(\d+)\x00", lambda m: blocks[int(m.group(1))], src)
    return src


def main():
    OUT.mkdir(exist_ok=True)
    index = []
    for path in sorted(SRC.glob("*.html")):
        num = int(path.name.split("-", 1)[0])
        raw = path.read_text(encoding="utf-8")
        title_match = re.search(r"<h1>(.*?)</h1>", raw, re.S)
        title = text_of(title_match.group(1)) if title_match else path.stem
        body = add_heading_ids(render(raw).strip())
        lead = re.search(r'<p class="lead">(.*?)</p>', body, re.S)
        description = text_of(lead.group(1)) if lead else title
        page = PAGE.format(title=html.escape(title), num=num, body=body, csp=CSP, reviewed=REVIEWED,
                           description=html.escape(description, quote=True))
        (OUT / path.name).write_text(page, encoding="utf-8")
        for anchor, heading, text in search_sections(body):
            index.append({"l": num, "s": path.stem, "t": title, "a": anchor, "h": heading, "x": text})
        print(f"built lessons/{path.name}")
    js = "/* Generated by build.py. Do not edit. */\nwindow.EF_SEARCH_INDEX = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "assets" / "js" / "search-index.js").write_text(js, encoding="utf-8")
    print(f"built assets/js/search-index.js ({len(index)} sections, {len(js) // 1024} KB)")


if __name__ == "__main__":
    main()
