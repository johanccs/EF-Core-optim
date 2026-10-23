// Small enhancements for the code editor <textarea>: Tab indents, Ctrl/Cmd+Enter runs,
// Esc then Tab leaves the editor (no keyboard trap), and code is saved per example in localStorage.
let releaseTab = false;

export function attach(textarea, dotnet) {
    textarea.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            dotnet.invokeMethodAsync("RunFromKeyboard", textarea.value);
            return;
        }
        if (e.key === "Escape") { releaseTab = true; return; }
        if (e.key === "Tab" && !releaseTab && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            const { selectionStart: s, selectionEnd: end, value } = textarea;
            if (e.shiftKey) {
                const lineStart = value.lastIndexOf("\n", s - 1) + 1;
                if (value.startsWith("    ", lineStart)) {
                    textarea.value = value.slice(0, lineStart) + value.slice(lineStart + 4);
                    textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, s - 4);
                }
            } else {
                textarea.value = value.slice(0, s) + "    " + value.slice(end);
                textarea.selectionStart = textarea.selectionEnd = s + 4;
            }
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }
        releaseTab = false;
    });
    textarea.addEventListener("blur", () => { releaseTab = false; });
}

export function goToLine(textarea, line) {
    const lines = textarea.value.split("\n");
    let pos = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) pos += lines[i].length + 1;
    textarea.focus();
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos + (lines[line - 1] || "").length;
}

export function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
export function save(key, value) { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage unavailable */ } }

export function queryParam(name) { return new URLSearchParams(location.search).get(name); }
export function focusById(id) { document.getElementById(id)?.focus(); }
