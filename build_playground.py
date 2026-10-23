#!/usr/bin/env python3
"""Build the EF Core Playground (src/playground) into playground/ for GitHub Pages.

Requires the .NET 10 SDK with the wasm-tools workload:
    dotnet workload install wasm-tools

Run:  python3 build_playground.py

GitHub Pages can't negotiate Brotli, so the site keeps only the precompressed .br copies of the
runtime files; js/start.js fetches and decompresses them in the browser. JavaScript and JSON files
stay uncompressed because they are loaded directly.
"""
import base64
import gzip
import hashlib
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent
PROJECT = ROOT / "src" / "playground" / "EfPlayground.csproj"
OUT = ROOT / "playground"

# Reference assemblies user code never needs (Blazor host, configuration, VB, ...)
SKIP_REFS = ("Microsoft.AspNetCore.", "Microsoft.JSInterop", "Microsoft.VisualBasic", "Microsoft.Extensions.Configuration",
             "Microsoft.Extensions.FileProviders", "Microsoft.Extensions.FileSystemGlobbing", "Microsoft.Extensions.Validation",
             "Microsoft.Extensions.DependencyModel", "Microsoft.Win32.")


def main():
    dotnet = shutil.which("dotnet") or str(pathlib.Path.home() / ".dotnet" / "dotnet")
    with tempfile.TemporaryDirectory() as tmp:
        cmd = [dotnet, "publish", str(PROJECT), "-c", "Release", "-o", tmp, "--nologo"]
        print("$", " ".join(cmd))
        subprocess.run(cmd, check=True, env={**os.environ, "DOTNET_CLI_TELEMETRY_OPTOUT": "1"})
        site = pathlib.Path(tmp) / "wwwroot"
        if OUT.exists():
            shutil.rmtree(OUT)
        shutil.copytree(site, OUT)

    framework = OUT / "_framework"
    for f in list(framework.iterdir()):
        if f.suffix == ".gz":
            f.unlink()
        elif f.suffix == ".br" and pathlib.Path(f.stem).suffix in (".js", ".json"):
            f.unlink()                                   # loaded uncompressed
    for f in list(framework.iterdir()):
        if f.suffix not in (".br", ".js", ".json") and (framework / (f.name + ".br")).exists():
            f.unlink()                                   # served from the .br copy
    for f in list(OUT.rglob("*.gz")) + list(OUT.rglob("*.br")):
        if framework not in f.parents and f.parent.name != "refs":
            f.unlink()                                   # static assets are small; keep them plain

    # .NET writes an inline import map (fingerprinted file names) into index.html. Allow exactly
    # that script in the Content-Security-Policy by its SHA-256 hash instead of 'unsafe-inline'.
    index = OUT / "index.html"
    page = index.read_text(encoding="utf-8")
    m = re.search(r'<script type="importmap">(.*?)</script>', page, re.S)
    if m:
        digest = base64.b64encode(hashlib.sha256(m.group(1).encode("utf-8")).digest()).decode()
        page = page.replace("script-src 'self' 'wasm-unsafe-eval'", f"script-src 'self' 'wasm-unsafe-eval' 'sha256-{digest}'", 1)
        index.write_text(page, encoding="utf-8")

    refs = OUT / "refs"
    for f in list(refs.iterdir()):
        if f.name.startswith(SKIP_REFS):
            f.unlink()
        else:                                            # CodeRunner fetches refs/<name>.dll.gz
            with open(f, "rb") as src, gzip.GzipFile(str(f) + ".gz", "wb", compresslevel=9, mtime=0) as dst:
                shutil.copyfileobj(src, dst)
            f.unlink()

    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    fw = sum(f.stat().st_size for f in framework.iterdir())
    rf = sum(f.stat().st_size for f in refs.iterdir())
    print(f"built playground/ : {total / 1e6:.1f} MB total ({fw / 1e6:.1f} MB runtime, {rf / 1e6:.1f} MB compiler references)")


if __name__ == "__main__":
    sys.exit(main())
