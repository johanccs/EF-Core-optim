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
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "lessons"
OUT = ROOT / "lessons"

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · EF Core Optimization Course</title>
<meta name="description" content="{title}: a lesson from the EF Core Optimization Course.">
<link rel="stylesheet" href="../assets/css/course.css">
</head>
<body data-lesson="{num}" data-root="../">
<div class="layout">
<nav id="sidebar" aria-label="Lessons"></nav>
<main class="content">
<article>
{body}
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

FENCE = re.compile(r"^```(\w+)?(?:[ \t]+label=\"([^\"]*)\")?[ \t]*\n(.*?)^```[ \t]*$", re.S | re.M)
QUIZ = re.compile(r"^:::quiz[ \t]+([a-e])[ \t]*\n(.*?)^:::[ \t]*$", re.S | re.M)
INLINE = re.compile(r"`([^`\n]+)`")


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
    src = re.sub(r"\x00(\d+)\x00", lambda m: blocks[int(m.group(1))], src)
    return src


def main():
    OUT.mkdir(exist_ok=True)
    for path in sorted(SRC.glob("*.html")):
        num = int(path.name.split("-", 1)[0])
        raw = path.read_text(encoding="utf-8")
        title_match = re.search(r"<h1>(.*?)</h1>", raw, re.S)
        title = re.sub(r"<[^>]+>", "", title_match.group(1)).strip() if title_match else path.stem
        page = PAGE.format(title=html.escape(title), num=num, body=render(raw).strip())
        (OUT / path.name).write_text(page, encoding="utf-8")
        print(f"built lessons/{path.name}")


if __name__ == "__main__":
    main()
