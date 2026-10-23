// Starts Blazor. Static hosts such as GitHub Pages can't negotiate Brotli for us, so we fetch the
// precompressed .br files and decompress them in the browser (approach documented by Microsoft for
// hosting Blazor WebAssembly on GitHub Pages). On a local dev server the uncompressed files are used.
import { BrotliDecode } from "./brotli-decode.min.js";

const useBrotli = !["localhost"].includes(location.hostname) && !new URLSearchParams(location.search).has("nobrotli");

// Standalone Blazor WebAssembly takes loadBootResource at the top level
// (the nested `webAssembly: {...}` form is only for Blazor Web Apps / blazor.web.js).
Blazor.start({
    loadBootResource(type, name, defaultUri) {
        if (!useBrotli || type === "dotnetjs" || type === "configuration" || type === "manifest") return undefined;
        return (async () => {
            const response = await fetch(defaultUri + ".br", { cache: "no-cache" });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText} loading ${name}`);
            const decompressed = BrotliDecode(new Int8Array(await response.arrayBuffer()));
            const contentType = type === "dotnetwasm" ? "application/wasm" : "application/octet-stream";
            return new Response(decompressed, { headers: { "content-type": contentType } });
        })();
    },
});
